import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';
import { signOAuthState } from '../common/utils/oauth-state.util';
import { describeOAuthError } from '../common/utils/oauth-redirect.util';
import { encrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { reconstructHistoricalTotals } from '../common/utils/backfill-from-deltas.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

// ─── External API response shapes (faqat ishlatilgan maydonlar) ────────────

interface GoogleOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}
interface YoutubeChannelStatistics {
  subscriberCount?: string;
  viewCount?: string;
  videoCount?: string;
}
interface YoutubeChannelItem {
  id: string;
  snippet?: { title?: string };
  statistics?: YoutubeChannelStatistics;
}
interface YoutubeChannelsResponse {
  items?: YoutubeChannelItem[];
}
interface YoutubeAnalyticsReportsResponse {
  columnHeaders?: Array<{ name: string }>;
  rows?: Array<Array<string | number>>;
}

const YT_API = 'https://www.googleapis.com/youtube/v3';
const YT_ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2/reports';
const BACKFILL_DAYS = 30;

// video-darajasidagi obunachi statistikasi (subscribersGained) uchun kerak —
// oddiy YouTube Data API (channels/videos) buni bermaydi, faqat kanal egasi
// OAuth orqali ruxsat bergan holatda Analytics API'dan olish mumkin.
const YT_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ');

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  private get apiKey() {
    return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  }
  private get oauthRedirectUri() {
    return (
      process.env.YOUTUBE_OAUTH_REDIRECT_URI ||
      'http://localhost:5000/youtube/oauth/callback'
    );
  }

  constructor(private readonly prisma: PrismaService) {}

  // ─── Google OAuth (o'z kanalini ulash — video-darajasidagi obunachi statistikasi uchun) ──

  getAuthUrl(userId: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      throw new BadRequestException('GOOGLE_CLIENT_ID sozlanmagan');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.oauthRedirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: YT_OAUTH_SCOPES,
      state: signOAuthState(userId),
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      note: 'Faqat OZINGIZ egalik qiladigan kanal uchun ishlaydi — video-darajasidagi obunachi statistikasini yoqadi',
    };
  }

  async handleOAuthCallback(code: string, userId: string) {
    const tokenRes = await axios
      .post<GoogleOAuthTokenResponse>('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: this.oauthRedirectUri,
        grant_type: 'authorization_code',
      })
      .catch((err: unknown) => {
        throw new BadRequestException(
          `Google OAuth xatosi: ${describeOAuthError(err)}`,
        );
      });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const chRes = await axios.get<YoutubeChannelsResponse>(
      `${YT_API}/channels`,
      {
        params: { part: 'snippet', mine: true },
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const channel = chRes.data.items?.[0];
    if (!channel) {
      throw new BadRequestException(
        "Google akkauntingizga bog'liq YouTube kanali topilmadi",
      );
    }

    // Bir nechta YouTube kanal ulash imkoniyati uchun channel.id bilan birga
    // upsert qilinadi.
    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.YOUTUBE,
          platformUserId: channel.id,
        },
      },
      create: {
        userId,
        platform: Platform.YOUTUBE,
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        platformUserId: channel.id,
        platformUsername: channel.snippet?.title,
        isActive: true,
      },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        platformUserId: channel.id,
        platformUsername: channel.snippet?.title,
        isActive: true,
      },
    });

    await this.fetchAndSaveStats(conn.id);
    // Faqat OAuth orqali ulanganda (kanal egasining o'zi) ishlaydi — Analytics
    // API boshqa birovning kanali uchun ruxsat bermaydi. Muvaffaqiyatsiz
    // bo'lsa ham ulanishning o'zini buzmaydi — "dinamika" grafigi shunchaki
    // bir necha kun ichida odatdagidek to'planib boradi.
    await this.backfillHistory(conn.id, access_token).catch((err: unknown) => {
      this.logger.warn(
        `YouTube tarixini to'ldirib bo'lmadi connectionId=${conn.id}: ${getErrorMessage(err)}`,
      );
    });
    return { connected: true, channel: channel.snippet?.title };
  }

  // ─── Tarixni to'ldirish (faqat OAuth) ───────────────────────────────────────
  //
  // YouTube Analytics API kunlik O'ZGARISHNI beradi (subscribersGained/Lost,
  // views), yakuniy sonni emas — shuning uchun bugungi (Data API'dan olingan)
  // haqiqiy yakuniy qiymatdan orqaga qarab har bir kunning o'z delta'sini
  // ayirib chiqamiz (reconstructHistoricalTotals). Natijada ulangan zahoti
  // "A'zolar soni dinamikasi" grafigi va oylik/haftalik o'sish ko'rsatkichi
  // haqiqiy (soxta emas) so'nggi 30 kunlik ma'lumot bilan to'ladi.
  private async backfillHistory(connectionId: string, accessToken: string) {
    const today = await this.prisma.platformStat.findUnique({
      where: { connectionId_date: { connectionId, date: todayUtcDate() } },
    });
    if (!today || today.followers == null) return;

    const todayStr = todayUtcDate().toISOString().slice(0, 10);
    const startStr = new Date(Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const res = await axios.get<YoutubeAnalyticsReportsResponse>(
      YT_ANALYTICS_API,
      {
        params: {
          ids: 'channel==MINE',
          startDate: startStr,
          endDate: todayStr,
          metrics: 'views,subscribersGained,subscribersLost',
          dimensions: 'day',
          sort: 'day',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const headers: string[] = (res.data.columnHeaders ?? []).map((h) => h.name);
    const dayIdx = headers.indexOf('day');
    const viewsIdx = headers.indexOf('views');
    const gainedIdx = headers.indexOf('subscribersGained');
    const lostIdx = headers.indexOf('subscribersLost');
    const rows: Array<Array<string | number>> = res.data.rows ?? [];
    if (!rows.length || dayIdx === -1) return;

    const followerDeltas = rows.map((r) => ({
      date: String(r[dayIdx]),
      delta: Number(r[gainedIdx] ?? 0) - Number(r[lostIdx] ?? 0),
    }));
    const viewDeltas =
      viewsIdx === -1
        ? []
        : rows.map((r) => ({
            date: String(r[dayIdx]),
            delta: Number(r[viewsIdx] ?? 0),
          }));

    const followerHistory = reconstructHistoricalTotals(
      today.followers,
      todayStr,
      followerDeltas,
    );
    const viewHistory =
      today.views != null
        ? reconstructHistoricalTotals(Number(today.views), todayStr, viewDeltas)
        : [];
    const viewByDate = new Map(viewHistory.map((v) => [v.date, v.total]));

    // Bugungi qator allaqachon (haqiqiy, aniq) fetchAndSaveStats orqali
    // yozilgan — backfill faqat HALI MAVJUD BO'LMAGAN kunlarni to'ldiradi,
    // hech qanday real sinxronizatsiya natijasini ustidan yozmaydi.
    for (const { date, total: followers } of followerHistory) {
      const exists = await this.prisma.platformStat.findUnique({
        where: { connectionId_date: { connectionId, date: new Date(date) } },
        select: { id: true },
      });
      if (exists) continue;

      const views = viewByDate.get(date);
      await this.prisma.platformStat.create({
        data: {
          connectionId,
          date: new Date(date),
          followers,
          views: views != null ? BigInt(Math.round(views)) : null,
          raw: { backfilled: true },
        },
      });
    }
  }

  // refreshToken shu yerga DESHIFRLANGAN holda kelishi kutiladi (chaqiruvchi
  // conn.refreshToken'ni oldindan decrypt() qiladi).
  async refreshAccessToken(
    connectionId: string,
    refreshToken: string,
  ): Promise<string> {
    const res = await axios.post<GoogleOAuthTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
    );
    const { access_token, expires_in } = res.data;
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: {
        accessToken: encrypt(access_token),
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });
    return access_token;
  }

  // ─── Handle / URL bo'yicha ulash (OAuth kerak emas) ─────────────────────────

  async connectByHandle(userId: string, handle: string) {
    if (!this.apiKey)
      throw new BadRequestException('YOUTUBE_API_KEY sozlanmagan');

    // @handle, channel URL yoki channel ID dan tozalash
    const clean = handle
      .trim()
      .replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)?/, '')
      .replace(/^@/, '')
      .replace(/\/$/, '');

    let channel: Awaited<ReturnType<typeof this.findByHandle>>;
    try {
      // Avval forHandle bilan qidirish (@username)
      channel = await this.findByHandle(clean);
      // Topilmasa forUsername bilan
      if (!channel) channel = await this.findByUsername(clean);
      // Topilmasa channelId bilan
      if (!channel) channel = await this.findByChannelId(clean);
    } catch (err: unknown) {
      // Haqiqiy API xatosi (noto'g'ri kalit, kvota, tarmoq) — "topilmadi" bilan
      // aralashtirmaslik uchun alohida xabar (aks holda foydalanuvchi handle
      // noto'g'ri deb o'ylab, sabab hech qachon aniqlanmaydi).
      throw new BadRequestException(
        `YouTube API xatosi: ${describeOAuthError(err)}`,
      );
    }

    if (!channel) {
      throw new BadRequestException(
        `YouTube kanali topilmadi: "${handle}". Handle (@username), kanal URL yoki kanal ID kiriting.`,
      );
    }

    // Bir nechta YouTube kanal ulash imkoniyati uchun channel.id bilan upsert
    // qilinadi — xuddi shu kanal bo'lsa (masalan avval OAuth orqali ulangan
    // bo'lsa) tokenlar saqlanib qoladi, boshqa kanal bo'lsa alohida yangi
    // qator (o'z tokenlarisiz) yaratiladi, hech narsa ustidan yozilmaydi.
    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.YOUTUBE,
          platformUserId: channel.id,
        },
      },
      create: {
        userId,
        platform: Platform.YOUTUBE,
        platformUserId: channel.id,
        platformUsername: channel.title,
        isActive: true,
      },
      update: {
        platformUsername: channel.title,
        isActive: true,
      },
    });

    // Darhol stats saqlash
    await this.saveStats(conn.id, channel.id, channel.stats);

    return {
      connected: true,
      channel: channel.title,
      subscribers: channel.stats.subscriberCount,
    };
  }

  // ─── Stats yangilash (sync) ─────────────────────────────────────────────────

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.platformUserId) return;

    if (!this.apiKey) return;

    const res = await withRetry(() =>
      axios.get<YoutubeChannelsResponse>(`${YT_API}/channels`, {
        params: {
          part: 'statistics',
          id: conn.platformUserId,
          key: this.apiKey,
        },
      }),
    );
    const stats = res.data.items?.[0]?.statistics;
    if (!stats) return;

    await this.saveStats(connectionId, conn.platformUserId, {
      subscriberCount: parseInt(stats.subscriberCount || '0'),
      viewCount: parseInt(stats.viewCount || '0'),
      videoCount: parseInt(stats.videoCount || '0'),
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  // Bu uchta helper qasddan axios xatolarini yutmaydi — ular chaqiruvchiga
  // (connectByHandle) uzatiladi, u "topilmadi" bilan haqiqiy API xatosini
  // (noto'g'ri kalit, kvota, tarmoq) ajratib ko'rsatadi. Muvaffaqiyatli, lekin
  // bo'sh javob (kanal chindan ham topilmadi) — bu yerda `null` qaytadi.

  private async findByHandle(handle: string) {
    const res = await axios.get<YoutubeChannelsResponse>(`${YT_API}/channels`, {
      params: {
        part: 'snippet,statistics',
        forHandle: `@${handle}`,
        key: this.apiKey,
      },
    });
    return this.parseChannel(res.data.items?.[0]);
  }

  private async findByUsername(username: string) {
    const res = await axios.get<YoutubeChannelsResponse>(`${YT_API}/channels`, {
      params: {
        part: 'snippet,statistics',
        forUsername: username,
        key: this.apiKey,
      },
    });
    return this.parseChannel(res.data.items?.[0]);
  }

  private async findByChannelId(channelId: string) {
    if (!channelId.startsWith('UC')) return null;
    const res = await axios.get<YoutubeChannelsResponse>(`${YT_API}/channels`, {
      params: { part: 'snippet,statistics', id: channelId, key: this.apiKey },
    });
    return this.parseChannel(res.data.items?.[0]);
  }

  private parseChannel(item: YoutubeChannelItem | undefined) {
    if (!item) return null;
    const stats = item.statistics ?? {};
    return {
      id: item.id,
      title: item.snippet?.title ?? item.id,
      stats: {
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
      },
    };
  }

  private async saveStats(
    connectionId: string,
    _channelId: string,
    stats: { subscriberCount: number; viewCount: number; videoCount: number },
  ) {
    const today = todayUtcDate();

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: {
        connectionId,
        date: today,
        followers: stats.subscriberCount,
        views: stats.viewCount,
        raw: stats,
      },
      update: {
        followers: stats.subscriberCount,
        views: stats.viewCount,
        raw: stats,
      },
    });
  }
}
