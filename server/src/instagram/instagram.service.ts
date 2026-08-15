import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { signOAuthState } from '../common/utils/oauth-state.util';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

export const META_API_VERSION = 'v22.0';
export const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── External API response shapes (faqat ishlatilgan maydonlar) ────────────

interface MetaOAuthTokenResponse {
  access_token: string;
  expires_in?: number;
}
interface MetaPage {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string };
}
interface MetaPagesResponse {
  data?: MetaPage[];
}
interface MetaProfileResponse {
  username?: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  fan_count?: number;
  talking_about_count?: number;
  [key: string]: unknown;
}
interface MetaInsightsResponse {
  data?: Array<{ name: string; values?: Array<{ value: number }> }>;
}
interface MetaWebhookChange {
  field?: string;
}
interface MetaWebhookEntry {
  id?: string;
  changes?: MetaWebhookChange[];
}
export interface MetaWebhookBody {
  object?: string;
  entry?: MetaWebhookEntry[];
}
// Sync uchun kerakli maydonlar bilan cheklangan Connection subset — to'liq
// Prisma modelini talab qilish o'rniga faqat shu metodlar ishlatadigan
// maydonlar aniq belgilanadi.
interface DecryptedConn {
  id: string;
  platformUserId: string | null;
  accessToken: string;
}

