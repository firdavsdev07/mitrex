import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoIpService } from '../common/services/geoip.service';
import { TrackEventDto } from './dto/track-event.dto';
import { CustomEventDto } from './dto/custom-event.dto';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoip: GeoIpService,
  ) {}

  async track(dto: TrackEventDto, ip: string) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: dto.siteKey },
      select: { id: true },
    });
    if (!website) return { ok: false };

    if (dto.isExit) {
      await this.handleExit(dto, website.id);
      return { ok: true };
    }

    // GeoIP lookup (non-blocking)
    const geo = await this.geoip.lookup(ip);

    const session = await this.upsertSession(dto, website.id, ip, geo.country);

    await this.prisma.pageView.create({
      data: {
        websiteId: website.id,
        sessionId: session.id,
        path: dto.path,
        referrer: dto.referrer || null,
        device: dto.device || null,
        browser: dto.browser || null,
        ip: ip || null,
        country: geo.country || null,
        utmSource: dto.utmSource || null,
        utmMedium: dto.utmMedium || null,
        utmCampaign: dto.utmCampaign || null,
        isEntry: session.pageCount === 1,
      },
    });

    return { ok: true, sessionId: session.id };
  }

  private async upsertSession(dto: TrackEventDto, websiteId: string, ip: string, country?: string | null) {
    const existing = await this.prisma.session.findFirst({
      where: { websiteId, fingerprint: dto.sessionId },
    });

    if (existing) {
      return this.prisma.session.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          pageCount: { increment: 1 },
          bounced: false,
          exitPage: dto.path,
        },
      });
    }

    return this.prisma.session.create({
      data: {
        websiteId,
        fingerprint: dto.sessionId,
        entryPage: dto.path,
        exitPage: dto.path,
        referrer: dto.referrer || null,
        utmSource: dto.utmSource || null,
        utmMedium: dto.utmMedium || null,
        utmCampaign: dto.utmCampaign || null,
        utmTerm: dto.utmTerm || null,
        utmContent: dto.utmContent || null,
        device: dto.device || null,
        browser: dto.browser || null,
        country: country || null,
        ip: ip || null,
      },
    });
  }

  private async handleExit(dto: TrackEventDto, websiteId: string) {
    const session = await this.prisma.session.findFirst({
      where: { websiteId, fingerprint: dto.sessionId },
    });
    if (!session) return;

    // Session duration va exit page yangilash
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        duration: dto.duration || 0,
        exitPage: dto.path,
        lastSeenAt: new Date(),
      },
    });

    // Oxirgi pageview ni yangilash (duration + scrollDepth + isExit)
    const lastView = await this.prisma.pageView.findFirst({
      where: { sessionId: session.id, path: dto.path },
      orderBy: { createdAt: 'desc' },
    });

    if (lastView) {
      await this.prisma.pageView.update({
        where: { id: lastView.id },
        data: {
          duration: dto.duration || 0,
          scrollDepth: dto.scrollDepth || 0,
          isExit: true,
        },
      });
    }
  }

  // ─── Custom events ────────────────────────────────────────────────────────

  async trackEvent(dto: CustomEventDto, ip: string) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: dto.siteKey },
      select: { id: true },
    });
    if (!website) return { ok: false };

    const geo = await this.geoip.lookup(ip);

    await (this.prisma as any).customEvent.create({
      data: {
        websiteId: website.id,
        name: dto.name,
        path: dto.path || null,
        properties: dto.properties || null,
        device: null,
        country: geo.country || null,
        ip: ip || null,
      },
    });

    return { ok: true };
  }

  async getEventStats(websiteId: string, period: 'today' | 'week' | 'month' = 'week') {
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const events = await (this.prisma as any).customEvent.groupBy({
      by: ['name'],
      where: { websiteId, createdAt: { gte: from } },
      _count: { name: true },
      orderBy: { _count: { name: 'desc' } },
    });

    return {
      period,
      events: events.map((e: any) => ({ name: e.name, count: e._count.name })),
    };
  }
}
