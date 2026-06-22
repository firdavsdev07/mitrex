import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class YoutubeService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly redirectUri = process.env.GOOGLE_REDIRECT_URI;

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri!,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state: String(userId),
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }

  async handleCallback(code: string, userId: string) {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const channelInfo = await this.getChannelInfo(access_token);

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
      create: {
        userId,
        platform: Platform.YOUTUBE,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        platformUserId: channelInfo.id,
        platformUsername: channelInfo.title,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        platformUserId: channelInfo.id,
        platformUsername: channelInfo.title,
        isActive: true,
      },
    });

    return { connected: true, channel: channelInfo.title };
  }

  async refreshAccessToken(connectionId: number, refreshToken: string) {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = res.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { accessToken: access_token, tokenExpiresAt: expiresAt },
    });

    return access_token;
  }

  async fetchAndSaveStats(connectionId: number) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn || !conn.accessToken) return;

    let token = conn.accessToken;
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date() && conn.refreshToken) {
      token = await this.refreshAccessToken(connectionId, conn.refreshToken);
    }

    const stats = await this.getChannelStats(token);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: {
        connectionId,
        date: today,
        followers: stats.subscriberCount,
        views: stats.viewCount,
        raw: stats as any,
      },
      update: {
        followers: stats.subscriberCount,
        views: stats.viewCount,
        raw: stats as any,
      },
    });
  }

  private async getChannelInfo(accessToken: string) {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const channel = res.data.items?.[0];
    if (!channel) throw new BadRequestException('YouTube kanal topilmadi');
    return { id: channel.id, title: channel.snippet.title };
  }

  private async getChannelStats(accessToken: string) {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'statistics', mine: true },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const stats = res.data.items?.[0]?.statistics;
    return {
      subscriberCount: parseInt(stats?.subscriberCount || '0'),
      viewCount: parseInt(stats?.viewCount || '0'),
      videoCount: parseInt(stats?.videoCount || '0'),
    };
  }
}