// Scopes required for Meta App Review
// instagram_business_basic → replaces deprecated instagram_basic
// instagram_business_manage_insights → metrics & insights
// pages_show_list → list pages
// pages_read_engagement → page engagement data
// business_management → business suite access (optional, needed for some features)
// pages_read_user_content → Page postlarini (/{page-id}/posts) o'qish uchun
//   shart; pages_read_engagement yolg'iz o'zi faqat sahifa metama'lumotini
//   beradi, postlar ro'yxatiga ruxsat bermaydi.
// threads_basic / threads_manage_insights → Threads profili va post
//   statistikasi (graph.threads.net) uchun.
const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'threads_basic',
  'threads_manage_insights',
  'public_profile',
  'email',
].join(',');

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly appId = process.env.INSTAGRAM_APP_ID;
  private readonly appSecret = process.env.INSTAGRAM_APP_SECRET;
  private readonly redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ||
    'http://localhost:5000/instagram/callback';
  private readonly webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri,
      scope: REQUIRED_SCOPES,
      response_type: 'code',
      state: signOAuthState(userId),
    });
    return {
      url: `https://www.facebook.com/dialog/oauth?${params}`,
      requiredScopes: REQUIRED_SCOPES.split(','),
      note: 'Instagram Business Login — requires App Review for production use',
    };
  }

  async handleCallback(code: string, userId: string) {
    // Step 1: code → short-lived token
    const tokenRes = await axios
      .get<MetaOAuthTokenResponse>(`${META_BASE}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code,
        },
      })
      .catch((err: unknown) => {
        throw new BadRequestException(
          `Meta OAuth error: ${getErrorMessage(err)}`,
        );
      });

    const { access_token: shortToken } = tokenRes.data;

    // Step 2: short-lived → long-lived token (60 days)
    const longRes = await axios.get<MetaOAuthTokenResponse>(
      `${META_BASE}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortToken,
        },
      },
    );
    const { access_token, expires_in } = longRes.data;
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000);

    // Step 3: Get user's Facebook Pages
    const pagesRes = await axios.get<MetaPagesResponse>(
      `${META_BASE}/me/accounts`,
      {
        params: {
          access_token,
          fields: 'id,name,access_token,instagram_business_account',
        },
      },
    );
    const pages: MetaPage[] = pagesRes.data?.data || [];

    let connectedCount = 0;

    for (const page of pages) {
      const pageToken = page.access_token || access_token;
      const encryptedPageToken = encrypt(pageToken);

      // Connect Facebook Page — bir nechta page bo'lishi mumkin, shuning
      // uchun page.id bilan birga upsert qilinadi.
      await this.prisma.connection.upsert({
        where: {
          userId_platform_platformUserId: {
            userId,
            platform: Platform.FACEBOOK,
            platformUserId: page.id,
          },
        },
        create: {
          userId,
          platform: Platform.FACEBOOK,
          accessToken: encryptedPageToken,
          tokenExpiresAt: expiresAt,
          platformUserId: page.id,
          platformUsername: page.name,
        },
        update: {
          accessToken: encryptedPageToken,
          tokenExpiresAt: expiresAt,
          platformUserId: page.id,
          platformUsername: page.name,
          isActive: true,
        },
      });
      connectedCount++;

      // Connect Instagram Business Account (if linked)
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        const igRes = await axios
          .get<MetaProfileResponse>(`${META_BASE}/${igId}`, {
            params: {
              fields: 'username,name,followers_count,media_count',
              access_token: pageToken,
            },
          })
          .catch(() => ({ data: { username: igId } }));

        await this.prisma.connection.upsert({
          where: {
            userId_platform_platformUserId: {
              userId,
              platform: Platform.INSTAGRAM,
              platformUserId: igId,
            },
          },
          create: {
            userId,
            platform: Platform.INSTAGRAM,
            accessToken: encryptedPageToken,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igRes.data?.username || igId,
          },
          update: {
            accessToken: encryptedPageToken,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igRes.data?.username || igId,
            isActive: true,
          },
        });

        // Threads shu IG akkauntga tegishli bo'lsa-da, bu yerda ULANMAYDI:
        // uning API'si alohida hostda (graph.threads.net) va Meta Graph
        // tokenini qabul qilmaydi. Threads uchun o'z OAuth oqimi bor —
        // qarang threads.service.ts (/threads/connect).
        connectedCount++;
      }
    }

    return {
      connected: true,
      platforms: connectedCount,
      pages: pages.map((p) => p.name),
      note:
        connectedCount === 0
          ? 'No Instagram Business accounts found. Make sure your Instagram is connected to a Facebook Page.'
          : undefined,
    };
  }

  // ─── Meta Webhook (required for App Review) ───────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (
      mode === 'subscribe' &&
      this.webhookVerifyToken &&
      token === this.webhookVerifyToken
    ) {
      return challenge;
    }
    return null;
  }

  // Validates Meta's X-Hub-Signature-256 header against the raw request body,
  // so we only process webhook payloads that actually came from Meta.
  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): boolean {
    if (!rawBody || !signatureHeader || !this.appSecret) return false;
    const expected = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signatureHeader.replace(/^sha256=/, '');
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  handleWebhookEvent(body: MetaWebhookBody) {
    const object = body?.object;
    const entries: MetaWebhookEntry[] = body?.entry || [];

    for (const entry of entries) {
      if (object === 'instagram') {
        this.processInstagramWebhook(entry);
      } else if (object === 'page') {
        this.processFacebookWebhook(entry);
      }
    }
  }

  private processInstagramWebhook(entry: MetaWebhookEntry) {
    const igId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field === 'mentions' || change.field === 'story_insights') {
        this.logger.log(`Instagram webhook: ${change.field} for ${igId}`);
        // Future: real-time mention/story tracking
      }
    }
  }

  private processFacebookWebhook(entry: MetaWebhookEntry) {
    this.logger.log(`Facebook Page webhook: ${JSON.stringify(entry?.id)}`);
    // Future: page engagement updates
  }

  // ─── Fetch and save stats ──────────────────────────────────────────────────

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken || !conn?.platformUserId) return;
    // Pastdagi sync metodlari conn.accessToken'ni to'g'ridan-to'g'ri Meta
    // API'ga uzatadi — bir joyda deshifrlab, xuddi shu maydonga qaytaramiz.
    const decryptedConn = { ...conn, accessToken: decrypt(conn.accessToken) };

    try {
      const today = todayUtcDate();

      if (conn.platform === Platform.INSTAGRAM) {
        await this.syncInstagramStats(decryptedConn, today);
      } else if (conn.platform === Platform.FACEBOOK) {
        await this.syncFacebookStats(decryptedConn, today);
      }
    } catch (err: unknown) {
      this.logger.error(
        `Meta stats sync error connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      // sync.service.ts#syncOne bu xatoni Connection.lastSyncError'ga
      // yozishi uchun yuqoriga uzatiladi.
      throw err;
    }
  }

  private async syncInstagramStats(conn: DecryptedConn, today: Date) {
    // profile_views user node'da field emas — insights metrikasi. Uni fields
    // ro'yxatiga qo'shsak butun so'rov xato beradi va stats umuman saqlanmaydi.
    const res = await withRetry(() =>
      axios.get<MetaProfileResponse>(`${META_BASE}/${conn.platformUserId}`, {
        params: {
          fields: 'followers_count,media_count',
          access_token: conn.accessToken,
        },
      }),
    );

    // Profil ko'rishlari alohida insights endpointidan (ruxsat bo'lmasa 0)
    const insightsRes = await axios
      .get<MetaInsightsResponse>(
        `${META_BASE}/${conn.platformUserId}/insights`,
        {
          params: {
            metric: 'profile_views',
            period: 'day',
            access_token: conn.accessToken,
          },
        },
      )
      .catch(() => null);
    const profileViews =
      insightsRes?.data?.data?.[0]?.values?.slice(-1)?.[0]?.value ?? 0;

    await this.upsertStat(conn.id, today, {
      followers: res.data.followers_count,
      views: profileViews,
      raw: { ...res.data, profile_views: profileViews },
    });
  }

  private async syncFacebookStats(conn: DecryptedConn, today: Date) {
    const res = await withRetry(() =>
      axios.get<MetaProfileResponse>(`${META_BASE}/${conn.platformUserId}`, {
        params: {
          fields: 'fan_count,followers_count,talking_about_count',
          access_token: conn.accessToken,
        },
      }),
    );

    await this.upsertStat(conn.id, today, {
      followers: res.data.fan_count || res.data.followers_count,
      engagement: res.data.talking_about_count || 0,
      raw: res.data as unknown as Prisma.InputJsonValue,
    });
  }

  private async upsertStat(
    connectionId: string,
    date: Date,
    data: {
      followers?: number;
      views?: number;
      engagement?: number;
      raw?: Prisma.InputJsonValue;
    },
  ) {
    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date } },
      create: { connectionId, date, ...data },
      update: { ...data },
    });
  }
}
