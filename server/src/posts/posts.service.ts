import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get posts list ──────────────────────────────────────────────────────

  async getPosts(userId: string, platform: Platform, limit = 20, offset = 0) {
    const conn = await this.prisma.connection.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!conn) return { posts: [], total: 0 };

    const [posts, total] = await Promise.all([
      this.prisma.postStat.findMany({
        where: { connectionId: conn.id },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.postStat.count({ where: { connectionId: conn.id } }),
    ]);

    return { posts, total, platform, username: conn.platformUsername };
  }

  async getTopPosts(userId: string, platform: Platform, metric: 'views' | 'likes' | 'comments' | 'engagementRate' = 'views') {
    const conn = await this.prisma.connection.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!conn) return [];

    return this.prisma.postStat.findMany({
      where: { connectionId: conn.id },
      orderBy: { [metric]: 'desc' },
      take: 10,
    });
  }

  // ─── YouTube video stats ─────────────────────────────────────────────────

  async syncYoutubePosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.accessToken) return;

    let token = conn.accessToken;
    // Refresh token if expired
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date() && conn.refreshToken) {
      token = await this.refreshYoutubeToken(connectionId, conn.refreshToken);
    }

    try {
      // Fetching channel videos
      const listRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          forMine: true,
          type: 'video',
          maxResults: 50,
          order: 'date',
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const videos = listRes.data.items || [];
      if (!videos.length) return;

      const videoIds = videos.map((v: any) => v.id.videoId).join(',');

      // Fetching video stats
      const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: { part: 'statistics,snippet', id: videoIds },
        headers: { Authorization: `Bearer ${token}` },
      });

      for (const video of statsRes.data.items || []) {
        const s = video.statistics;
        const sn = video.snippet;
        await this.prisma.postStat.upsert({
          where: { connectionId_postId: { connectionId, postId: video.id } },
          create: {
            connectionId,
            platform: Platform.YOUTUBE,
            postId: video.id,
            title: sn.title,
            thumbnailUrl: sn.thumbnails?.medium?.url,
            url: `https://youtube.com/watch?v=${video.id}`,
            publishedAt: new Date(sn.publishedAt),
            views: parseInt(s.viewCount || '0'),
            likes: parseInt(s.likeCount || '0'),
            comments: parseInt(s.commentCount || '0'),
            raw: video,
          },
          update: {
            views: parseInt(s.viewCount || '0'),
            likes: parseInt(s.likeCount || '0'),
            comments: parseInt(s.commentCount || '0'),
            raw: video,
            syncedAt: new Date(),
          },
        });
      }
      this.logger.log(`YouTube: ${statsRes.data.items?.length || 0} videos synced (conn: ${connectionId})`);
    } catch (err) {
      this.logger.error(`YouTube post sync error: ${err.message}`);
    }
  }

  // ─── Telegram post stats ──────────────────────────────────────────────────

  async syncTelegramPosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.platformUserId) return;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      // Fetching recent channel messages
      const res = await axios.get(
        `https://api.telegram.org/bot${botToken}/getHistory`,
        { params: { chat_id: conn.platformUserId, limit: 50 } }
      ).catch(() => null);

      // getHistory not available (Telegram Bot API limitation)
      // Using getChat and getChatMemberCount instead
      // Post stats require a separate API
      this.logger.log(`Telegram post stats: Bot API has no post history, using channel stats`);
    } catch (err) {
      this.logger.error(`Telegram post sync error: ${err.message}`);
    }
  }

  // ─── Bluesky post stats ───────────────────────────────────────────────────

  async syncBlueskyPosts(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.accessToken || !conn?.platformUserId) return;

    try {
      const res = await axios.get('https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed', {
        params: { actor: conn.platformUserId, limit: 50 },
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });

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
            publishedAt: record?.createdAt ? new Date(record.createdAt) : new Date(),
            likes: post.likeCount || 0,
            comments: post.replyCount || 0,
            shares: post.repostCount || 0,
            views: post.indexedAt ? 1 : 0,
            raw: post,
          },
          update: {
            likes: post.likeCount || 0,
            comments: post.replyCount || 0,
            shares: post.repostCount || 0,
            syncedAt: new Date(),
            raw: post,
          },
        });
      }
      this.logger.log(`Bluesky: ${res.data.feed?.length || 0} post synced`);
    } catch (err) {
      this.logger.error(`Bluesky post sync error: ${err.message}`);
    }
  }

  private async refreshYoutubeToken(connectionId: string, refreshToken: string): Promise<string> {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const { access_token, expires_in } = res.data;
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: { accessToken: access_token, tokenExpiresAt: new Date(Date.now() + expires_in * 1000) },
    });
    return access_token;
  }
}
