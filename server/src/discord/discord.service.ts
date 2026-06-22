import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly apiBase = 'https://discord.com/api/v10';
  private readonly clientId = process.env.DISCORD_CLIENT_ID;
  private readonly clientSecret = process.env.DISCORD_CLIENT_SECRET;
  // Platform uchun alohida redirect (login dan farqli)
  private readonly redirectUri = process.env.DISCORD_PLATFORM_REDIRECT_URI
    || 'http://localhost:3000/discord/callback';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'bot guilds',
      permissions: '8',
      state: String(userId),
    });
    return { url: `https://discord.com/oauth2/authorize?${params}` };
  }

  async handleCallback(code: string, guildId: string, userId: string) {
    const tokenRes = await axios.post(
      `${this.apiBase}/oauth2/token`,
      new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const guildInfo = await this.getGuildInfo(guildId, access_token);

    await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.DISCORD } },
      create: {
        userId,
        platform: Platform.DISCORD,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        platformUserId: guildId,
        platformUsername: guildInfo?.name || guildId,
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        platformUserId: guildId,
        platformUsername: guildInfo?.name || guildId,
        isActive: true,
      },
    });

    return { connected: true, guild: guildInfo?.name };
  }

  async fetchAndSaveStats(connectionId: number) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn || !conn.platformUserId || !conn.accessToken) return;

    try {
      const guildId = conn.platformUserId;
      const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };

      const [guildRes, membersRes] = await Promise.allSettled([
        axios.get(`${this.apiBase}/guilds/${guildId}`, { headers }),
        axios.get(`${this.apiBase}/guilds/${guildId}/preview`, { headers }),
      ]);

      const guild = guildRes.status === 'fulfilled' ? guildRes.value.data : null;
      const preview = membersRes.status === 'fulfilled' ? membersRes.value.data : null;
      const memberCount = guild?.approximate_member_count || preview?.approximate_member_count || 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: today } },
        create: { connectionId, date: today, followers: memberCount, raw: { guild, memberCount } as any },
        update: { followers: memberCount, raw: { guild, memberCount } as any },
      });
    } catch (err) {
      this.logger.error(`Discord stat xatosi connectionId=${connectionId}: ${err.message}`);
    }
  }

  private async getGuildInfo(guildId: string, accessToken: string) {
    try {
      const res = await axios.get(`${this.apiBase}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.data?.find((g: any) => g.id === guildId);
    } catch {
      return null;
    }
  }
}
