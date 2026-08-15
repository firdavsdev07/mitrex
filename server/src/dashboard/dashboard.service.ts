import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyWorkspaceAccess(userId: string, workspaceId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  async getOverview(
    userId: string,
    period: 'today' | 'week' | 'month' = 'week',
    workspaceId?: string | null,
  ) {
    if (workspaceId) {
      await this.verifyWorkspaceAccess(userId, workspaceId);
    }

    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const prevFrom = new Date(from);
    if (period === 'today') prevFrom.setDate(prevFrom.getDate() - 1);
    else if (period === 'week') prevFrom.setDate(prevFrom.getDate() - 7);
    else prevFrom.setDate(prevFrom.getDate() - 30);

    const connectionWhere = workspaceId
      ? { workspaceId, isActive: true }
      : { userId, workspaceId: null, isActive: true };

    const websiteWhere = workspaceId
      ? { workspaceId }
      : { userId, workspaceId: null };

    const [connections, websites] = await Promise.all([
      this.prisma.connection.findMany({
        where: connectionWhere,
        include: {
          stats: {
            orderBy: { date: 'desc' },
            take: 2,
            select: {
              followers: true,
              views: true,
              likes: true,
              comments: true,
              engagement: true,
              date: true,
              growth: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.website.findMany({
        where: websiteWhere,
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
          ? (
              ((latest.followers! - prev.followers) / prev.followers) *
              105
            ).toFixed(1)
          : null;

      return {
        id: conn.id,
        platform: conn.platform,
        username: conn.platformUsername,
        followers: latest?.followers ?? null,
        views: latest?.views ?? null,
        likes: latest?.likes ?? null,
        comments: latest?.comments ?? null,
        engagement: latest?.engagement ?? null,
        growth: growth ? parseFloat(growth) : null,
        lastSync: latest?.updatedAt ?? null,
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

  async getWebViewsTrend(
    userId: string,
    days = 14,
    workspaceId?: string | null,
  ) {
    if (workspaceId) {
      await this.verifyWorkspaceAccess(userId, workspaceId);
    }

    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const websiteWhere = workspaceId
      ? { workspaceId }
      : { userId, workspaceId: null };

    const websites = await this.prisma.website.findMany({
      where: websiteWhere,
      select: { id: true },
    });
    if (!websites.length) return [];

    const ids = websites.map((w) => w.id);

    const rows = await this.prisma.$queryRaw<{ date: string; views: bigint }[]>`
      SELECT TO_CHAR(DATE("createdAt"), 'YYYY-MM-DD') as date, COUNT(*) as views
      FROM page_views
      WHERE "websiteId" = ANY(${ids}::uuid[])
        AND "createdAt" >= ${from}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return rows.map((r) => ({
      date: r.date,
      views: Number(r.views),
    }));
  }

  async getConnectionHistory(userId: string, connectionId: string, days = 30) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn) return null;

    if (conn.userId !== userId) {
      if (conn.workspaceId) {
        await this.verifyWorkspaceAccess(userId, conn.workspaceId);
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    const from = new Date();
    from.setDate(from.getDate() - days);

    const stats = await this.prisma.platformStat.findMany({
      where: { connectionId: conn.id, date: { gte: from } },
      orderBy: { date: 'asc' },
      select: { date: true, followers: true, views: true, engagement: true },
    });

    return {
      platform: conn.platform,
      username: conn.platformUsername,
      history: stats,
    };
  }
}
