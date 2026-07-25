import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { TelegramClient, Api } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { getErrorMessage } from '../common/utils/error.util';

export interface TelegramMtprotoPost {
  id: number;
  text: string | null;
  date: Date;
  views: number | null;
  forwards: number | null;
}

// Bot API has no "get channel history" method, so per-post view counts are
// unreachable through the bot token alone. This talks MTProto directly as a
// regular Telegram user account (one shared account for the whole app, see
// scripts/telegram-mtproto-login.ts) to read public channel/group message
// history, which includes the `views` field on broadcast channel posts.
@Injectable()
export class TelegramMtprotoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramMtprotoService.name);
  private client: TelegramClient | null = null;
  private enabled = false;

  async onModuleInit() {
    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    const session = process.env.TELEGRAM_MTPROTO_SESSION;

    if (!apiId || !apiHash || !session) {
      this.logger.warn(
        "TELEGRAM_API_ID / TELEGRAM_API_HASH / TELEGRAM_MTPROTO_SESSION sozlanmagan — Telegram post-statistikasi o'tkazib yuboriladi (kanal a'zolar soni bot token orqali ishlayveradi).",
      );
      return;
    }

    try {
      this.client = new TelegramClient(
        new StringSession(session),
        apiId,
        apiHash,
        {
          connectionRetries: 3,
        },
      );
      await this.client.connect();
      this.enabled = true;
      this.logger.log("Telegram MTProto ulanish o'rnatildi.");
    } catch (err: unknown) {
      this.logger.error(
        `Telegram MTProto ulanish xatosi: ${getErrorMessage(err)}`,
      );
      this.client = null;
      this.enabled = false;
    }
  }

  async onModuleDestroy() {
    if (this.client?.connected) {
      await this.client.disconnect();
    }
  }

  // Broadcast kanal postlari uchun views bilan, guruh/supergroup uchun
  // null qaytaradi (Telegram guruh xabarlarida ko'rishlar sonini kuzatmaydi).
  async getChannelPosts(
    username: string,
    limit = 30,
  ): Promise<TelegramMtprotoPost[] | null> {
    if (!this.enabled || !this.client) return null;

    try {
      const entity = await this.client.getEntity(username);

      if (!(entity instanceof Api.Channel) || !entity.broadcast) {
        // Guruh yoki supergroup — post-darajasidagi ko'rishlar mavjud emas.
        return [];
      }

      const messages = await this.client.getMessages(entity, { limit });

      return messages
        .filter((m) => m.id && (m.message || m.media))
        .map((m) => ({
          id: m.id,
          text: m.message ? m.message.slice(0, 500) : null,
          date: new Date(m.date * 1000),
          views: typeof m.views === 'number' ? m.views : null,
          forwards: typeof m.forwards === 'number' ? m.forwards : null,
        }));
    } catch (err: unknown) {
      this.logger.error(
        `Telegram MTProto: ${username} postlarini olishda xato: ${getErrorMessage(err)}`,
      );
      return null;
    }
  }
}
