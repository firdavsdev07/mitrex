import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { BlueskyService } from '../bluesky/bluesky.service';
import { InstagramService } from '../instagram/instagram.service';
import { RedditService } from '../reddit/reddit.service';
import { PostsService } from '../posts/posts.service';
import { QueueService } from '../queue/queue.service';
import { Platform } from '@metrix/prisma-client';
import { getErrorMessage } from '../common/utils/error.util';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtubeService: YoutubeService,
    private readonly telegramService: TelegramService,
    private readonly discordService: DiscordService,
    private readonly blueskyService: BlueskyService,
    private readonly instagramService: InstagramService,
    private readonly redditService: RedditService,
    private readonly postsService: PostsService,
    @Optional() private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncAll() {
    this.logger.log('Sync started...');

    const connections = await this.prisma.connection.findMany({
      where: { isActive: true },
      select: { id: true, platform: true },
    });

    if (this.queue) {
      // Queue available → add each connection as a separate job. Navbatga
      // qo'yish (Redis) vaqtincha ishlamay qolsa ham (masalan qisqa tarmoq
      // uzilishi), shu ulanishni to'g'ridan-to'g'ri sinxron sync qilamiz —
      // aks holda navbatga qo'yish bitta ulanishda xato bersa, undan
      // keyingi BARCHA ulanishlar shu 6 soatlik siklda butunlay o'tkazib
      // yuborilardi (davom etuvchi for-loop navbatdagi xatoda to'xtardi).
      let queued = 0;
      let fallback = 0;
      for (const conn of connections) {
        try {
          await this.queue.addConnectionSync(conn.id, conn.platform);
          queued++;
        } catch (err: unknown) {
          this.logger.warn(
            `Navbatga qo'yib bo'lmadi id=${conn.id}, to'g'ridan-to'g'ri sync qilinmoqda: ${getErrorMessage(err)}`,
          );
          fallback++;
          try {
            await this.syncOne(conn.id, conn.platform);
          } catch (syncErr: unknown) {
            this.logger.error(
              `Sync error id=${conn.id}: ${getErrorMessage(syncErr)}`,
            );
          }
        }
      }
      this.logger.log(
        `Sync: ${queued} jobs queued, ${fallback} synced directly (fallback)`,
      );
    } else {
      // Fallback: direct sync
      for (const conn of connections) {
        try {
          await this.syncOne(conn.id, conn.platform);
        } catch (err: unknown) {
          this.logger.error(
            `Sync error id=${conn.id}: ${getErrorMessage(err)}`,
          );
        }
      }
      this.logger.log(
        `Sync completed. ${connections.length} connections updated.`,
      );
    }
  }

  async syncOne(connectionId: string, platform: Platform) {
    try {
      // Kanal statistikasi
      switch (platform) {
        case Platform.YOUTUBE:
          await this.youtubeService.fetchAndSaveStats(connectionId);
          await this.postsService.syncYoutubePosts(connectionId);
          break;
        case Platform.TELEGRAM:
          await this.telegramService.fetchAndSaveStats(connectionId);
          await this.postsService.syncTelegramPosts(connectionId);
          break;
        case Platform.DISCORD:
          await this.discordService.fetchAndSaveStats(connectionId);
          break;
        case Platform.BLUESKY:
          await this.blueskyService.fetchAndSaveStats(connectionId);
          await this.postsService.syncBlueskyPosts(connectionId);
          break;
        case Platform.INSTAGRAM:
          // Uchalasi mustaqil Meta API chaqiruvlari (kanal statistikasi,
          // postlar, storylar) — bir-birining natijasiga bog'liq emas,
          // shuning uchun parallel bajariladi.
          await Promise.all([
            this.instagramService.fetchAndSaveStats(connectionId),
            this.postsService.syncInstagramPosts(connectionId),
            this.postsService.syncInstagramStories(connectionId),
          ]);
          break;
        case Platform.FACEBOOK:
        case Platform.THREADS:
          await this.instagramService.fetchAndSaveStats(connectionId);
          break;
        case Platform.REDDIT:
          await this.redditService.fetchAndSaveStats(connectionId);
          break;
      }
      // Muvaffaqiyatli sync — oldingi xato holatini tozalaymiz, shu bilan
      // UI "bu ulanish buzilgan" belgisini olib tashlaydi.
      await this.prisma.connection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });
    } catch (err: unknown) {
      // Xatoni ham loglaymiz (yuqoridagi chaqiruvchilar allaqachon log
      // qiladi), ham DB'ga yozamiz — shu orqali foydalanuvchi ulanish
      // buzilganini faqat loglarga qaramasdan UI'dan ko'ra oladi.
      await this.prisma.connection
        .update({
          where: { id: connectionId },
          data: {
            lastSyncAt: new Date(),
            lastSyncError: getErrorMessage(err).slice(0, 500),
          },
        })
        .catch(() => {});
      throw err;
    }
  }

  // Haftalik cron: 6 monthsdan oshgan o'chirilgan userlarni tozalash
  @Cron(CronExpression.EVERY_WEEK)
  async purgeDeletedUsers() {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.user.deleteMany({
      where: { deletedAt: { lte: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(
        `🗑️ ${result.count} expired accounts permanently deleted`,
      );
    }
  }

  // Foydalanuvchi "Yangilash" tugmasini bosganda chaqiriladi — shu sababli
  // navbatga qo'yib darhol qaytish YARAMAYDI: navbatdagi job hali
  // boshlanmagan (addConnectionSync 1s delay bilan) yoki tugamagan bo'lsa
  // ham, frontend {queued:true} javobini olib ma'lumotni darhol qayta
  // yuklardi — foydalanuvchi eski (yangilanmagan) statistikani ko'rardi.
  // Shu uchun bu yerda navbatdan qat'i nazar har doim natija tayyor
  // bo'lguncha kutamiz.
  async syncUser(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { userId, isActive: true },
      select: { id: true, platform: true },
    });

    // Har bir ulanish mustaqil platforma API'siga so'rov yuboradi — ketma-ket
    // emas, parallel bajarilsa umumiy kutish vaqti "eng sekin ulanish"gacha
    // qisqaradi (avval N ta ulanishning yig'indisi edi).
    const outcomes = await Promise.allSettled(
      connections.map((conn) => this.syncOne(conn.id, conn.platform)),
    );
    const results = outcomes.map((outcome, i) => {
      const conn = connections[i];
      if (outcome.status === 'rejected') {
        this.logger.warn(
          `Sync xatosi id=${conn.id}: ${getErrorMessage(outcome.reason)}`,
        );
        return `${conn.platform}: ❌`;
      }
      return `${conn.platform}: ✅`;
    });
    return { synced: results };
  }
}
