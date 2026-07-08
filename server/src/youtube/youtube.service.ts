import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

const YT_API = 'https://www.googleapis.com/youtube/v3';

@Injectable()
export class YoutubeService {
  private get apiKey() { return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY; }

  constructor(private readonly prisma: PrismaService) {}

  // ─── Handle / URL bo'yicha ulash (OAuth kerak emas) ─────────────────────────

  async connectByHandle(userId: string, handle: string) {
    if (!this.apiKey) throw new BadRequestException('YOUTUBE_API_KEY sozlanmagan');

    // @handle, channel URL yoki channel ID dan tozalash
    const clean = handle
      .trim()
      .replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)?/, '')
      .replace(/^@/, '')
      .replace(/\/$/, '');

    // Avval forHandle bilan qidirish (@username)
    let channel = await this.findByHandle(clean);

    // Topilmasa forUsername bilan
    if (!channel) channel = await this.findByUsername(clean);

    // Topilmasa channelId bilan
    if (!channel) channel = await this.findByChannelId(clean);

    if (!channel) {
      throw new BadRequestException(
        `YouTube kanali topilmadi: "${handle}". Handle (@username), kanal URL yoki kanal ID kiriting.`
      );
    }

    const conn = await this.prisma.connection.upsert({
      where: { userId_platform: { userId, platform: Platform.YOUTUBE } },
      create: {
        userId,
        platform: Platform.YOUTUBE,
        platformUserId: channel.id,
        platformUsername: channel.title,
        isActive: true,
      },
      update: {
        platformUserId: channel.id,
        platformUsername: channel.title,
        isActive: true,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    // Darhol stats saqlash
    await this.saveStats(conn.id, channel.id, channel.stats);

    return { connected: true, channel: channel.title, subscribers: channel.stats.subscriberCount };
  }

  // ─── Stats yangilash (sync) ─────────────────────────────────────────────────

  async fetchAndSaveStats(connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn?.platformUserId) return;

    if (!this.apiKey) return;

    const res = await axios.get(`${YT_API}/channels`, {
      params: { part: 'statistics', id: conn.platformUserId, key: this.apiKey },
    });
    const stats = res.data.items?.[0]?.statistics;
    if (!stats) return;

    await this.saveStats(connectionId, conn.platformUserId, {
      subscriberCount: parseInt(stats.subscriberCount || '0'),
      viewCount: parseInt(stats.viewCount || '0'),
      videoCount: parseInt(stats.videoCount || '0'),
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async findByHandle(handle: string) {
    try {
      const res = await axios.get(`${YT_API}/channels`, {
        params: { part: 'snippet,statistics', forHandle: `@${handle}`, key: this.apiKey },
      });
      return this.parseChannel(res.data.items?.[0]);
    } catch { return null; }
  }

  private async findByUsername(username: string) {
    try {
      const res = await axios.get(`${YT_API}/channels`, {
        params: { part: 'snippet,statistics', forUsername: username, key: this.apiKey },
      });
      return this.parseChannel(res.data.items?.[0]);
    } catch { return null; }
  }

  private async findByChannelId(channelId: string) {
    if (!channelId.startsWith('UC')) return null;
    try {
      const res = await axios.get(`${YT_API}/channels`, {
        params: { part: 'snippet,statistics', id: channelId, key: this.apiKey },
      });
      return this.parseChannel(res.data.items?.[0]);
    } catch { return null; }
  }

  private parseChannel(item: any) {
    if (!item) return null;
    const stats = item.statistics ?? {};
    return {
      id: item.id as string,
      title: item.snippet?.title as string,
      stats: {
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
      },
    };
  }

  private async saveStats(
    connectionId: string,
    _channelId: string,
    stats: { subscriberCount: number; viewCount: number; videoCount: number },
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.platformStat.upsert({
      where: { connectionId_date: { connectionId, date: today } },
      create: { connectionId, date: today, followers: stats.subscriberCount, views: stats.viewCount, raw: stats as any },
      update: { followers: stats.subscriberCount, views: stats.viewCount, raw: stats as any },
    });
  }
}
