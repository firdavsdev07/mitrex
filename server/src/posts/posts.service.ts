import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { TelegramMtprotoService } from '../telegram/telegram-mtproto.service';
import { META_BASE } from '../instagram/instagram.service';
import { YoutubeService } from '../youtube/youtube.service';
import { decrypt } from '../common/utils/crypto.util';
import { todayUtcDate } from '../common/utils/date.util';
import { getErrorMessage } from '../common/utils/error.util';

// ─── External API response shapes (faqat ishlatilgan maydonlar) ────────────

interface YoutubeChannelsResponse {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}
interface YoutubePlaylistItemsResponse {
  items?: Array<{ contentDetails?: { videoId?: string } }>;
}
interface YoutubeVideosResponse {
  items?: Array<{
    id: string;
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string } };
    };
  }>;
}
interface YoutubeAnalyticsReportsResponse {
  rows?: [string, number][];
}
interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}
interface InstagramMediaListResponse {
  data?: InstagramMediaItem[];
}
interface InstagramInsightsResponse {
  data?: Array<{ name: string; values?: Array<{ value: number }> }>;
}
interface BlueskyPost {
  uri: string;
  record?: { text?: string; createdAt?: string };
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
}
interface BlueskyFeedResponse {
  feed?: Array<{ post?: BlueskyPost }>;
}

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramMtproto: TelegramMtprotoService,
    private readonly youtubeService: YoutubeService,
  ) {}

  // ─── Get posts list ──────────────────────────────────────────────────────
  // platform bo'yicha emas, aniq connectionId bo'yicha — bitta platformada
  // bir nechta ulanish bo'lishi mumkin (masalan 2 ta Telegram kanal).

  async getPosts(userId: string, connectionId: string, limit = 20, offset = 0) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn || conn.userId !== userId) return { posts: [], total: 0 };

    const [posts, total] = await Promise.all([
      this.prisma.postStat.findMany({
        where: { connectionId: conn.id },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.postStat.count({ where: { connectionId: conn.id } }),
    ]);

    return {
      posts,
      total,
      platform: conn.platform,
      username: conn.platformUsername,
    };
  }

  async getTopPosts(
    userId: string,
    connectionId: string,
    metric:
      | 'views'
      | 'likes'
      | 'comments'
      | 'engagementRate'
      | 'follows' = 'views',
  ) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn || conn.userId !== userId) return [];

    return this.prisma.postStat.findMany({
      where: { connectionId: conn.id },
      orderBy: { [metric]: 'desc' },
      take: 10,
    });
  }

  // ─── YouTube video stats ─────────────────────────────────────────────────
  // Asosiy statistika (views/likes/comments) ommaviy API kalit orqali ishlaydi
  // — OAuth shart emas, istalgan (hatto boshqa birovning) kanal uchun ham
  // ishlaydi. "uploads" playlist + playlistItems yo'li search.list'ga (100
  // kvota birligi) qaraganda ancha arzon (1 birlik).
  //
  // Video-darajasidagi obunachi statistikasi (subscribersGained) esa faqat
  // kanal egasi o'zi Google OAuth orqali ulagan bo'lsa ishlaydi (Analytics
  // API) — shuning uchun conn.accessToken mavjud bo'lgandagina qo'shimcha
  // so'rov yuboriladi.

  async syncYoutubePosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.platformUserId) return;

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return;

    try {
      const chRes = await axios.get<YoutubeChannelsResponse>(
        'https://www.googleapis.com/youtube/v3/channels',
        {
          params: {
            part: 'contentDetails',
            id: conn.platformUserId,
            key: apiKey,
          },
        },
      );
      const uploadsPlaylistId =
        chRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) return;

      const listRes = await axios.get<YoutubePlaylistItemsResponse>(
        'https://www.googleapis.com/youtube/v3/playlistItems',
        {
          params: {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: 50,
            key: apiKey,
          },
        },
      );
      const videoIds: string[] = (listRes.data.items || [])
        .map((v) => v.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));
      if (!videoIds.length) return;

      const statsRes = await axios.get<YoutubeVideosResponse>(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'statistics,snippet',
            id: videoIds.join(','),
            key: apiKey,
          },
        },
      );

      for (const video of statsRes.data.items || []) {
        const s = video.statistics;
        const sn = video.snippet;
        await this.prisma.postStat.upsert({
          where: { connectionId_postId: { connectionId, postId: video.id } },
          create: {
            connectionId,
            platform: Platform.YOUTUBE,
            postId: video.id,
            title: sn?.title,
            thumbnailUrl: sn?.thumbnails?.medium?.url,
            url: `https://youtube.com/watch?v=${video.id}`,
            publishedAt: sn?.publishedAt ? new Date(sn.publishedAt) : null,
            views: parseInt(s?.viewCount || '0'),
            likes: parseInt(s?.likeCount || '0'),
            comments: parseInt(s?.commentCount || '0'),
            raw: video,
          },
          update: {
            title: sn?.title,
            views: parseInt(s?.viewCount || '0'),
            likes: parseInt(s?.likeCount || '0'),
            comments: parseInt(s?.commentCount || '0'),
            raw: video,
            syncedAt: new Date(),
          },
        });
      }
      this.logger.log(
        `YouTube: ${statsRes.data.items?.length || 0} video sinxronlandi (conn: ${connectionId})`,
      );

      if (conn.accessToken) {
        await this.syncYoutubeSubscribersPerVideo(conn, videoIds);
      }
    } catch (err: unknown) {
      this.logger.error(`YouTube post sync error: ${getErrorMessage(err)}`);
    }
  }

  private async syncYoutubeSubscribersPerVideo(
    conn: {
      id: string;
      accessToken: string | null;
      refreshToken: string | null;
      tokenExpiresAt: Date | null;
    },
    videoIds: string[],
  ) {
    if (!conn.accessToken) return;

    let token = decrypt(conn.accessToken);
    if (
      conn.tokenExpiresAt &&
      conn.tokenExpiresAt < new Date() &&
      conn.refreshToken
    ) {
      token = await this.youtubeService.refreshAccessToken(
        conn.id,
        decrypt(conn.refreshToken),
      );
    }

    try {
      const res = await axios.get<YoutubeAnalyticsReportsResponse>(
        'https://youtubeanalytics.googleapis.com/v2/reports',
        {
          params: {
            ids: 'channel==MINE',
            startDate: '2005-01-01', // YouTube tashkil topgan yil — "butun davr" o'rniga
            endDate: new Date().toISOString().slice(0, 10),
            metrics: 'subscribersGained',
            dimensions: 'video',
            filters: `video==${videoIds.join(',')}`,
            maxResults: 200,
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const rows: [string, number][] = res.data.rows || [];
      for (const [videoId, subscribersGained] of rows) {
        if (!subscribersGained) continue;
        await this.prisma.postStat.updateMany({
          where: { connectionId: conn.id, postId: videoId },
          data: { follows: subscribersGained },
        });
      }
      if (rows.length) {
        this.logger.log(
          `YouTube Analytics: ${rows.length} video uchun obunachi statistikasi yangilandi (conn: ${conn.id})`,
        );
      }
    } catch (err: unknown) {
      // yt-analytics.readonly ruxsati berilmagan yoki token eskirgan — jimgina
      // o'tkazib yuboramiz, asosiy statistika (views/likes) baribir saqlangan.
      this.logger.warn(
        `YouTube Analytics xatosi (conn: ${conn.id}): ${getErrorMessage(err)}`,
      );
    }
  }

  // ─── Instagram media stats ────────────────────────────────────────────────

  async syncInstagramPosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken || !conn?.platformUserId) return;
    const accessToken = decrypt(conn.accessToken);

    try {
      const mediaRes = await axios.get<InstagramMediaListResponse>(
        `${META_BASE}/${conn.platformUserId}/media`,
        {
          params: {
            fields:
              'id,caption,media_type,media_product_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
            limit: 25,
            access_token: accessToken,
          },
        },
      );

      const items: InstagramMediaItem[] = mediaRes.data?.data || [];

      // Har bir post uchun insight so'rovi mustaqil Meta API chaqiruvi —
      // ketma-ket emas, parallel yuboriladi (25 tagacha post bo'lishi mumkin,
      // ketma-ket bo'lsa sinxronlash bir necha soniya cho'zilardi).
      const insightsPerMedia = await Promise.all(
        items.map((media) => {
          // "follows" (shu post ko'rilgach obuna bo'lganlar soni) faqat FEED
          // (oddiy post/carousel) uchun mavjud — Reels'da Meta bu metrikani
          // umuman bermaydi.
          const isFeed = media.media_product_type === 'FEED';
          const metrics = isFeed
            ? 'views,reach,shares,follows'
            : 'views,reach,shares';

          return axios
            .get<InstagramInsightsResponse>(
              `${META_BASE}/${media.id}/insights`,
              {
                params: { metric: metrics, access_token: accessToken },
              },
            )
            .catch(() => null);
        }),
      );

      for (let i = 0; i < items.length; i++) {
        const media = items[i];
        const insights = insightsPerMedia[i];
        const isFeed = media.media_product_type === 'FEED';

        const insightValues: Record<string, number> = {};
        for (const entry of insights?.data?.data || []) {
          insightValues[entry.name] = entry.values?.[0]?.value ?? 0;
        }

        await this.prisma.postStat.upsert({
          where: { connectionId_postId: { connectionId, postId: media.id } },
          create: {
            connectionId,
            platform: Platform.INSTAGRAM,
            postId: media.id,
            contentType: media.media_product_type ?? null,
            caption: media.caption?.slice(0, 500),
            thumbnailUrl: media.thumbnail_url ?? media.media_url,
            url: media.permalink,
            publishedAt: media.timestamp ? new Date(media.timestamp) : null,
            likes: media.like_count ?? 0,
            comments: media.comments_count ?? 0,
            shares: insightValues.shares ?? null,
            views: insightValues.views ?? null,
            reach: insightValues.reach ?? null,
            follows: isFeed ? (insightValues.follows ?? null) : null,
            raw: media as unknown as Prisma.InputJsonValue,
          },
          update: {
            contentType: media.media_product_type ?? null,
            likes: media.like_count ?? 0,
            comments: media.comments_count ?? 0,
            shares: insightValues.shares ?? null,
            views: insightValues.views ?? null,
            reach: insightValues.reach ?? null,
            follows: isFeed ? (insightValues.follows ?? null) : null,
            syncedAt: new Date(),
          },
        });
      }
      this.logger.log(
        `Instagram: ${items.length} post sinxronlandi (conn: ${connectionId})`,
      );
    } catch (err: unknown) {
      this.logger.error(`Instagram post sync error: ${getErrorMessage(err)}`);
    }
  }

  // ─── Instagram stories ───────────────────────────────────────────────────
  // Story'lar 24 soatdan keyin butunlay o'chib ketadi (Meta insight'lari ham
  // shu bilan birga yo'qoladi) — shuning uchun bu funksiya har sinxronizatsiya
  // siklida (6 soatda bir marta) chaqiriladi, aks holda ko'p story hech qachon
  // ushlanmay qoladi. "follows" bu yerda ishlaydi (Reels'dan farqli) — Meta
  // buni FEED va STORY uchun beradi, REELS uchun bermaydi.
  async syncInstagramStories(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken || !conn?.platformUserId) return;
    const accessToken = decrypt(conn.accessToken);

    try {
      const storiesRes = await axios.get<InstagramMediaListResponse>(
        `${META_BASE}/${conn.platformUserId}/stories`,
        {
          params: {
            fields: 'id,media_type,media_url,thumbnail_url,timestamp,permalink',
            access_token: accessToken,
          },
        },
      );

      const items: InstagramMediaItem[] = storiesRes.data?.data || [];

      // syncInstagramPosts'dagi bilan bir xil sabab — mustaqil so'rovlar parallel.
      const insightsPerStory = await Promise.all(
        items.map((story) =>
          axios
            .get<InstagramInsightsResponse>(
              `${META_BASE}/${story.id}/insights`,
              {
                params: {
                  metric:
                    'reach,follows,shares,replies,total_interactions,views',
                  access_token: accessToken,
                },
              },
            )
            .catch(() => null),
        ),
      );

      for (let i = 0; i < items.length; i++) {
        const story = items[i];
        const insights = insightsPerStory[i];

        const insightValues: Record<string, number> = {};
        for (const entry of insights?.data?.data || []) {
          insightValues[entry.name] = entry.values?.[0]?.value ?? 0;
        }

        await this.prisma.postStat.upsert({
          where: { connectionId_postId: { connectionId, postId: story.id } },
          create: {
            connectionId,
            platform: Platform.INSTAGRAM,
            postId: story.id,
            contentType: 'STORY',
            thumbnailUrl: story.thumbnail_url ?? story.media_url,
            url: story.permalink ?? null,
            publishedAt: story.timestamp ? new Date(story.timestamp) : null,
            views: insightValues.views ?? null,
            reach: insightValues.reach ?? null,
            shares: insightValues.shares ?? null,
            comments: insightValues.replies ?? null, // storylarda "izoh" emas "reply" tushunchasi ishlatiladi
            follows: insightValues.follows ?? null,
            raw: { ...story, insights: insightValues },
          },
          update: {
            views: insightValues.views ?? null,
            reach: insightValues.reach ?? null,
            shares: insightValues.shares ?? null,
            comments: insightValues.replies ?? null,
            follows: insightValues.follows ?? null,
            syncedAt: new Date(),
            raw: { ...story, insights: insightValues },
          },
        });
      }
      if (items.length) {
        this.logger.log(
          `Instagram: ${items.length} story sinxronlandi (conn: ${connectionId})`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(`Instagram story sync error: ${getErrorMessage(err)}`);
    }
  }

  // ─── Telegram post stats ──────────────────────────────────────────────────
  // Bot API'da kanal tarixini olish imkoniyati yo'q — shuning uchun MTProto
  // (TelegramMtprotoService) orqali haqiqiy postlar va ko'rishlar soni olinadi.
  // Guruh/supergroup uchun (views mavjud emas) bo'sh ro'yxat qaytadi — bu xato
  // emas, shunchaki post-darajasidagi statistika yo'q degani.

  async syncTelegramPosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.platformUsername) return;

    const posts = await this.telegramMtproto.getChannelPosts(
      conn.platformUsername,
      30,
    );
    if (posts === null) return; // MTProto sozlanmagan yoki xato — jimgina o'tkazib yuborish

    for (const post of posts) {
      await this.prisma.postStat.upsert({
        where: {
          connectionId_postId: { connectionId, postId: String(post.id) },
        },
        create: {
          connectionId,
          platform: Platform.TELEGRAM,
          postId: String(post.id),
          caption: post.text,
          url: `https://t.me/${conn.platformUsername}/${post.id}`,
          publishedAt: post.date,
          views: post.views,
          shares: post.forwards,
        },
        update: {
          caption: post.text,
          views: post.views,
          shares: post.forwards,
          syncedAt: new Date(),
        },
      });
    }
    if (posts.length) {
      this.logger.log(
        `Telegram: ${posts.length} post sinxronlandi (conn: ${connectionId})`,
      );

      // Bot API'da kanal darajasidagi umumiy ko'rishlar tushunchasi yo'q —
      // shuning uchun sinxronlangan postlarning ko'rishlar yig'indisini
      // kunlik PlatformStat.views'ga yozamiz (aks holda "Ko'rishlar" karta
      // MTProto sozlangan bo'lsa ham doim "—" ko'rsatib turaverardi).
      const { _sum } = await this.prisma.postStat.aggregate({
        where: { connectionId, platform: Platform.TELEGRAM },
        _sum: { views: true },
      });
      const today = todayUtcDate();
      const { count } = await this.prisma.platformStat.updateMany({
        where: { connectionId, date: today },
        data: { views: _sum.views ?? 0 },
      });
      // updateMany hech narsa topmasa jimgina 0 qatorni yangilaydi — bu
      // TelegramService.fetchAndSaveStats() shu kunlik qatorni hali
      // yaratmagani (sync.service.ts'dagi chaqiruv tartibiga bog'liqlik)
      // degani. Xato emas, lekin ko'rinmas bo'lib qolmasligi uchun log.
      if (count === 0) {
        this.logger.warn(
          `Telegram: kunlik PlatformStat qatori topilmadi, views yangilanmadi (conn: ${connectionId}) — fetchAndSaveStats oldin chaqirilganiga ishonch hosil qiling`,
        );
      }
    }
  }

  // ─── Bluesky post stats ───────────────────────────────────────────────────

  async syncBlueskyPosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn?.accessToken || !conn?.platformUserId) return;

    try {
      const res = await axios.get<BlueskyFeedResponse>(
        'https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed',
        {
          params: { actor: conn.platformUserId, limit: 50 },
          headers: { Authorization: `Bearer ${decrypt(conn.accessToken)}` },
        },
      );

      for (const item of res.data.feed || []) {
        const post = item.post;
        if (!post) continue;
        const record = post.record;
        const postId = post.uri;

        await this.prisma.postStat.upsert({
          where: { connectionId_postId: { connectionId, postId } },
          create: {
            connectionId,
            platform: Platform.BLUESKY,
            postId,
            caption: record?.text?.slice(0, 500),
            publishedAt: record?.createdAt
              ? new Date(record.createdAt)
              : new Date(),
            likes: post.likeCount || 0,
            comments: post.replyCount || 0,
            shares: post.repostCount || 0,
            // Bluesky ochiq API'sida ko'rishlar/impressions tushunchasi yo'q —
            // soxta qiymat yozish o'rniga honest "mavjud emas" holati saqlanadi.
            views: null,
            raw: post as unknown as Prisma.InputJsonValue,
          },
          update: {
            likes: post.likeCount || 0,
            comments: post.replyCount || 0,
            shares: post.repostCount || 0,
            syncedAt: new Date(),
            raw: post as unknown as Prisma.InputJsonValue,
          },
        });
      }
      this.logger.log(`Bluesky: ${res.data.feed?.length || 0} post synced`);
    } catch (err: unknown) {
      this.logger.error(`Bluesky post sync error: ${getErrorMessage(err)}`);
    }
  }
}
