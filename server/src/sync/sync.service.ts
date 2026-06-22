import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import { BlueskyService } from '../bluesky/bluesky.service';
import { InstagramService } from '../instagram/instagram.service';
import { PostsService } from '../posts/posts.service';
import { Platform } from '@metrix/prisma-client';

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
    private readonly postsService: PostsService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncAll() {
    this.logger.log('Sync started...');

    const connections = await this.prisma.connection.findMany({
      where: { isActive: true },
      select: { id: true, platform: true },
    });

    for (const conn of connections) {
      try {
        await this.syncOne(conn.id, conn.platform);
      } catch (err) {
        this.logger.error(`Sync xatosi id=${conn.id}: ${err.message}`);
      }
    }

    this.logger.log(`Sync completed. ${connections.length} connections updated.`);
  }

  async syncOne(connectionId: string, platform: Platform) {
    // Kanal statistikasi
    switch (platform) {
      case Platform.YOUTUBE:
        await this.youtubeService.fetchAndSaveStats(connectionId);
        await this.postsService.syncYoutubePosts(connectionId);
        break;
      case Platform.TELEGRAM:
        await this.telegramService.fetchAndSaveStats(connectionId);
        break;
      case Platform.DISCORD:
        await this.discordService.fetchAndSaveStats(connectionId);
        break;
      case Platform.BLUESKY:
        await this.blueskyService.fetchAndSaveStats(connectionId);
        await this.postsService.syncBlueskyPosts(connectionId);
        break;
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
        await this.instagramService.fetchAndSaveStats(connectionId);
        break;
    }
  }

  // Haftalik cron: 6 monthsdan oshgan o'chirilgan userlarni tozalash
  @Cron(CronExpression.EVERY_WEEK)
  async purgeDeletedUsers() {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.user.deleteMany({
      where: { deletedAt: { lte: cutoff } } as any,
    });
    if (result.count > 0) {
      this.logger.log(`🗑️ ${result.count} expired accounts permanently deleted`);
    }
  }

  async syncUser(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { userId, isActive: true },
      select: { id: true, platform: true },
    });

    const results: string[] = [];
    for (const conn of connections) {
      try {
        await this.syncOne(conn.id, conn.platform);
        results.push(`${conn.platform}: ✅`);
      } catch {
        results.push(`${conn.platform}: ❌`);
      }
    }
    return { synced: results };
  }
}
