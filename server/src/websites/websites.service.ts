import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { assertWithinPlanLimitTx } from '../common/utils/plan.util';

type Period = 'today' | 'week' | 'month';

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebsiteDto) {
    if (dto.workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: dto.workspaceId, userId } },
      });
      if (!member)
        throw new ForbiddenException('You are not a member of this workspace');
    }
    // PlanGuard so'rov boshida tekshirgan, lekin bu — check-then-act, parallel
    // so'rovlarda limitdan oshib ketish mumkin. Shu sababli yaratish
    // paytida ham, bitta tranzaksiya + advisory lock ichida qayta tekshiramiz.
    return this.prisma.$transaction(async (tx) => {
      await assertWithinPlanLimitTx(tx, userId, 'websites');
      return tx.website.create({
        data: {
          userId,
          name: dto.name,
          domain: dto.domain,
          workspaceId: dto.workspaceId || null,
        },
        select: {
          id: true,
          name: true,
          domain: true,
          trackingKey: true,
          workspaceId: true,
          createdAt: true,
        },
      });
    });
  }

  async findAll(userId: string) {
    // O'z saytlari + workspace orqali ulashilgan saytlar
    return this.prisma.website.findMany({
      where: {
        OR: [{ userId }, { workspace: { members: { some: { userId } } } }],
      },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        name: true,
        domain: true,
        trackingKey: true,
        shareId: true,
        createdAt: true,
        _count: { select: { pageViews: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // O'qish uchun ruxsat: sayt egasi YOKI sayt workspace'ga tegishli bo'lsa —
  // o'sha workspace a'zosi
  async findOne(userId: string, id: string) {
    const website = await this.prisma.website.findUnique({ where: { id } });
    if (!website) throw new NotFoundException('Website not found');
    if (website.userId === userId) return website;

    if (website.workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: website.workspaceId, userId },
        },
      });
      if (member) return website;
    }
    throw new ForbiddenException();
  }

  // O'zgartirish (o'chirish/share) faqat egasiga ruxsat
  private async findOwned(userId: string, id: string) {
    const website = await this.prisma.website.findUnique({ where: { id } });
    if (!website) throw new NotFoundException('Website not found');
    if (website.userId !== userId) throw new ForbiddenException();
    return website;
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.website.delete({ where: { id } });
  }

  async updateWorkspace(
    userId: string,
    id: string,
    workspaceId: string | null,
  ) {
    await this.findOwned(userId, id);
    if (workspaceId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (!member) {
        throw new ForbiddenException('You are not a member of this workspace');
      }
    }
    return this.prisma.website.update({
      where: { id },
      data: { workspaceId },
    });
  }

  // ─── Public dashboard havolasi ─────────────────────────────────────────────

  async enableShare(userId: string, id: string) {
    const website = await this.findOwned(userId, id);
    if (website.shareId) return { shareId: website.shareId };

    const shareId = crypto.randomBytes(8).toString('hex');
    await this.prisma.website.update({ where: { id }, data: { shareId } });
    return { shareId };
  }

  async disableShare(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.website.update({
      where: { id },
      data: { shareId: null },
    });
    return { disabled: true };
  }

  // Auth'siz public snapshot — shareId yoqilgan saytlar uchun
  async getPublicSnapshot(shareId: string, period: Period = 'week') {
    const website = await this.prisma.website.findUnique({
      where: { shareId },
      select: { id: true, name: true, domain: true },
    });
    if (!website) throw new NotFoundException('Dashboard not found');

    const [overview, trend, pages] = await Promise.all([
      this.computeOverview(website.id, period),
      this.computeTrend(website.id, period),
      this.computeTopPages(website.id, period, 10),
    ]);

    return {
      website: { name: website.name, domain: website.domain },
      period,
      overview,
      trend,
      topPages: pages,
    };
  }

  async getScript(userId: string, id: string) {
    const website = await this.findOne(userId, id);
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
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
    return this.computeOverview(id, period);
  }

  private async computeOverview(id: string, period: Period) {
    const { from, prevFrom } = this.getDateRange(period);

    const [pageViews, prevPageViews, sessions, prevSessions] =
      await Promise.all([
        this.prisma.pageView.count({
          where: { websiteId: id, createdAt: { gte: from } },
        }),
        this.prisma.pageView.count({
          where: { websiteId: id, createdAt: { gte: prevFrom, lt: from } },
        }),
        this.prisma.session.findMany({
          where: { websiteId: id, startedAt: { gte: from } },
          select: { duration: true, bounced: true },
        }),
        this.prisma.session.count({
          where: { websiteId: id, startedAt: { gte: prevFrom, lt: from } },
        }),
      ]);

    const visitors = sessions.length;
    const bouncedSessions = sessions.filter((s) => s.bounced).length;
    const avgDuration = visitors
      ? Math.round(sessions.reduce((s, x) => s + x.duration, 0) / visitors)
      : 0;

    const pageViewChange = prevPageViews
      ? +(((pageViews - prevPageViews) / prevPageViews) * 100).toFixed(1)
      : 0;
    const visitorChange = prevSessions
      ? +(((visitors - prevSessions) / prevSessions) * 100).toFixed(1)
      : 0;

    return {
      visitors,
      pageViews,
      bounceRate: visitors
        ? +((bouncedSessions / visitors) * 100).toFixed(1)
        : 0,
      avgDuration,
      visitorChange,
      pageViewChange,
    };
  }

  // Daily trend: visitors + pageviews per day
  async getTrend(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    return this.computeTrend(id, period);
  }

  private async computeTrend(id: string, period: Period) {
    const { from } = this.getDateRange(period);

    // TO_CHAR bilan to'g'ridan-to'g'ri ISO satr sifatida qaytariladi — aks
    // holda pg driver DATE ustunini JS Date obyektiga aylantiradi va
    // String(date) "Wed Jul 15" kabi weekday-prefiksli formatga tushib
    // qolardi (ISO emas), bu esa frontend'dagi `new Date(iso)` parsingini
    // buzardi (yil yo'q — Invalid Date) va trend grafigi umuman
    // chizilmasdi. (dashboard.service.ts#getWebViewsTrend'da xuddi shu
    // bug avval tuzatilgan edi, bu yerga tatbiq etilmagan ekan.)
    const rows = await this.prisma.$queryRaw<
      { date: string; visitors: bigint; views: bigint }[]
    >`
      SELECT
        TO_CHAR(DATE(pv."createdAt"), 'YYYY-MM-DD') as date,
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
      date: r.date,
      visitors: Number(r.visitors),
      views: Number(r.views),
    }));
  }

  // Top N sahifalar — public snapshot uchun yengil versiya (entry/exit'siz)
  private async computeTopPages(id: string, period: Period, limit: number) {
    const { from } = this.getDateRange(period);
    const pages = await this.prisma.pageView.groupBy({
      by: ['path'],
      where: { websiteId: id, createdAt: { gte: from } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: limit,
    });
    return pages.map((p) => ({ path: p.path, views: p._count.path }));
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
        where: {
          websiteId: id,
          createdAt: { gte: from },
          sessionId: { not: null },
        },
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
        avgScrollDepth:
          p._avg.scrollDepth !== null
            ? Math.round(p._avg.scrollDepth ?? 0)
            : null,
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
        startedAt: true,
        duration: true,
        bounced: true,
        pageCount: true,
        device: true,
        browser: true,
        country: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 1000,
    });

    const total = sessions.length;
    const bounced = sessions.filter((s) => s.bounced).length;
    const avgDur = total
      ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / total)
      : 0;

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
      bounceRate: total ? +((bounced / total) * 100).toFixed(1) : 0,
      avgDuration: avgDur,
      devices: toList(deviceMap, 10),
      browsers: toList(browserMap, 10),
      countries: toList(countryMap, 15),
    };
  }

  // Traffic sources + UTM campaigns
  async getSources(userId: string, id: string, period: Period = 'week') {
    await this.findOne(userId, id);
    const { from } = this.getDateRange(period);

    const [totalSessions, directCount, referrers, utmSessions] =
      await Promise.all([
        this.prisma.session.count({
          where: { websiteId: id, startedAt: { gte: from } },
        }),
        this.prisma.session.count({
          where: {
            websiteId: id,
            startedAt: { gte: from },
            referrer: null,
            utmSource: null,
          },
        }),
        this.prisma.session.groupBy({
          by: ['referrer'],
          where: {
            websiteId: id,
            startedAt: { gte: from },
            referrer: { not: null },
            utmSource: null,
          },
          _count: { referrer: true },
          orderBy: { _count: { referrer: 'desc' } },
          take: 15,
        }),
        // UTM sessions — group by source+medium+campaign
        this.prisma.session.groupBy({
          by: ['utmSource', 'utmMedium', 'utmCampaign'],
          where: {
            websiteId: id,
            startedAt: { gte: from },
            utmSource: { not: null },
          },
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
        .map((r) => ({
          source: r.referrer as string,
          ...toRef(r._count.referrer),
        })),
    ].filter((s) => s.visitors > 0);

    const campaignList = utmSessions
      .filter((u) => u._count.utmSource > 0)
      .map((u) => ({
        source: u.utmSource ?? '',
        medium: u.utmMedium ?? '',
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
      topPages: recentViews.map((v) => ({
        path: v.path,
        views: v._count.path,
      })),
      since: since.toISOString(),
    };
  }

  // ─── Funnel: custom eventlar ketma-ketligi bo'yicha konversiya ────────────
  // Bosqichlar tartib bilan ("Signup" → "Add to cart" → "Purchase") beriladi.
  // Har bosqich uchun — oldingi bosqichdan KEYIN shu eventni ham qilgan
  // sessiyalar soni hisoblanadi (sessiya ichidagi vaqt tartibi hurmat qilinadi).
  async getFunnel(
    userId: string,
    id: string,
    steps: string[],
    period: Period = 'week',
  ) {
    await this.findOne(userId, id);
    if (steps.length < 2) {
      throw new BadRequestException(
        "Funnel kamida 2 ta bosqichdan iborat bo'lishi kerak",
      );
    }

    const { from } = this.getDateRange(period);
    const events = await this.prisma.customEvent.findMany({
      where: {
        websiteId: id,
        name: { in: steps },
        sessionId: { not: null },
        createdAt: { gte: from },
      },
      select: { sessionId: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // sessionId → eventName → shu sessiyadagi birinchi marta sodir bo'lgan vaqt
    const bySession = new Map<string, Map<string, Date>>();
    for (const e of events) {
      if (!e.sessionId) continue;
      let m = bySession.get(e.sessionId);
      if (!m) {
        m = new Map();
        bySession.set(e.sessionId, m);
      }
      if (!m.has(e.name)) m.set(e.name, e.createdAt);
    }

    // 1-bosqichni bajargan sessiyalar to'plamidan boshlab, har keyingi
    // bosqichda faqat oldingisidan keyin shu eventni ham qilganlar qoladi
    let cohort = new Set<string>();
    for (const [sid, m] of bySession) {
      if (m.has(steps[0])) cohort.add(sid);
    }

    const result: { step: string; count: number; dropOffPct: number }[] = [];
    const firstCount = cohort.size;
    result.push({ step: steps[0], count: firstCount, dropOffPct: 0 });

    let prevCount = firstCount;
    for (let i = 1; i < steps.length; i++) {
      const next = new Set<string>();
      for (const sid of cohort) {
        const m = bySession.get(sid)!;
        const prevTime = m.get(steps[i - 1]);
        const curTime = m.get(steps[i]);
        if (prevTime && curTime && curTime >= prevTime) next.add(sid);
      }
      cohort = next;
      const dropOffPct = prevCount
        ? +(((prevCount - cohort.size) / prevCount) * 100).toFixed(1)
        : 0;
      result.push({ step: steps[i], count: cohort.size, dropOffPct });
      prevCount = cohort.size;
    }

    return {
      period,
      steps: result,
      overallConversionPct: firstCount
        ? +((prevCount / firstCount) * 100).toFixed(1)
        : 0,
    };
  }
}
