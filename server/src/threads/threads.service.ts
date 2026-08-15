import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { signOAuthState } from '../common/utils/oauth-state.util';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

// Threads Instagram bilan bir xil akkauntga tegishli bo'lsa-da, API'si
// ALOHIDA hostda (graph.threads.net) va Meta Graph tokeni bu yerda
// ishlamaydi — threads_* scope'lari bilan threads.net orqali olingan o'z
// tokeni kerak. Shu sabab bu modul Instagram'dan mustaqil.
export const THREADS_API_VERSION = 'v1.0';
export const THREADS_BASE = `https://graph.threads.net/${THREADS_API_VERSION}`;
const THREADS_OAUTH_BASE = 'https://graph.threads.net';

const REQUIRED_SCOPES = ['threads_basic', 'threads_manage_insights'].join(',');

// Uzoq muddatli token 60 kun yashaydi. Muddati tugashiga shundan kam vaqt
// qolganda sync paytida jimgina yangilanadi — foydalanuvchi qaytadan ulashga
// majbur bo'lmasligi uchun.
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
// Refresh faqat kamida 24 soat "yashagan" tokenlarda ishlaydi (Meta talabi).
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
const LONG_LIVED_TTL_SEC = 60 * 24 * 60 * 60;

// ─── External API response shapes (faqat ishlatilgan maydonlar) ────────────

interface ThreadsTokenResponse {
  access_token: string;
  user_id?: string | number;
  expires_in?: number;
}
interface ThreadsProfileResponse {
  id?: string;
  username?: string;
  threads_biography?: string;
  threads_profile_picture_url?: string;
}
interface ThreadsInsightsResponse {
  data?: Array<{
    name: string;
    period?: string;
    values?: Array<{ value: number }>;
    total_value?: { value: number };
  }>;
}

