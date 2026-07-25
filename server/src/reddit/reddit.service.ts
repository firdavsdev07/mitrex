import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { ConnectRedditDto } from './dto/connect-reddit.dto';
import { todayUtcDate } from '../common/utils/date.util';
import { withRetry } from '../common/utils/http-retry.util';
import { getErrorMessage } from '../common/utils/error.util';

interface RedditAboutResponse {
  data?: {
    name?: string;
    display_name?: string;
    subscribers?: number;
    active_user_count?: number;
    subreddit_type?: string;
    [key: string]: unknown;
  };
}

// Reddit'ning ochiq JSON API'si (r/<sub>/about.json) OAuth talab qilmaydi,
// lekin generic User-Agent bilan tez-tez 429 qaytaradi — Reddit'ning o'zi
// tavsiya qilgan "platform:app-id:version (by /u/username)" formati kerak.
const USER_AGENT =
  process.env.REDDIT_USER_AGENT ||
  'web:metrix-analytics:v1.0 (by /u/metrix_app)';

@Injectable()
export class RedditService {
  private readonly logger = new Logger(RedditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async connect(userId: string, dto: ConnectRedditDto) {
    const subreddit = dto.subreddit.trim();
    const info = await this.fetchSubredditInfo(subreddit);

    // Bir nechta subreddit kuzatish imkoniyati uchun info.name (t5_xxx) bilan
    // birga upsert qilinadi.
    const conn = await this.prisma.connection.upsert({
      where: {
        userId_platform_platformUserId: {
          userId,
          platform: Platform.REDDIT,
          platformUserId: info.name,
        },
      },
      create: {
        userId,
        platform: Platform.REDDIT,
        platformUserId: info.name,
        platformUsername: info.displayName,
        isActive: true,
      },
      update: {
        platformUserId: info.name,
        platformUsername: info.displayName,
        isActive: true,
      },
    });

    await this.saveStats(conn.id, info);

    return {
      connected: true,
      subreddit: info.displayName,
      subscribers: info.subscribers,
    };
  }

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.platformUsername) return;

    try {
      const info = await this.fetchSubredditInfo(conn.platformUsername);
      await this.saveStats(connectionId, info);
    } catch (err: unknown) {
      this.logger.error(
        `Reddit stat xatosi connectionId=${connectionId}: ${getErrorMessage(err)}`,
      );
      throw err;
    }
  }

  private async fetchSubredditInfo(subreddit: string) {
    const res = await withRetry(() =>
      axios.get<RedditAboutResponse>(
        `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about.json`,
        {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 5000,
        },
      ),
    ).catch((err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new BadRequestException(`Subreddit topilmadi: r/${subreddit}`);
      }
      throw new BadRequestException(
        `Reddit API xatosi: ${getErrorMessage(err)}`,
      );
    });

    const data = res.data?.data;
    if (!data || data.subreddit_type === undefined) {
      throw new BadRequestException(`Subreddit topilmadi: r/${subreddit}`);
    }

    return {
      name: data.name ?? '', // t5_xxxxx — barqaror ID
      displayName: data.display_name ?? subreddit,
      subscribers: data.subscribers ?? 0,
      activeUsers: data.active_user_count ?? 0,
      raw: data as unknown as Prisma.InputJsonValue,
    };
  }

  private async saveStats(
    connectionId: string,
    info: {
      subscribers: number;
      activeUsers: number;
      raw: Prisma.InputJsonValue;
    },
  ) {
    const today = todayUtcDate();

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: {
        connectionId,
        date: today,
        followers: info.subscribers,
        views: info.activeUsers,
        raw: info.raw,
      },
      update: {
        followers: info.subscribers,
        views: info.activeUsers,
        raw: info.raw,
      },
    });
  }
}
