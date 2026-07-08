import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private get apiBase() { return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`; }

  constructor(private readonly prisma: PrismaService) {}

  // ─── Kanal ulash (handle asosida) ─────────────────────────────────────────

  async connectChannel(userId: string, channelHandle: string) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new BadRequestException('TELEGRAM_BOT_TOKEN sozlanmagan');
    }

    // @ ni tozalash
    const handle = channelHandle.trim().replace(/^@/, '');
    const chatId = `@${handle}`;

    // Kanal ma'lumotini olish
    let chat: any;
    try {
      const res = await axios.get(`${this.apiBase}/getChat`, {
        params: { chat_id: chatId },
      });
      chat = res.data.result;
    } catch (err: any) {
      const errMsg: string = err?.response?.data?.description ?? err.message ?? '';
      if (errMsg.includes('chat not found') || errMsg.includes('Bad Request')) {
        throw new BadRequestException(
          `Kanal topilmadi: @${handle}. Kanal mavjud va botni admin sifatida qo'shganingizni tekshiring.`
        );
      }
      throw new BadRequestException(`Telegram xatosi: ${errMsg}`);
    }

    if (!chat || (chat.type !== 'channel' && chat.type !== 'supergroup' && chat.type !== 'group')) {
      throw new BadRequestException('Bu Telegram kanal yoki guruh emas. @kanalUsername kiriting.');
    }

    // Member count
    let memberCount = 0;
    try {
      const countRes = await axios.get(`${this.apiBase}/getChatMemberCount`, {
        params: { chat_id: chatId },
      });
      memberCount = countRes.data.result ?? 0;
    } catch {
      // Bot admin emas — member count ko'rinmaydi
      throw new BadRequestException(
        `Bot kanalda admin emas. Avval @${process.env.TELEGRAM_BOT_USERNAME ?? 'MetrixBot'} ni kanalga admin sifatida qo'shing, keyin qayta ulanib ko'ring.`
      );
    }

    // Connection saqlash
    const conn = await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.TELEGRAM } },
      create: {
        userId,
        platform: Platform.TELEGRAM,
        platformUserId: String(chat.id),
        platformUsername: chat.username ?? handle,
        isActive: true,
      },
      update: {
        platformUserId: String(chat.id),
        platformUsername: chat.username ?? handle,
        isActive: true,
      },
    });

    // Darhol stats saqlash
    await this.saveStats(conn.id, String(chat.id), memberCount, chat);

    return {
      connected: true,
      channel: chat.title,
      username: chat.username ?? handle,
      members: memberCount,
      type: chat.type,
    };
  }

  // ─── Sync ──────────────────────────────────────────────────────────────────

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.platformUserId || !process.env.TELEGRAM_BOT_TOKEN) return;

    try {
      const chatId = conn.platformUserId;
      const [chatRes, countRes] = await Promise.allSettled([
        axios.get(`${this.apiBase}/getChat`, { params: { chat_id: chatId } }),
        axios.get(`${this.apiBase}/getChatMemberCount`, { params: { chat_id: chatId } }),
      ]);

      const chat = chatRes.status === 'fulfilled' ? chatRes.value.data.result : null;
      const memberCount = countRes.status === 'fulfilled' ? (countRes.value.data.result ?? 0) : null;

      if (memberCount !== null) {
        await this.saveStats(connectionId, chatId, memberCount, chat);
      }
    } catch (err: any) {
      this.logger.error(`Telegram stat xatosi connectionId=${connectionId}: ${err.message}`);
    }
  }

  // ─── Bot info (bot ishlayotganini tekshirish) ──────────────────────────────

  async getBotInfo() {
    if (!process.env.TELEGRAM_BOT_TOKEN) return null;
    try {
      const res = await axios.get(`${this.apiBase}/getMe`);
      return res.data.result;
    } catch { return null; }
  }

  // ─── Webhook (eski, saqlab turish) ────────────────────────────────────────

  async handleWebhook(body: any) {
    // Webhook orqali kelgan update (ixtiyoriy)
    this.logger.debug(`Webhook received: ${JSON.stringify(body)?.slice(0, 100)}`);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async saveStats(connectionId: string, _chatId: string, memberCount: number, raw: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: { connectionId, date: today, followers: memberCount, raw },
      update: { followers: memberCount, raw },
    });
  }
}
