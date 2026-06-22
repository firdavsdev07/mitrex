import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CSV helpers ──────────────────────────────────────────────────────────

  private toCSV(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
        }).join(','),
      ),
    ];
    return lines.join('\n');
  }

  // ─── Website page views CSV ───────────────────────────────────────────────

  async exportWebsitePageviews(userId: string, websiteId: string, period: 'week' | 'month' | 'all' = 'month') {
    const website = await this.prisma.website.findFirst({ where: { id: websiteId, userId } });
    if (!website) throw new NotFoundException('Website not found');

    const from = new Date();
    if (period === 'week') from.setDate(from.getDate() - 7);
    else if (period === 'month') from.setDate(from.getDate() - 30);
    else from.setFullYear(2000);

    const views = await this.prisma.pageView.findMany({
      where: { websiteId, createdAt: { gte: from } },
      select: { path: true, referrer: true, device: true, browser: true, country: true, duration: true, scrollDepth: true, utmSource: true, utmMedium: true, utmCampaign: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50000,
    });

    return this.toCSV(views.map((v) => ({
      timestamp: v.createdAt.toISOString(),
      path: v.path,
      referrer: v.referrer || '',
      device: v.device || '',
      browser: v.browser || '',
      country: v.country || '',
      duration_sec: v.duration || 0,
      scroll_depth_pct: v.scrollDepth || 0,
      utm_source: v.utmSource || '',
      utm_medium: v.utmMedium || '',
      utm_campaign: v.utmCampaign || '',
    })));
  }

  // ─── Platform stats CSV ───────────────────────────────────────────────────

  async exportPlatformStats(userId: string, platform: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { userId, platform: platform as any, isActive: true },
    });
    if (!conn) throw new NotFoundException('Platform connection not found');

    const stats = await this.prisma.platformStat.findMany({
      where: { connectionId: conn.id },
      orderBy: { date: 'asc' },
      select: { date: true, followers: true, views: true, likes: true, comments: true, engagement: true, growth: true },
    });

    return this.toCSV(stats.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      followers: s.followers ?? '',
      views: s.views ?? '',
      likes: s.likes ?? '',
      comments: s.comments ?? '',
      engagement: s.engagement ?? '',
      growth_pct: s.growth ?? '',
    })));
  }

  // ─── GDPR: full user data export (JSON) ──────────────────────────────────

  async exportUserData(userId: string) {
    const [user, websites, connections, subscriptions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, provider: true, createdAt: true },
      }),
      this.prisma.website.findMany({
        where: { userId },
        select: { id: true, name: true, domain: true, trackingKey: true, createdAt: true },
      }),
      this.prisma.connection.findMany({
        where: { userId },
        select: { platform: true, platformUsername: true, isActive: true, createdAt: true },
      }),
      (this.prisma as any).userSubscription.findUnique({
        where: { userId },
        include: { plan: { select: { name: true, slug: true } } },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user,
      websites,
      connectedPlatforms: connections,
      subscription: subscriptions || null,
    };
  }

  // ─── Posts CSV ────────────────────────────────────────────────────────────

  async exportPosts(userId: string, platform: string) {
    const conn = await this.prisma.connection.findFirst({
      where: { userId, platform: platform as any, isActive: true },
    });
    if (!conn) throw new NotFoundException('Platform connection not found');

    const posts = await this.prisma.postStat.findMany({
      where: { connectionId: conn.id },
      orderBy: { publishedAt: 'desc' },
      select: { postId: true, title: true, publishedAt: true, views: true, likes: true, dislikes: true, comments: true, shares: true, reach: true, impressions: true, engagementRate: true, url: true },
    });

    return this.toCSV(posts.map((p) => ({
      post_id: p.postId,
      title: p.title || '',
      published_at: p.publishedAt?.toISOString().split('T')[0] || '',
      views: p.views ?? '',
      likes: p.likes ?? '',
      dislikes: p.dislikes ?? '',
      comments: p.comments ?? '',
      shares: p.shares ?? '',
      reach: p.reach ?? '',
      impressions: p.impressions ?? '',
      engagement_rate: p.engagementRate ?? '',
      url: p.url || '',
    })));
  }
}
