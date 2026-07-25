import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@metrix/prisma-client';
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
      case JOB_TRACK_PAGEVIEW:
        return this.processPageview(job.data);
      case JOB_TRACK_EXIT:
        return this.processExit(job.data);
      case JOB_TRACK_EVENT:
        return this.processCustomEvent(job.data);
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  private async processPageview(data: {
    siteKey: string;
    sessionId: string;
    path: string;
    referrer?: string;
    device?: string;
    browser?: string;
    ip: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const geo = await this.geoip.lookup(data.ip);

    // Haqiqiy upsert — (websiteId, fingerprint) unique constraint tufayli
    // parallel worker'larda ham duplikat sessiya yaratilmaydi
    const session = await this.prisma.session.upsert({
      where: {
        websiteId_fingerprint: {
          websiteId: website.id,
          fingerprint: data.sessionId,
        },
      },
      update: {
        lastSeenAt: new Date(),
        pageCount: { increment: 1 },
        bounced: false,
        exitPage: data.path,
      },
      create: {
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
    siteKey: string;
    sessionId: string;
    path: string;
    duration?: number;
    scrollDepth?: number;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const session = await this.prisma.session.findUnique({
      where: {
        websiteId_fingerprint: {
          websiteId: website.id,
          fingerprint: data.sessionId,
        },
      },
    });
    if (!session) return;

    await this.prisma.session.update({
      where: { id: session.id },
      // increment — SPA'da har sahifadan chiqishda kelgan vaqtlar yig'iladi
      data: {
        duration: { increment: data.duration || 0 },
        exitPage: data.path,
        lastSeenAt: new Date(),
      },
    });

    const lastView = await this.prisma.pageView.findFirst({
      where: { sessionId: session.id, path: data.path },
      orderBy: { createdAt: 'desc' },
    });

    if (lastView) {
      await this.prisma.pageView.update({
        where: { id: lastView.id },
        data: {
          duration: data.duration || 0,
          scrollDepth: data.scrollDepth || 0,
          isExit: true,
        },
      });
    }
  }

  private async processCustomEvent(data: {
    siteKey: string;
    name: string;
    path?: string;
    sessionId?: string;
    properties?: Record<string, any>;
    ip: string;
  }) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: data.siteKey },
      select: { id: true },
    });
    if (!website) return;

    const geo = await this.geoip.lookup(data.ip);

    // Sessiyaga bog'lash — funnel tahlili sessiya bo'yicha ketma-ketlikni talab qiladi
    const session = data.sessionId
      ? await this.prisma.session.findUnique({
          where: {
            websiteId_fingerprint: {
              websiteId: website.id,
              fingerprint: data.sessionId,
            },
          },
          select: { id: true },
        })
      : null;

    await this.prisma.customEvent.create({
      data: {
        websiteId: website.id,
        sessionId: session?.id ?? null,
        name: data.name,
        path: data.path || null,
        properties: data.properties ?? Prisma.DbNull,
        country: geo.country || null,
        ip: data.ip || null,
      },
    });
  }
}