@Injectable()
export class ThreadsService {
  private readonly logger = new Logger(ThreadsService.name);
  private readonly appId = process.env.THREADS_APP_ID;
  private readonly appSecret = process.env.THREADS_APP_SECRET;
  private readonly redirectUri =
    process.env.THREADS_REDIRECT_URI ||
    'http://localhost:5000/threads/callback';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    if (!this.appId || !this.appSecret) {
      throw new BadRequestException(
        'Threads integratsiyasi sozlanmagan (THREADS_APP_ID / THREADS_APP_SECRET)',
      );
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: REQUIRED_SCOPES,
      response_type: 'code',
      state: signOAuthState(userId),
    });

    return {
      // Ruxsat ekrani threads.net'da (graph.threads.net'da EMAS)
      url: `https://threads.net/oauth/authorize?${params}`,
      requiredScopes: REQUIRED_SCOPES.split(','),
    };
  }

  async handleCallback(code: string, userId: string) {
    // 1-qadam: code → qisqa muddatli token (bu chaqiruv POST/form-urlencoded)
    const shortRes = await axios
      .post<ThreadsTokenResponse>(
        `${THREADS_OAUTH_BASE}/oauth/access_token`,
        new URLSearchParams({
          client_id: this.appId!,
          client_secret: this.appSecret!,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code,
        }),
      )
      .catch((err: unknown) => {
        throw new BadRequestException(
          `Threads OAuth xatosi: ${getErrorMessage(err)}`,
        );
      });

    const shortToken = shortRes.data.access_token;

    // 2-qadam: qisqa → uzoq muddatli token (60 kun)
    const longRes = await axios.get<ThreadsTokenResponse>(
      `${THREADS_OAUTH_BASE}/access_token`,
      {
        params: {
          grant_type: 'th_exchange_token',
          client_secret: this.appSecret,
          access_token: shortToken,
        },
      },
    );
    const accessToken = longRes.data.access_token;
    const expiresAt = new Date(
      Date.now() + (longRes.data.expires_in || LONG_LIVED_TTL_SEC) * 1000,
    );

    // 3-qadam: profil (user_id token javobida kelmasligi ham mumkin)
    const profileRes = await axios.get<ThreadsProfileResponse>(
      `${THREADS_BASE}/me`,
      {
        params: {
          fields: 'id,username,threads_biography,threads_profile_picture_url',
          access_token: accessToken,
        },
      },
    );

    const threadsUserId =
      profileRes.data.id ??
      (shortRes.data.user_id != null ? String(shortRes.data.user_id) : null);
    if (!threadsUserId) {
      throw new BadRequestException('Threads profili aniqlanmadi');
    }

    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.THREADS,
          platformUserId: threadsUserId,
        },
      },
      create: {
        userId,
        platform: Platform.THREADS,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        platformUserId: threadsUserId,
        platformUsername: profileRes.data.username ?? threadsUserId,
      },
      update: {
        accessToken: encrypt(accessToken),
        tokenExpiresAt: expiresAt,
        platformUsername: profileRes.data.username ?? threadsUserId,
        isActive: true,
        lastSyncError: null,
      },
    });

    return {
      connected: true,
      username: profileRes.data.username ?? threadsUserId,
      connectionId: conn.id,
    };
  }

  // Muddati tugay deb qolgan uzoq muddatli tokenni yangilaydi va amaldagi
  // tokenni qaytaradi. Yangilash imkonsiz bo'lsa (masalan token 24 soatdan
  // yosh) eski token bilan davom etamiz — u hali amal qiladi.
  async ensureFreshToken(conn: {
    id: string;
    accessToken: string;
    tokenExpiresAt: Date | null;
    createdAt?: Date;
  }): Promise<string> {
    const expiresAt = conn.tokenExpiresAt?.getTime();
    if (!expiresAt || expiresAt - Date.now() > REFRESH_THRESHOLD_MS) {
      return conn.accessToken;
    }

    const issuedAt = expiresAt - LONG_LIVED_TTL_SEC * 1000;
    if (Date.now() - issuedAt < MIN_TOKEN_AGE_MS) {
      return conn.accessToken;
    }

    try {
      const res = await axios.get<ThreadsTokenResponse>(
        `${THREADS_OAUTH_BASE}/refresh_access_token`,
        {
          params: {
            grant_type: 'th_refresh_token',
            access_token: conn.accessToken,
          },
        },
      );
      const refreshed = res.data.access_token;
      await this.prisma.connection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(refreshed),
          tokenExpiresAt: new Date(
            Date.now() + (res.data.expires_in || LONG_LIVED_TTL_SEC) * 1000,
          ),
        },
      });
      this.logger.log(`Threads tokeni yangilandi (conn: ${conn.id})`);
      return refreshed;
    } catch (err: unknown) {
      this.logger.warn(
        `Threads token yangilanmadi (conn: ${conn.id}): ${getErrorMessage(err)}`,
      );
      return conn.accessToken;
    }
  }

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken || !conn?.platformUserId) return;

    const accessToken = await this.ensureFreshToken({
      id: conn.id,
      accessToken: decrypt(conn.accessToken),
      tokenExpiresAt: conn.tokenExpiresAt,
    });

    try {
      // followers_count "lifetime" metrikasi — since/until bilan birga
      // so'ralsa Threads API xato qaytaradi, shuning uchun alohida so'rov.
      const followersRes = await withRetry(() =>
        axios.get<ThreadsInsightsResponse>(
          `${THREADS_BASE}/${conn.platformUserId}/threads_insights`,
          {
            params: { metric: 'followers_count', access_token: accessToken },
          },
        ),
      );

      // Kunlik faollik metrikalari. Ruxsat yoki ma'lumot bo'lmasa butun
      // sync yiqilmasligi kerak — followers baribir saqlanadi.
      const since = Math.floor(todayUtcDate().getTime() / 1000);
      const activityRes = await axios
        .get<ThreadsInsightsResponse>(
          `${THREADS_BASE}/${conn.platformUserId}/threads_insights`,
          {
            params: {
              metric: 'views,likes,replies,reposts,quotes',
              since,
              until: Math.floor(Date.now() / 1000),
              access_token: accessToken,
            },
          },
        )
        .catch(() => null);

      const followers = readInsight(followersRes.data, 'followers_count');
      const views = readInsight(activityRes?.data, 'views');
      const likes = readInsight(activityRes?.data, 'likes');
      const replies = readInsight(activityRes?.data, 'replies');

      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: todayUtcDate() } },
        create: {
          connectionId,
          date: todayUtcDate(),
          followers,
          views,
          likes,
          comments: replies,
          raw: {
            followers: followersRes.data,
            activity: activityRes?.data ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
        update: {
          followers,
          views,
          likes,
          comments: replies,
          raw: {
            followers: followersRes.data,
            activity: activityRes?.data ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Threads stat xatosi connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      // sync.service.ts#syncOne buni Connection.lastSyncError'ga yozadi.
      throw err;
    }
  }
}

// Threads insight'lari metrikaga qarab ikki xil shaklda keladi: "lifetime"
// (followers_count) `total_value` ichida bitta son, kunlik metrikalar esa
// `values[]` qatorida vaqt qatori sifatida. Ikkalasini ham bitta songa
// keltiradi; metrika topilmasa null (0 emas — "ma'lumot yo'q" bilan
// "haqiqatan nol"ni ajratish uchun).
export function readInsight(
  body: ThreadsInsightsResponse | undefined | null,
  metric: string,
): number | null {
  const entry = body?.data?.find((d) => d.name === metric);
  if (!entry) return null;
  if (entry.total_value?.value != null) return entry.total_value.value;
  if (!entry.values?.length) return null;
  return entry.values.reduce((sum, v) => sum + (v.value ?? 0), 0);
}
