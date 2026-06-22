import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly appId = process.env.INSTAGRAM_APP_ID;
  private readonly appSecret = process.env.INSTAGRAM_APP_SECRET;
  private readonly redirectUri = process.env.INSTAGRAM_REDIRECT_URI
    || 'http://localhost:3000/instagram/callback';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.appId!,
      redirect_uri: this.redirectUri,
      scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state: String(userId),
    });
    return { url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` };
  }

  async handleCallback(code: string, userId: string) {
    // Exchange code → short-lived token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      },
    });

    const { access_token: shortToken } = tokenRes.data;

    // Short-lived → long-lived token (60 kun)
    const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortToken,
      },
    });

    const { access_token, expires_in } = longRes.data;
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000);

    // Facebook Page → Instagram Business account olish
    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token },
    });
    const page = pagesRes.data?.data?.[0];

    // Facebook page ulanishi
    await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.FACEBOOK } },
      create: {
        userId,
        platform: Platform.FACEBOOK,
        accessToken: access_token,
        tokenExpiresAt: expiresAt,
        platformUserId: page?.id,
        platformUsername: page?.name,
      },
      update: {
        accessToken: access_token,
        tokenExpiresAt: expiresAt,
        platformUserId: page?.id,
        platformUsername: page?.name,
        isActive: true,
      },
    });

    // Instagram Business account
    if (page?.id) {
      const igRes = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: page.access_token || access_token,
        },
      }).catch(() => ({ data: null }));

      const igId = igRes.data?.instagram_business_account?.id;

      if (igId) {
        const igProfile = await axios.get(`https://graph.facebook.com/v18.0/${igId}`, {
          params: { fields: 'username,name', access_token: page.access_token || access_token },
        }).catch(() => ({ data: {} }));

        await this.prisma.connection.upsert({
          where: { userId_platform: { userId, platform: Platform.INSTAGRAM } },
          create: {
            userId,
            platform: Platform.INSTAGRAM,
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igProfile.data?.username,
          },
          update: {
            accessToken: page.access_token || access_token,
            tokenExpiresAt: expiresAt,
            platformUserId: igId,
            platformUsername: igProfile.data?.username,
            isActive: true,
          },
        });
      }
    }

    return { connected: true, page: page?.name };
  }

  async fetchAndSaveStats(connectionId: number) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn || !conn.accessToken || !conn.platformUserId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (conn.platform === Platform.INSTAGRAM) {
        const res = await axios.get(`https://graph.facebook.com/v18.0/${conn.platformUserId}`, {
          params: {
            fields: 'followers_count,media_count,profile_views',
            access_token: conn.accessToken,
          },
        });
        const data = res.data;
        await this.prisma.platformStat.upsert({
          where: { connectionId_date: { connectionId, date: today } },
          create: { connectionId, date: today, followers: data.followers_count, raw: data as any },
          update: { followers: data.followers_count, raw: data as any },
        });
      } else if (conn.platform === Platform.FACEBOOK) {
        const res = await axios.get(`https://graph.facebook.com/v18.0/${conn.platformUserId}`, {
          params: { fields: 'fan_count,followers_count', access_token: conn.accessToken },
        });
        const data = res.data;
        await this.prisma.platformStat.upsert({
          where: { connectionId_date: { connectionId, date: today } },
          create: { connectionId, date: today, followers: data.fan_count || data.followers_count, raw: data as any },
          update: { followers: data.fan_count || data.followers_count, raw: data as any },
        });
      }
    } catch (err) {
      this.logger.error(`Meta stat xatosi connectionId=${connectionId}: ${err.message}`);
    }
  }
}
