import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiBase = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

  constructor(private readonly prisma: PrismaService) {}

  // Foydalanuvchiga bot link qaytaradi
  getConnectInfo(userId: string) {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'MetrixBot';
    // Deep link: user /start metrix_123 yuboradi
    const startParam = `metrix_${userId}`;
    return {
      url: `https://t.me/${botUsername}?start=${startParam}`,
      instructions: [
        `1. Follow the link below to open the bot`,
        `2. Press /start or send "${startParam}" `,
        `3. Add the bot as admin to your channel for channel stats`,
      ],
    };
  }

  // Webhook dan kelgan update ni ishlaydi
  async handleWebhook(body: any) {
    const message = body?.message;
    if (!message) return;

    const text: string = message.text || '';
    const chatId: number = message.chat.id;
    const chatType: string = message.chat.type;

    // /start metrix_123 — userni ulash
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const param = parts[1] || '';

      if (param.startsWith('metrix_')) {
        const userId = parseInt(param.replace('metrix_', ''));
        if (!isNaN(userId)) {
          await this.connectUser(userId, chatId, message.from);
          await this.sendMessage(chatId, '✅ Successfully connected to Metrix!\n\nAdd me as admin to your channel, then send /channel command.');
        }
      } else {
        await this.sendMessage(chatId, '👋 Welcome to Metrix Bot!\n\nClick "Connect Telegram" in your Metrix dashboard.');
      }
    }

    // /channel command
    if (text === '/channel' && chatType === 'private') {
      await this.sendMessage(chatId, 'Add the bot as admin to your channel, then send the channel ID.\nExample: @mychannel or -1001234567890');
    }

    // Bot added to channel
    if (body?.my_chat_member) {
      await this.handleChatMemberUpdate(body.my_chat_member);
    }
  }

  async fetchAndSaveStats(connectionId: number) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn || !conn.platformUserId) return;

    try {
      const chatId = conn.platformUserId;
      const res = await axios.get(`${this.apiBase}/getChat`, { params: { chat_id: chatId } });
      const chat = res.data.result;

      let memberCount = 0;
      try {
        const countRes = await axios.get(`${this.apiBase}/getChatMemberCount`, {
          params: { chat_id: chatId },
        });
        memberCount = countRes.data.result || 0;
      } catch {}

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: today } },
        create: {
          connectionId,
          date: today,
          followers: memberCount,
          raw: { chat, memberCount } as any,
        },
        update: {
          followers: memberCount,
          raw: { chat, memberCount } as any,
        },
      });
    } catch (err) {
      this.logger.error(`Telegram stat xatosi connectionId=${connectionId}: ${err.message}`);
    }
  }

  async setWebhook() {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (!webhookUrl || !this.botToken) return;
    const res = await axios.post(`${this.apiBase}/setWebhook`, { url: webhookUrl });
    this.logger.log(`Telegram webhook set: ${res.data.description}`);
  }

  private async connectUser(userId: string, chatId: number, from: any) {
    const username = from?.username || from?.first_name || String(chatId);

    await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.TELEGRAM } },
      create: {
        userId,
        platform: Platform.TELEGRAM,
        platformUserId: String(chatId),
        platformUsername: username,
      },
      update: {
        platformUserId: String(chatId),
        platformUsername: username,
        isActive: true,
      },
    });
  }

  private async handleChatMemberUpdate(update: any) {
    // Bot kanalga qo'shildi — saqlab qo'yish mumkin
    this.logger.log(`Bot chat member update: ${JSON.stringify(update?.chat)}`);
  }

  private async sendMessage(chatId: number, text: string) {
    try {
      await axios.post(`${this.apiBase}/sendMessage`, { chat_id: chatId, text });
    } catch (err) {
      this.logger.error(`sendMessage error: ${err.message}`);
    }
  }
}
