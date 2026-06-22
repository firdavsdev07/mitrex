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
            select: { followers: true, views: true, date: true, growth: true },
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
        growth: growth ? parseFloat(growth) : null,
        lastSync: latest?.date ?? null,
      };
    });

    const webWidgets = websites.map((site) => ({
      id: site.id,
      name: site.name,
      domain: site.domain,
      views: site._count.pageViews,
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
