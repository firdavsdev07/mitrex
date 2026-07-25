import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { ConnectBlueskyDto } from './dto/connect-bluesky.dto';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

interface BlueskySessionResponse {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle?: string;
}
interface BlueskyProfileResponse {
  followersCount?: number;
  [key: string]: unknown;
}
interface RefreshableConn {
  id: string;
  accessToken: string;
  refreshToken: string | null;
}

@Injectable()
export class BlueskyService {
  private readonly logger = new Logger(BlueskyService.name);
  private readonly apiBase = 'https://bsky.social/xrpc';

  constructor(private readonly prisma: PrismaService) {}

  async connect(userId: string, dto: ConnectBlueskyDto) {
    // AT Protocol: createSession
    const sessionRes = await axios
      .post<BlueskySessionResponse>(
        `${this.apiBase}/com.atproto.server.createSession`,
        {
          identifier: dto.handle,
          password: dto.appPassword,
        },
      )
      .catch(() => {
        throw new BadRequestException("Handle yoki App Password noto'g'ri");
      });

    const { accessJwt, refreshJwt, did, handle } = sessionRes.data;

    // Profil ma'lumotlari
    const emptyProfile: BlueskyProfileResponse = {};
    const profileRes = await axios
      .get<BlueskyProfileResponse>(
        `${this.apiBase}/app.bsky.actor.getProfile`,
        {
          params: { actor: did },
          headers: { Authorization: `Bearer ${accessJwt}` },
        },
      )
      .catch(() => ({ data: emptyProfile }));

    const profile = profileRes.data;

    // Bir nechta Bluesky akkaunt ulash imkoniyati uchun did bilan birga
    // upsert qilinadi.
    await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.BLUESKY,
          platformUserId: did,
        },
      },
      create: {
        userId,
        platform: Platform.BLUESKY,
        accessToken: encrypt(accessJwt),
        refreshToken: encrypt(refreshJwt),
        platformUserId: did,
        platformUsername: handle || dto.handle,
      },
      update: {
        accessToken: encrypt(accessJwt),
        refreshToken: encrypt(refreshJwt),
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

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn || !conn.accessToken || !conn.platformUserId) return;

    try {
      // Token yangilash
      const token = await this.refreshSessionIfNeeded({
        ...conn,
        accessToken: conn.accessToken,
      });
      if (!token) return;

      const profileRes = await withRetry(() =>
        axios.get<BlueskyProfileResponse>(
          `${this.apiBase}/app.bsky.actor.getProfile`,
          {
            params: { actor: conn.platformUserId },
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      const profile = profileRes.data;
      const today = todayUtcDate();

      // Bluesky ochiq API'sida "ko'rishlar" tushunchasi yo'q — postlar sonini
      // views deb yozish dashboardni chalg'itadi. postsCount raw ichida qoladi.
      await this.prisma.platformStat.upsert({
        where: { connectionId_date: { connectionId, date: today } },
        create: {
          connectionId,
          date: today,
          followers: profile.followersCount || 0,
          views: null,
          raw: profile as unknown as Prisma.InputJsonValue,
        },
        update: {
          followers: profile.followersCount || 0,
          views: null,
          raw: profile as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Bluesky stat xatosi connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      // Discord/Instagram/Reddit kabi qayta uzatamiz — syncOne() shu orqali
      // lastSyncError'ni saqlaydi, aks holda buzilgan ulanish UI'da
      // "sog'lom" ko'rinib qolardi.
      throw err;
    }
  }

  private async refreshSessionIfNeeded(
    conn: RefreshableConn,
  ): Promise<string | null> {
    try {
      if (!conn.refreshToken) return decrypt(conn.accessToken);
      const res = await axios.post<BlueskySessionResponse>(
        `${this.apiBase}/com.atproto.server.refreshSession`,
        {},
        { headers: { Authorization: `Bearer ${decrypt(conn.refreshToken)}` } },
      );
      const { accessJwt, refreshJwt } = res.data;
      await this.prisma.connection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(accessJwt),
          refreshToken: encrypt(refreshJwt),
        },
      });
      return accessJwt;
    } catch {
      return decrypt(conn.accessToken);
    }
  }
}
