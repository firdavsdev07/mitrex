import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebsiteDto } from './dto/create-website.dto';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebsiteDto) {
    return this.prisma.website.create({
      data: { userId, name: dto.name, domain: dto.domain },
      select: { id: true, name: true, domain: true, trackingKey: true, createdAt: true },
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

    const [views, prevViews, sessions, prevSessions] = await Promise.all([
      this.prisma.pageView.count({ where: { websiteId: id, createdAt: { gte: from } } }),
      this.prisma.pageView.count({ where: { websiteId: id, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.session.findMany({
        where: { websiteId: id, startedAt: { gte: from } },
        select: { duration: true, bounced: true, pageCount: true },
      }),
      this.prisma.session.count({ where: { websiteId: id, startedAt: { gte: prevFrom, lt: from } } }),
    ]);

    const totalSessions = sessions.length;
    const bouncedSessions = sessions.filter((s) => s.bounced).length;
    const avgDuration = totalSessions
      ? Math.round(sessions.reduce((s, x) => s + x.duration, 0) / totalSessions)
      : 0;
    const avgPageCount = totalSessions
      ? +(sessions.reduce((s, x) => s + x.pageCount, 0) / totalSessions).toFixed(1)
      : 0;

    const viewsGrowth = prevViews ? +(((views - prevViews) / prevViews) * 100).toFixed(1) : null;
    const sessionGrowth = prevSessions ? +(((totalSessions - prevSessions) / prevSessions) * 100).toFixed(1) : null;

    return {
      period,
      views: { total: views, growth: viewsGrowth },
      sessions: { total: totalSessions, growth: sessionGrowth },
      bounceRate: totalSessions ? +(bouncedSessions / totalSessions * 100).toFixed(1) : 0,
      avgSessionDuration: avgDuration,
      avgPagesPerSession: avgPageCount,
    };
  }

  // Top pages + avg time on page
  async getPages(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const pages = await this.prisma.pageView.groupBy({
      by: ['path'],
      where: { websiteId: id, createdAt: { gte: from } },
      _count: { path: true },
      _avg: { duration: true, scrollDepth: true },
      orderBy: { _count: { path: 'desc' } },
      take: 20,
    });

    // Entry pages (birinchi ko'rilgan sahifa)
    const entryPages = await this.prisma.pageView.groupBy({
      by: ['path'],
      where: { websiteId: id, createdAt: { gte: from }, isEntry: true },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 10,
    });

    const entryMap = new Map(entryPages.map((e) => [e.path, e._count.path]));

    return pages.map((p) => ({
      path: p.path,
      views: p._count.path,
      avgDuration: Math.round(p._avg.duration || 0),
      avgScrollDepth: Math.round(p._avg.scrollDepth || 0),
      entries: entryMap.get(p.path) || 0,
    }));
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

    return {
      total,
      bounceRate: total ? +(bounced / total * 100).toFixed(1) : 0,
      avgDuration: avgDur,
      devices: Object.entries(deviceMap).map(([device, count]) => ({ device, count })),
      browsers: Object.entries(browserMap).map(([browser, count]) => ({ browser, count })),
      countries: Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([country, count]) => ({ country, count })),
    };
  }

  // Traffic sources (referrer + UTM)
  async getSources(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const [referrers, utmSources] = await Promise.all([
      this.prisma.session.groupBy({
        by: ['referrer'],
        where: { websiteId: id, startedAt: { gte: from }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 10,
      }),
      this.prisma.session.groupBy({
        by: ['utmSource', 'utmMedium', 'utmCampaign'],
        where: { websiteId: id, startedAt: { gte: from }, utmSource: { not: null } },
        _count: { utmSource: true },
        orderBy: { _count: { utmSource: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      referrers: referrers.map((r) => ({ source: r.referrer, sessions: r._count.referrer })),
      campaigns: utmSources.map((u) => ({
        source: u.utmSource,
        medium: u.utmMedium,
        campaign: u.utmCampaign,
        sessions: u._count.utmSource,
      })),
    };
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
