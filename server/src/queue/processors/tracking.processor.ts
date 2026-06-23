import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoIpService } from '../../common/services/geoip.service';
import {
  QUEUE_TRACKING,
  JOB_TRACK_PAGEVIEW,
  JOB_TRACK_EXIT,
  JOB_TRACK_EVENT,
} from '../queue.constants';

@Processor(QUEUE_TRACKING, { concurrency: 10 })
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoip: GeoIpService,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case JOB_TRACK_PAGEVIEW:  return this.processPageview(job.data);
      case JOB_TRACK_EXIT:      return this.processExit(job.data);
      case JOB_TRACK_EVENT:     return this.processCustomEvent(job.data);
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  private async processPageview(data: {
    siteKey: string; sessionId: string; path: string;
    referrer?: string; device?: string; browser?: string; ip: string;
    utmSource?: string; utmMedium?: string; utmCampaign?: string;
    utmTerm?: string; utmContent?: string;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const geo = await this.geoip.lookup(data.ip);

    const existing = await this.prisma.session.findFirst({
      where: { websiteId: website.id, fingerprint: data.sessionId },
    });

    let session: { id: string; pageCount: number };

    if (existing) {
      session = await this.prisma.session.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), pageCount: { increment: 1 }, bounced: false, exitPage: data.path },
        select: { id: true, pageCount: true },
      });
    } else {
      session = await this.prisma.session.create({
        data: {
          websiteId: website.id,
          fingerprint: data.sessionId,
          entryPage: data.path,
          exitPage: data.path,
          referrer: data.referrer || null,
          utmSource: data.utmSource || null,
          utmMedium: data.utmMedium || null,
          utmCampaign: data.utmCampaign || null,
          utmTerm: data.utmTerm || null,
          utmContent: data.utmContent || null,
          device: data.device || null,
          browser: data.browser || null,
          ip: data.ip || null,
          country: geo.country || null,
        },
        select: { id: true, pageCount: true },
      });
    }

    await this.prisma.pageView.create({
      data: {
        websiteId: website.id,
        sessionId: session.id,
        path: data.path,
        referrer: data.referrer || null,
        device: data.device || null,
        browser: data.browser || null,
        ip: data.ip || null,
        country: geo.country || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        isEntry: session.pageCount <= 1,
      },
    });
  }

  private async processExit(data: {
    siteKey: string; sessionId: string; path: string;
    duration?: number; scrollDepth?: number;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const session = await this.prisma.session.findFirst({
      where: { websiteId: website.id, fingerprint: data.sessionId },
    });
    if (!session) return;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { duration: data.duration || 0, exitPage: data.path, lastSeenAt: new Date() },
    });

    const lastView = await this.prisma.pageView.findFirst({
      where: { sessionId: session.id, path: data.path },
      orderBy: { createdAt: 'desc' },
    });

    if (lastView) {
      await this.prisma.pageView.update({
        where: { id: lastView.id },
        data: { duration: data.duration || 0, scrollDepth: data.scrollDepth || 0, isExit: true },
      });
    }
  }

  private async processCustomEvent(data: {
    siteKey: string; name: string; path?: string;
    properties?: Record<string, any>; ip: string;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const geo = await this.geoip.lookup(data.ip);

    await (this.prisma as any).customEvent.create({
      data: {
        websiteId: website.id,
        name: data.name,
        path: data.path || null,
        properties: data.properties || null,
        country: geo.country || null,
        ip: data.ip || null,
      },
    });
  }
}
