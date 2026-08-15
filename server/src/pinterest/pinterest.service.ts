import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { signOAuthState } from '../common/utils/oauth-state.util';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

export const PINTEREST_BASE = 'https://api.pinterest.com/v5';

// user_accounts:read → profil va follower soni
// pins:read / boards:read → pin va board soni, analitika
const REQUIRED_SCOPES = ['user_accounts:read', 'pins:read', 'boards:read'].join(
  ',',
);

// Access token 30 kun, refresh token 1 yil yashaydi. Muddati tugashiga
// shundan kam qolganda sync paytida jimgina yangilanadi.
const REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
const ACCESS_TTL_SEC = 30 * 24 * 60 * 60;

// Pinterest analitikasi 24-48 soat kechikadi — "bugun" so'ralsa deyarli
// har doim bo'sh qaytadi. Shu sabab oxirgi bir necha kun so'raladi va
// ma'lumoti tayyor bo'lgan eng oxirgi kun olinadi.
const ANALYTICS_LOOKBACK_DAYS = 4;

// ─── External API response shapes (faqat ishlatilgan maydonlar) ────────────

interface PinterestTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}
interface PinterestAccountResponse {
  id?: string;
  username?: string;
  account_type?: string;
  business_name?: string;
  follower_count?: number;
  following_count?: number;
  pin_count?: number;
  board_count?: number;
  monthly_views?: number;
}
interface PinterestDailyMetric {
  date?: string;
  data_status?: string;
  metrics?: Record<string, number>;
}
interface PinterestAnalyticsResponse {
  // Javob metrikalarni "ALL" (barcha kontent turlari) kaliti ostida beradi.
  ALL?: {
    summary_metrics?: Record<string, number>;
    daily_metrics?: PinterestDailyMetric[];
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class PinterestService {
  private readonly logger = new Logger(PinterestService.name);
  private readonly appId = process.env.PINTEREST_APP_ID;
  private readonly appSecret = process.env.PINTEREST_APP_SECRET;
  private readonly redirectUri =
    process.env.PINTEREST_REDIRECT_URI ||
    'http://localhost:5000/pinterest/callback';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    if (!this.appId || !this.appSecret) {
      throw new BadRequestException(
        'Pinterest integratsiyasi sozlanmagan (PINTEREST_APP_ID / PINTEREST_APP_SECRET)',
      );
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: REQUIRED_SCOPES,
      state: signOAuthState(userId),
    });

    return {
      url: `https://www.pinterest.com/oauth/?${params}`,
      requiredScopes: REQUIRED_SCOPES.split(','),
    };
  }

  // Pinterest token endpointi client_id/secret'ni body'da emas, HTTP Basic
  // sarlavhasida kutadi — boshqa provayderlardagi kabi yuborilsa 401 beradi.
  private basicAuthHeader(): string {
    const raw = `${this.appId}:${this.appSecret}`;
    return `Basic ${Buffer.from(raw).toString('base64')}`;
  }

