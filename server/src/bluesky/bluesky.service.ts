import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';
import { ConnectBlueskyDto } from './dto/connect-bluesky.dto';

@Injectable()
export class BlueskyService {
  private readonly logger = new Logger(BlueskyService.name);
  private readonly apiBase = 'https://bsky.social/xrpc';

  constructor(private readonly prisma: PrismaService) {}

  async connect(userId: string, dto: ConnectBlueskyDto) {
    // AT Protocol: createSession
    const sessionRes = await axios.post(`${this.apiBase}/com.atproto.server.createSession`, {
      identifier: dto.handle,
      password: dto.appPassword,
    }).catch((err) => {
      throw new BadRequestException('Handle yoki App Password noto\'g\'ri');
    });

    const { accessJwt, refreshJwt, did, handle } = sessionRes.data;

    // Profil ma'lumotlari
    const profileRes = await axios.get(`${this.apiBase}/app.bsky.actor.getProfile`, {
      params: { actor: did },
      headers: { Authorization: `Bearer ${accessJwt}` },
    }).catch(() => ({ data: {} }));

    const profile = profileRes.data;

    await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.BLUESKY } },
      create: {
        userId,
        platform: Platform.BLUESKY,
        accessToken: accessJwt,
        refreshToken: refreshJwt,
        platformUserId: did,
        platformUsername: handle || dto.handle,
      },
      update: {
        accessToken: accessJwt,
        refreshToken: refreshJwt,
        platformUserId: did,
        platformUsername: handle || dto.handle,
        isActive: true,
      },
    });

    return {
      connected: true,
      handle: handle || dto.handle,
      followers: profile.followersCount || 0,
    };
  }

  async fetchAndSaveStats(connectionId: number) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn || !conn.accessToken || !conn.platformUserId) return;

    try {
      // Token yangilash
      const token = await this.refreshSessionIfNeeded(conn);
      if (!token) return;

      const profileRes = await axios.get(`${this.apiBase}/app.bsky.actor.getProfile`, {
        params: { actor: conn.platformUserId },
        headers: { Authorization: `Bearer ${token}` },
      });

      const profile = profileRes.data;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: today } },
        create: {
          connectionId,
          date: today,
          followers: profile.followersCount || 0,
          views: profile.postsCount || 0,
          raw: profile as any,
        },
        update: {
          followers: profile.followersCount || 0,
          views: profile.postsCount || 0,
          raw: profile as any,
        },
      });
    } catch (err) {
      this.logger.error(`Bluesky stat xatosi connectionId=${connectionId}: ${err.message}`);
    }
  }

  private async refreshSessionIfNeeded(conn: any): Promise<string | null> {
    try {
      if (!conn.refreshToken) return conn.accessToken;
      const res = await axios.post(
        `${this.apiBase}/com.atproto.server.refreshSession`,
        {},
        { headers: { Authorization: `Bearer ${conn.refreshToken}` } },
      );
      const { accessJwt, refreshJwt } = res.data;
      await this.prisma.connection.update({
        where: { id: conn.id },
        data: { accessToken: accessJwt, refreshToken: refreshJwt },
      });
      return accessJwt;
    } catch {
      return conn.accessToken;
    }
  }
}
