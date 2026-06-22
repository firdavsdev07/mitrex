import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

const META_API_VERSION = 'v19.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// Scopes required for Meta App Review
// instagram_business_basic → replaces deprecated instagram_basic
// instagram_business_manage_insights → metrics & insights
// pages_show_list → list pages
// pages_read_engagement → page engagement data
// business_management → business suite access (optional, needed for some features)
const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'public_profile',
  'email',
].join(',');

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly appId = process.env.INSTAGRAM_APP_ID;
  private readonly appSecret = process.env.INSTAGRAM_APP_SECRET;
  private readonly redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/instagram/callback';
  private readonly webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'metrix_webhook_verify';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri,
      scope: REQUIRED_SCOPES,
      response_type: 'code',
      state: userId,
    });
    return {
      url: `https://www.facebook.com/dialog/oauth?${params}`,
      requiredScopes: REQUIRED_SCOPES.split(','),
      note: 'Instagram Business Login — requires App Review for production use',
    };
  }

  async handleCallback(code: string, userId: string) {
    // Step 1: code → short-lived token
    const tokenRes = await axios.get(`${META_BASE}/oauth/access_token`, {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      },
    }).catch((err) => {
      throw new BadRequestException(`Meta OAuth error: ${err.response?.data?.error?.message || err.message}`);
    });

    const { access_token: shortToken } = tokenRes.data;

    // Step 2: short-lived → long-lived token (60 days)
    const longRes = await axios.get(`${META_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortToken,
      },
    });
    const { access_token, expires_in } = longRes.data;
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000);

    // Step 3: Get user's Facebook Pages
    const pagesRes = await axios.get(`${META_BASE}/me/accounts`, {
      params: { access_token, fields: 'id,name,access_token,instagram_business_account' },
    });
    const pages: any[] = pagesRes.data?.data || [];

    let connectedCount = 0;

    for (const page of pages) {
      // Connect Facebook Page
      await this.prisma.connection.upsert({
        where: { userId_platform: { userId, platform: Platform.FACEBOOK } },
        create: {
          userId, platform: Platform.FACEBOOK,
          accessToken: page.access_token || access_token,
          tokenExpiresAt: expiresAt,
          platformUserId: page.id,
          platformUsername: page.name,
        },
        update: {
          accessToken: page.access_token || access_token,
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
        const igRes = await axios.get(`${META_BASE}/${igId}`, {
          params: {
            fields: 'username,name,followers_count,media_count',
            access_token: page.access_token || access_token,
          },
        }).catch(() => ({ data: { username: igId } }));

        await this.prisma.connection.upsert({
          where: { userId_platform: { userId, platform: Platform.INSTAGRAM } },
          create: {
            userId, platform: Platform.INSTAGRAM,
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igRes.data?.username || igId,
          },
          update: {
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igRes.data?.username || igId,
            isActive: true,
          },
        });

        // Also connect Threads (same IG account, different platform)
        await this.prisma.connection.upsert({
          where: { userId_platform: { userId, platform: Platform.THREADS } },
          create: {
            userId, platform: Platform.THREADS,
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igRes.data?.username || igId,
          },
          update: {
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            isActive: true,
          },
        });
        connectedCount += 2;
      }
    }

    return {
      connected: true,
      platforms: connectedCount,
      pages: pages.map((p) => p.name),
      note: connectedCount === 0 ? 'No Instagram Business accounts found. Make sure your Instagram is connected to a Facebook Page.' : undefined,
    };
  }

  // ─── Meta Webhook (required for App Review) ───────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  async handleWebhookEvent(body: any) {
    const object = body?.object;
    const entries: any[] = body?.entry || [];

    for (const entry of entries) {
      if (object === 'instagram') {
        await this.processInstagramWebhook(entry);
      } else if (object === 'page') {
        await this.processFacebookWebhook(entry);
      }
    }
  }

  private async processInstagramWebhook(entry: any) {
    const igId = entry.id;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field === 'mentions' || change.field === 'story_insights') {
        this.logger.log(`Instagram webhook: ${change.field} for ${igId}`);
        // Future: real-time mention/story tracking
      }
    }
  }

  private async processFacebookWebhook(entry: any) {
    this.logger.log(`Facebook Page webhook: ${JSON.stringify(entry?.id)}`);
    // Future: page engagement updates
  }

  // ─── Fetch and save stats ──────────────────────────────────────────────────

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.accessToken || !conn?.platformUserId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (conn.platform === Platform.INSTAGRAM) {
        await this.syncInstagramStats(conn, today);
      } else if (conn.platform === Platform.FACEBOOK) {
        await this.syncFacebookStats(conn, today);
      } else if (conn.platform === Platform.THREADS) {
        await this.syncThreadsStats(conn, today);
      }
    } catch (err) {
      this.logger.error(`Meta stats sync error connectionId=${connectionId}: ${err.message}`);
    }
  }

  private async syncInstagramStats(conn: any, today: Date) {
    const res = await axios.get(`${META_BASE}/${conn.platformUserId}`, {
      params: {
        fields: 'followers_count,media_count,profile_views',
        access_token: conn.accessToken,
      },
    });

    await this.upsertStat(conn.id, today, {
      followers: res.data.followers_count,
      views: res.data.profile_views || 0,
      raw: res.data,
    });
  }

  private async syncFacebookStats(conn: any, today: Date) {
    const res = await axios.get(`${META_BASE}/${conn.platformUserId}`, {
      params: { fields: 'fan_count,followers_count,talking_about_count', access_token: conn.accessToken },
    });

    await this.upsertStat(conn.id, today, {
      followers: res.data.fan_count || res.data.followers_count,
      engagement: res.data.talking_about_count || 0,
      raw: res.data,
    });
  }

  private async syncThreadsStats(conn: any, today: Date) {
    // Threads uses Instagram Graph API with threads_* scopes
    // Currently using same IG user ID but different endpoints
    try {
      const res = await axios.get(`${META_BASE}/${conn.platformUserId}/threads_publishing_limit`, {
        params: { fields: 'config,quota_usage', access_token: conn.accessToken },
      }).catch(() => null);

      // Fallback: get IG profile (Threads shares same account)
      const profileRes = await axios.get(`${META_BASE}/${conn.platformUserId}`, {
        params: { fields: 'followers_count', access_token: conn.accessToken },
      }).catch(() => ({ data: {} }));

      await this.upsertStat(conn.id, today, {
        followers: profileRes.data?.followers_count || 0,
        raw: { threads: res?.data, profile: profileRes.data },
      });
    } catch (err) {
      this.logger.warn(`Threads stats: ${err.message}`);
    }
  }

  private async upsertStat(connectionId: string, date: Date, data: { followers?: number; views?: number; engagement?: number; raw?: any }) {
    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date } },
      create: { connectionId, date, ...data },
      update: { ...data },
    });
  }
}