  async handleCallback(code: string, userId: string) {
    const tokenRes = await axios
      .post<PinterestTokenResponse>(
        `${PINTEREST_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
        { headers: { Authorization: this.basicAuthHeader() } },
      )
      .catch((err: unknown) => {
        throw new BadRequestException(
          `Pinterest OAuth xatosi: ${getErrorMessage(err)}`,
        );
      });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = new Date(
      Date.now() + (expires_in || ACCESS_TTL_SEC) * 1000,
    );

    const account = await this.fetchAccount(access_token);
    const accountId = account.id ?? account.username;
    if (!accountId) {
      throw new BadRequestException('Pinterest profili aniqlanmadi');
    }

    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.PINTEREST,
          platformUserId: accountId,
        },
      },
      create: {
        userId,
        platform: Platform.PINTEREST,
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiresAt: expiresAt,
        platformUserId: accountId,
        platformUsername: account.username ?? accountId,
      },
      update: {
        accessToken: encrypt(access_token),
        // Pinterest qayta ulanishda refresh token qaytarmasligi mumkin —
        // bunday holda mavjudini o'chirib yubormaymiz.
        ...(refresh_token ? { refreshToken: encrypt(refresh_token) } : {}),
        tokenExpiresAt: expiresAt,
        platformUsername: account.username ?? accountId,
        isActive: true,
        lastSyncError: null,
      },
    });

    await this.saveStats(conn.id, account, null);

    return {
      connected: true,
      username: account.username ?? accountId,
      followers: account.follower_count ?? 0,
      connectionId: conn.id,
    };
  }

  private async fetchAccount(accessToken: string) {
    const res = await withRetry(() =>
      axios.get<PinterestAccountResponse>(`${PINTEREST_BASE}/user_account`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return res.data;
  }

  // Muddati tugay deb qolgan access tokenni refresh token bilan yangilaydi.
  // Yangilab bo'lmasa eski token qaytariladi — u hali amal qilishi mumkin,
  // va sync butunlay to'xtab qolgandan ko'ra urinib ko'rgan yaxshi.
  async ensureFreshToken(conn: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
  }): Promise<string> {
    const expiresAt = conn.tokenExpiresAt?.getTime();
    if (
      !conn.refreshToken ||
      !expiresAt ||
      expiresAt - Date.now() > REFRESH_THRESHOLD_MS
    ) {
      return conn.accessToken;
    }

    try {
      const res = await axios.post<PinterestTokenResponse>(
        `${PINTEREST_BASE}/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refreshToken,
        }),
        { headers: { Authorization: this.basicAuthHeader() } },
      );

      const refreshed = res.data.access_token;
      await this.prisma.connection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(refreshed),
          ...(res.data.refresh_token
            ? { refreshToken: encrypt(res.data.refresh_token) }
            : {}),
          tokenExpiresAt: new Date(
            Date.now() + (res.data.expires_in || ACCESS_TTL_SEC) * 1000,
          ),
        },
      });
      this.logger.log(`Pinterest tokeni yangilandi (conn: ${conn.id})`);
      return refreshed;
    } catch (err: unknown) {
      this.logger.warn(
        `Pinterest token yangilanmadi (conn: ${conn.id}): ${getErrorMessage(err)}`,
      );
      return conn.accessToken;
    }
  }

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken) return;

    const accessToken = await this.ensureFreshToken({
      id: conn.id,
      accessToken: decrypt(conn.accessToken),
      refreshToken: conn.refreshToken ? decrypt(conn.refreshToken) : null,
      tokenExpiresAt: conn.tokenExpiresAt,
    });

    try {
      const account = await this.fetchAccount(accessToken);
      // Analitika ruxsati yoki ma'lumoti bo'lmasa ham obunachilar soni
      // saqlanishi kerak — shuning uchun alohida va "yutiladigan" so'rov.
      const analytics = await this.fetchDailyAnalytics(accessToken).catch(
        () => null,
      );
      await this.saveStats(connectionId, account, analytics);
    } catch (err: unknown) {
      this.logger.error(
        `Pinterest stat xatosi connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      // sync.service.ts#syncOne buni Connection.lastSyncError'ga yozadi.
      throw err;
    }
  }

  private async fetchDailyAnalytics(accessToken: string) {
    const end = new Date();
    const start = new Date(
      end.getTime() - ANALYTICS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const res = await axios.get<PinterestAnalyticsResponse>(
      `${PINTEREST_BASE}/user_account/analytics`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          start_date: toIsoDate(start),
          end_date: toIsoDate(end),
          metric_types: 'IMPRESSION,SAVE,PIN_CLICK,ENGAGEMENT',
        },
      },
    );

    return pickLatestReadyDay(res.data);
  }

  private async saveStats(
    connectionId: string,
    account: PinterestAccountResponse,
    analytics: PinterestDailyMetric | null,
  ) {
    const metrics = analytics?.metrics ?? {};

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: todayUtcDate() } },
      create: {
        connectionId,
        date: todayUtcDate(),
        followers: account.follower_count ?? null,
        // Pinterest'da "ko'rish" = impression; hisobot kechikkani uchun
        // analitika bo'lmasa profildagi oylik ko'rsatkichga tushamiz.
        views: metrics.IMPRESSION ?? account.monthly_views ?? null,
        likes: metrics.SAVE ?? null,
        engagement: metrics.ENGAGEMENT ?? null,
        raw: {
          account,
          // Analitika qaysi kunga tegishli ekani muhim — u "bugun" emas,
          // odatda 1-2 kun oldingi ma'lumot.
          analytics_date: analytics?.date ?? null,
          analytics: metrics,
        } as unknown as Prisma.InputJsonValue,
      },
      update: {
        followers: account.follower_count ?? null,
        views: metrics.IMPRESSION ?? account.monthly_views ?? null,
        likes: metrics.SAVE ?? null,
        engagement: metrics.ENGAGEMENT ?? null,
        raw: {
          account,
          analytics_date: analytics?.date ?? null,
          analytics: metrics,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

// Pinterest kunlik metrikalarni "data_status" bilan qaytaradi: hisobot hali
// yig'ilmagan kunlar READY bo'lmaydi va nollar bilan keladi. Eng oxirgi
// TAYYOR kunni tanlaymiz — aks holda har sync'da nol yozib, o'sish grafigini
// buzib qo'yardik.
export function pickLatestReadyDay(
  body: PinterestAnalyticsResponse | undefined | null,
): PinterestDailyMetric | null {
  const days = body?.ALL?.daily_metrics;
  if (!days?.length) return null;

  const ready = days.filter(
    (d) => d.date && (d.data_status ?? 'READY') === 'READY' && d.metrics,
  );
  if (!ready.length) return null;

  return ready.reduce((latest, day) =>
    (day.date ?? '') > (latest.date ?? '') ? day : latest,
  );
}
