import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { signOAuthState } from '../common/utils/oauth-state.util';
import { encrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

interface DiscordOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
interface DiscordGuild {
  id: string;
  name: string;
  approximate_member_count?: number;
}
interface DiscordGuildPreview {
  approximate_member_count?: number;
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly apiBase = 'https://discord.com/api/v10';
  private readonly clientId = process.env.DISCORD_CLIENT_ID;
  private readonly clientSecret = process.env.DISCORD_CLIENT_SECRET;
  // Platform uchun alohida redirect (login dan farqli)
  private readonly redirectUri =
    process.env.DISCORD_PLATFORM_REDIRECT_URI ||
    'http://localhost:3000/discord/callback';

  constructor(private readonly prisma: PrismaService) {}

  getAuthUrl(userId: string) {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'bot guilds',
      permissions: '8',
      state: signOAuthState(userId),
    });
    return { url: `https://discord.com/oauth2/authorize?${params}` };
  }

  async handleCallback(code: string, guildId: string, userId: string) {
    const tokenRes = await axios.post<DiscordOAuthTokenResponse>(
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

    // Bir nechta Discord serveri ulash imkoniyati uchun guildId bilan birga
    // upsert qilinadi.
    await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.DISCORD,
          platformUserId: guildId,
        },
      },
      create: {
        userId,
        platform: Platform.DISCORD,
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        tokenExpiresAt: expiresAt,
        platformUserId: guildId,
        platformUsername: guildInfo?.name || guildId,
      },
      update: {
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        tokenExpiresAt: expiresAt,
        platformUserId: guildId,
        platformUsername: guildInfo?.name || guildId,
        isActive: true,
      },
    });

    return { connected: true, guild: guildInfo?.name };
  }

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn || !conn.platformUserId || !conn.accessToken) return;

    try {
      const guildId = conn.platformUserId;
      const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };

      const [guildRes, membersRes] = await Promise.allSettled([
        // with_counts bo'lmasa Discord approximate_member_count qaytarmaydi
        withRetry(() =>
          axios.get<DiscordGuild>(`${this.apiBase}/guilds/${guildId}`, {
            headers,
            params: { with_counts: true },
          }),
        ),
        withRetry(() =>
          axios.get<DiscordGuildPreview>(
            `${this.apiBase}/guilds/${guildId}/preview`,
            { headers },
          ),
        ),
      ]);

      const guild =
        guildRes.status === 'fulfilled' ? guildRes.value.data : null;
      const preview =
        membersRes.status === 'fulfilled' ? membersRes.value.data : null;
      const memberCount =
        guild?.approximate_member_count ||
        preview?.approximate_member_count ||
        0;

      const today = todayUtcDate();

      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: today } },
        create: {
          connectionId,
          date: today,
          followers: memberCount,
          raw: { guild, memberCount } as unknown as Prisma.InputJsonValue,
        },
        update: {
          followers: memberCount,
          raw: { guild, memberCount } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Discord stat xatosi connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      // sync.service.ts#syncOne bu xatoni Connection.lastSyncError'ga
      // yozishi uchun yuqoriga uzatiladi — bu yerda yutib qo'yilsa, UI'da
      // "ulanish buzilgan" holati ko'rinmay qoladi.
      throw err;
    }
  }

  private async getGuildInfo(guildId: string, accessToken: string) {
    try {
      const res = await axios.get<DiscordGuild[]>(
        `${this.apiBase}/users/@me/guilds`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      return res.data?.find((g) => g.id === guildId);
    } catch (err: unknown) {
      this.logger.warn(
        `Discord guild info olinmadi guildId=${guildId}: ${getErrorMessage(err)}`,
      );
      return null;
    }
  }
}
