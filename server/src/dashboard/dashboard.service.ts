import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, period: 'today' | 'week' | 'month' = 'week') {
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const prevFrom = new Date(from);
    if (period === 'today') prevFrom.setDate(prevFrom.getDate() - 1);
    else if (period === 'week') prevFrom.setDate(prevFrom.getDate() - 7);
    else prevFrom.setDate(prevFrom.getDate() - 30);

    const [connections, websites] = await Promise.all([
      this.prisma.connection.findMany({
        where: { userId, isActive: true },
        include: {
          stats: {
            orderBy: { date: 'desc' },
            take: 2,
            select: { followers: true, views: true, likes: true, comments: true, engagement: true, date: true, growth: true },
          },
        },
      }),
      this.prisma.website.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          domain: true,
          trackingKey: true,
          _count: {
            select: {
              pageViews: { where: { createdAt: { gte: from } } },
            },
          },
        },
      }),
    ]);

    const platformWidgets = connections.map((conn) => {
      const latest = conn.stats[0];
      const prev = conn.stats[1];
      const growth =
        latest && prev && prev.followers
          ? (((latest.followers! - prev.followers!) / prev.followers!) * 100).toFixed(1)
          : null;

      return {
        platform: conn.platform,
        username: conn.platformUsername,
        followers: latest?.followers ?? null,
        views: latest?.views ?? null,
        likes: latest?.likes ?? null,
        comments: latest?.comments ?? null,
        engagement: latest?.engagement ?? null,
        growth: growth ? parseFloat(growth) : null,
        lastSync: latest?.date ?? null,
      };
    });

    // Top pages per website (max 5 each)
    const websiteIds = websites.map((w) => w.id);
    const allPageGroups = websiteIds.length
      ? await this.prisma.pageView.groupBy({
          by: ['websiteId', 'path'],
          where: { websiteId: { in: websiteIds }, createdAt: { gte: from } },
          _count: { path: true },
          orderBy: { _count: { path: 'desc' } },
        })
      : [];

    const topPagesMap: Record<string, { path: string; views: number }[]> = {};
    for (const row of allPageGroups) {
      const list = topPagesMap[row.websiteId] ?? [];
      if (list.length < 5) {
        list.push({ path: row.path, views: row._count.path });
        topPagesMap[row.websiteId] = list;
      }
    }

    const webWidgets = websites.map((site) => ({
      id: site.id,
      name: site.name,
      domain: site.domain,
      views: site._count.pageViews,
      topPages: topPagesMap[site.id] ?? [],
    }));

    return {
      period,
      platforms: platformWidgets,
      websites: webWidgets,
      summary: {
        totalPlatforms: connections.length,
        totalWebsites: websites.length,
        totalWebViews: webWidgets.reduce((sum, w) => sum + w.views, 0),
      },
    };
  }

  async getWebViewsTrend(userId: string, days = 14) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const websites = await this.prisma.website.findMany({
      where: { userId },
      select: { id: true },
    });
    if (!websites.length) return [];

    const ids = websites.map((w) => w.id);

    const rows = await this.prisma.$queryRaw<{ date: string; views: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as views
      FROM page_views
      WHERE "websiteId" = ANY(${ids}::uuid[])
        AND "createdAt" >= ${from}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return rows.map((r) => ({
      date: String(r.date).slice(0, 10),
      views: Number(r.views),
    }));
  }

  async getPlatformHistory(userId: string, platform: string, days = 30) {
    const conn = await this.prisma.connection.findFirst({
      where: { userId, platform: platform as any, isActive: true },
    });
    if (!conn) return null;

    const from = new Date();
    from.setDate(from.getDate() - days);

    const stats = await this.prisma.platformStat.findMany({
      where: { connectionId: conn.id, date: { gte: from } },
      orderBy: { date: 'asc' },
      select: { date: true, followers: true, views: true, engagement: true },
    });

    return { platform, username: conn.platformUsername, history: stats };
  }
}
