import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebsiteDto } from './dto/create-website.dto';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebsiteDto) {
    return this.prisma.website.create({
      data: { userId, name: dto.name, domain: dto.domain, workspaceId: dto.workspaceId || null },
      select: { id: true, name: true, domain: true, trackingKey: true, workspaceId: true, createdAt: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.website.findMany({
      where: { userId },
      select: {
        id: true, name: true, domain: true, trackingKey: true, createdAt: true,
        _count: { select: { pageViews: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const website = await this.prisma.website.findUnique({ where: { id } });
    if (!website) throw new NotFoundException('Website not found');
    if (website.userId !== userId) throw new ForbiddenException();
    return website;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.website.delete({ where: { id } });
  }

  async getScript(userId: string, id: string) {
    const website = await this.findOne(userId, id);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return {
      script: `<script src="${appUrl}/track.js" data-site="${website.trackingKey}" defer></script>`,
      trackingKey: website.trackingKey,
    };
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  private getDateRange(period: Period) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(now.getDate() - 7);
    else from.setDate(now.getDate() - 30);

    const prevFrom = new Date(from);
    if (period === 'today') prevFrom.setDate(prevFrom.getDate() - 1);
    else if (period === 'week') prevFrom.setDate(prevFrom.getDate() - 7);
    else prevFrom.setDate(prevFrom.getDate() - 30);

    return { from, prevFrom, to: now };
  }

  // To'liq overview
  async getAnalytics(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from, prevFrom } = this.getDateRange(period);

    const [pageViews, prevPageViews, sessions, prevSessions] = await Promise.all([
      this.prisma.pageView.count({ where: { websiteId: id, createdAt: { gte: from } } }),
      this.prisma.pageView.count({ where: { websiteId: id, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.session.findMany({
        where: { websiteId: id, startedAt: { gte: from } },
        select: { duration: true, bounced: true },
      }),
      this.prisma.session.count({ where: { websiteId: id, startedAt: { gte: prevFrom, lt: from } } }),
    ]);

    const visitors = sessions.length;
    const bouncedSessions = sessions.filter((s) => s.bounced).length;
    const avgDuration = visitors
      ? Math.round(sessions.reduce((s, x) => s + x.duration, 0) / visitors)
      : 0;

    const pageViewChange = prevPageViews ? +(((pageViews - prevPageViews) / prevPageViews) * 100).toFixed(1) : 0;
    const visitorChange = prevSessions ? +(((visitors - prevSessions) / prevSessions) * 100).toFixed(1) : 0;

    return {
      visitors,
      pageViews,
      bounceRate: visitors ? +(bouncedSessions / visitors * 100).toFixed(1) : 0,
      avgDuration,
      visitorChange,
      pageViewChange,
    };
  }

  // Daily trend: visitors + pageviews per day
  async getTrend(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const rows = await this.prisma.$queryRaw<
      { date: string; visitors: bigint; views: bigint }[]
    >`
      SELECT
        DATE(pv."createdAt") as date,
        COUNT(DISTINCT s.fingerprint) as visitors,
        COUNT(pv.id) as views
      FROM page_views pv
      LEFT JOIN sessions s ON s.id = pv."sessionId"
      WHERE pv."websiteId" = ${id}::uuid
        AND pv."createdAt" >= ${from}
      GROUP BY DATE(pv."createdAt")
      ORDER BY date ASC
    `;

    return rows.map((r) => ({
      date: String(r.date).slice(0, 10),
      visitors: Number(r.visitors),
      views: Number(r.views),
    }));
  }

  // Top pages + entry/exit breakdown
  async getPages(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const [pages, sessionPairs, entryPages, exitPages] = await Promise.all([
      // All pages — top 20 by views
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId: id, createdAt: { gte: from } },
        _count: { path: true },
        _avg: { scrollDepth: true },
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
      // Unique visitors per page
      this.prisma.pageView.findMany({
        where: { websiteId: id, createdAt: { gte: from }, sessionId: { not: null } },
        select: { path: true, sessionId: true },
        distinct: ['path', 'sessionId'],
      }),
      // Entry pages (isEntry = true)
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId: id, createdAt: { gte: from }, isEntry: true },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
      // Exit pages (isExit = true) + total views per path for exit rate
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId: id, createdAt: { gte: from }, isExit: true },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
    ]);

    // Unique visitors map
    const uniqueMap = new Map<string, number>();
    for (const { path } of sessionPairs) {
      uniqueMap.set(path, (uniqueMap.get(path) ?? 0) + 1);
    }

    // Total views per path (for exit rate calculation)
    const totalViewsMap = new Map(pages.map((p) => [p.path, p._count.path]));

    return {
      pages: pages.map((p) => ({
        path: p.path,
        views: p._count.path,
        uniqueVisitors: uniqueMap.get(p.path) ?? 0,
        avgScrollDepth: p._avg.scrollDepth !== null ? Math.round(p._avg.scrollDepth ?? 0) : null,
      })),
      entryPages: entryPages.map((p) => ({
        path: p.path,
        entries: p._count.path,
      })),
      exitPages: exitPages.map((p) => {
        const total = totalViewsMap.get(p.path) ?? p._count.path;
        return {
          path: p.path,
          exits: p._count.path,
          exitRate: +((p._count.path / total) * 100).toFixed(1),
        };
      }),
    };
  }

  // Sessions: bounce rate, avg duration trend
  async getSessions(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const sessions = await this.prisma.session.findMany({
      where: { websiteId: id, startedAt: { gte: from } },
      select: {
        startedAt: true, duration: true, bounced: true,
        pageCount: true, device: true, browser: true, country: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 1000,
    });

    const total = sessions.length;
    const bounced = sessions.filter((s) => s.bounced).length;
    const avgDur = total ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / total) : 0;

    const deviceMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    for (const s of sessions) {
      const d = s.device || 'unknown';
      const b = s.browser || 'unknown';
      const c = s.country || 'unknown';
      deviceMap[d] = (deviceMap[d] || 0) + 1;
      browserMap[b] = (browserMap[b] || 0) + 1;
      countryMap[c] = (countryMap[c] || 0) + 1;
    }

    const toList = (map: Record<string, number>, limit = 10) =>
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({
          name,
          count,
          percentage: total ? +((count / total) * 100).toFixed(1) : 0,
        }));

    return {
      total,
      bounceRate: total ? +(bounced / total * 100).toFixed(1) : 0,
      avgDuration: avgDur,
      devices:   toList(deviceMap, 10),
      browsers:  toList(browserMap, 10),
      countries: toList(countryMap, 15),
    };
  }

  // Traffic sources + UTM campaigns
  async getSources(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const [totalSessions, directCount, referrers, utmSessions] = await Promise.all([
      this.prisma.session.count({
        where: { websiteId: id, startedAt: { gte: from } },
      }),
      this.prisma.session.count({
        where: { websiteId: id, startedAt: { gte: from }, referrer: null, utmSource: null },
      }),
      this.prisma.session.groupBy({
        by: ['referrer'],
        where: { websiteId: id, startedAt: { gte: from }, referrer: { not: null }, utmSource: null },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 15,
      }),
      // UTM sessions — group by source+medium+campaign
      this.prisma.session.groupBy({
        by: ['utmSource', 'utmMedium', 'utmCampaign'],
        where: { websiteId: id, startedAt: { gte: from }, utmSource: { not: null } },
        _count: { utmSource: true },
        orderBy: { _count: { utmSource: 'desc' } },
        take: 20,
      }),
    ]);

    const total = totalSessions || 1;

    const toRef = (visitors: number) => ({
      visitors,
      percentage: +((visitors / total) * 100).toFixed(1),
    });

    const referrerList = [
      { source: 'direct', ...toRef(directCount) },
      ...referrers
        .filter((r) => r._count.referrer > 0)
        .map((r) => ({ source: r.referrer as string, ...toRef(r._count.referrer) })),
    ].filter((s) => s.visitors > 0);

    const campaignList = utmSessions
      .filter((u) => u._count.utmSource > 0)
      .map((u) => ({
        source:   u.utmSource   ?? '',
        medium:   u.utmMedium   ?? '',
        campaign: u.utmCampaign ?? '',
        visitors: u._count.utmSource,
        percentage: +((u._count.utmSource / total) * 100).toFixed(1),
      }));

    return { referrers: referrerList, campaigns: campaignList };
  }

  // Real-time: oxirgi 30 daqiqadagi faol sessionlar
  async getRealtime(userId: string, id: string) {
    await this.findOne(userId, id);
    const since = new Date(Date.now() - 30 * 60 * 1000);

    const [activeSessions, recentViews] = await Promise.all([
      this.prisma.session.count({
        where: { websiteId: id, lastSeenAt: { gte: since } },
      }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { websiteId: id, createdAt: { gte: since } },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      activeVisitors: activeSessions,
      topPages: recentViews.map((v) => ({ path: v.path, views: v._count.path })),
      since: since.toISOString(),
    };
  }
}
