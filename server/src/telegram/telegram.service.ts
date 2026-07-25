import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}
interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
}

function getWithRetry<T>(
  url: string,
  params: Record<string, string | number>,
  attempts = 4,
) {
  return withRetry(
    () => axios.get<TelegramApiResponse<T>>(url, { params, timeout: 8000 }),
    attempts,
  );
}

// Telegram javobidan (yoki tarmoq xatosidan) foydalanuvchiga ko'rsatsa
// bo'ladigan matn chiqaradi. err.message ba'zi tarmoq xatolarida bo'sh
// qator bo'lishi mumkin (masalan ETIMEDOUT) — shu holatda err.code'dan
// foydalaniladi.
function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { description?: string } | undefined;
    if (data?.description) return data.description;
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
      return "server bilan aloqa vaqtincha uzildi, birozdan so'ng qayta urinib ko'ring";
    }
    return err.message || err.code || "noma'lum xato";
  }
  if (err instanceof Error) return err.message;
  return "noma'lum xato";
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private get apiBase() {
    return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  }

  constructor(private readonly prisma: PrismaService) {}

  // ─── Kanal ulash (handle asosida) ─────────────────────────────────────────

  async connectChannel(userId: string, channelHandle: string) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new BadRequestException('TELEGRAM_BOT_TOKEN sozlanmagan');
    }

    // @handle, t.me/handle yoki https://t.me/handle — barchasidan handle ajratib olinadi
    const raw = channelHandle.trim();
    const urlMatch = raw.match(
      /^(?:https?:\/\/)?t\.me\/(?:@)?([a-zA-Z0-9_]+)\/?$/i,
    );
    const handle = urlMatch ? urlMatch[1] : raw.replace(/^@/, '');

    if (!handle || /[^a-zA-Z0-9_]/.test(handle)) {
      throw new BadRequestException(
        `Noto'g'ri format: "${raw}". Kanalni @handle (masalan @mychannel) ko'rinishida kiriting — taklif havolasi (t.me/+...) qo'llab-quvvatlanmaydi.`,
      );
    }

    const chatId = `@${handle}`;

    // Kanal ma'lumotini olish
    let chat: TelegramChat | undefined;
    try {
      const res = await getWithRetry<TelegramChat>(`${this.apiBase}/getChat`, {
        chat_id: chatId,
      });
      chat = res.data.result;
    } catch (err: unknown) {
      const errMsg = describeError(err);
      if (errMsg.includes('chat not found') || errMsg.includes('Bad Request')) {
        throw new BadRequestException(
          `Kanal topilmadi: @${handle}. Kanal mavjud va botni admin sifatida qo'shganingizni tekshiring.`,
        );
      }
      throw new BadRequestException(`Telegram xatosi: ${errMsg}`);
    }

    if (
      !chat ||
      (chat.type !== 'channel' &&
        chat.type !== 'supergroup' &&
        chat.type !== 'group')
    ) {
      throw new BadRequestException(
        'Bu Telegram kanal yoki guruh emas. @kanalUsername kiriting.',
      );
    }

    // Member count — ochiq kanallarda bot admin bo'lmasa ham ishlaydi, lekin
    // yopiq guruh/kanallarda yoki bot umuman a'zo bo'lmagan holatlarda
    // Telegram xato qaytaradi.
    let memberCount = 0;
    try {
      const countRes = await getWithRetry<number>(
        `${this.apiBase}/getChatMemberCount`,
        {
          chat_id: chatId,
        },
      );
      memberCount = countRes.data.result ?? 0;
    } catch (err: unknown) {
      const errMsg = describeError(err);
      throw new BadRequestException(
        `A'zolar sonini olib bo'lmadi (${errMsg}). Bot kanalga admin sifatida qo'shilganini tekshiring: @${process.env.TELEGRAM_BOT_USERNAME ?? 'MetrixBot'}.`,
      );
    }

    // Connection saqlash — bitta userda bir nechta Telegram kanal bo'lishi
    // mumkin, shuning uchun (userId, platform, platformUserId) bo'yicha upsert
    // qilamiz: xuddi shu kanalni qayta ulash yangilaydi, boshqa kanal esa
    // yangi qator bo'ladi.
    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.TELEGRAM,
          platformUserId: String(chat.id),
        },
      },
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
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.platformUserId || !process.env.TELEGRAM_BOT_TOKEN) return;

    try {
      const chatId = conn.platformUserId;
      const [chatRes, countRes] = await Promise.allSettled([
        getWithRetry<TelegramChat>(`${this.apiBase}/getChat`, {
          chat_id: chatId,
        }),
        getWithRetry<number>(`${this.apiBase}/getChatMemberCount`, {
          chat_id: chatId,
        }),
      ]);

      const chat =
        chatRes.status === 'fulfilled'
          ? (chatRes.value.data.result ?? null)
          : null;
      const memberCount =
        countRes.status === 'fulfilled'
          ? (countRes.value.data.result ?? 0)
          : null;

      if (memberCount !== null) {
        await this.saveStats(connectionId, chatId, memberCount, chat);
      } else if (countRes.status === 'rejected') {
        this.logger.warn(
          `Telegram a'zolar soni olinmadi connectionId=${connectionId}: ${describeError(countRes.reason)}`,
        );
        // Boshqa platformalar kabi (Discord/Instagram/Reddit) — qayta uzatamiz,
        // shunda syncOne() bu xatoni lastSyncError sifatida saqlaydi va UI
        // ulanish "sinmagan" deb noto'g'ri ko'rsatmaydi.
        throw new Error(describeError(countRes.reason));
      }
    } catch (err: unknown) {
      this.logger.error(
        `Telegram stat xatosi connectionId=${connectionId}: ${describeError(err)}`,
      );
      throw err;
    }
  }

  // ─── Bot info (bot ishlayotganini tekshirish) ──────────────────────────────

  async getBotInfo() {
    if (!process.env.TELEGRAM_BOT_TOKEN) return null;
    try {
      const res = await axios.get<
        TelegramApiResponse<{ id: number; username?: string; is_bot: boolean }>
      >(`${this.apiBase}/getMe`);
      return res.data.result;
    } catch {
      return null;
    }
  }

  // ─── Webhook (eski, saqlab turish) ────────────────────────────────────────

  handleWebhook(body: unknown) {
    // Webhook orqali kelgan update (ixtiyoriy)
    this.logger.debug(
      `Webhook received: ${JSON.stringify(body)?.slice(0, 100)}`,
    );
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async saveStats(
    connectionId: string,
    _chatId: string,
    memberCount: number,
    raw: TelegramChat | null,
  ) {
    const today = todayUtcDate();
    const rawJson = raw
      ? (raw as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: {
        connectionId,
        date: today,
        followers: memberCount,
        raw: rawJson,
      },
      update: { followers: memberCount, raw: rawJson },
    });
  }
}
