import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@metrix/prisma-client';
import { getErrorMessage } from '../common/utils/error.util';
import { PrismaService } from '../prisma/prisma.service';
import { GeoIpService } from '../common/services/geoip.service';
import { RedisCacheService } from '../common/services/redis-cache.service';
import { QueueService } from '../queue/queue.service';
import { EmailService } from '../email/email.service';
import { getEffectivePlan } from '../common/utils/plan.util';
import { TrackEventDto } from './dto/track-event.dto';
import { CustomEventDto } from './dto/custom-event.dto';

// Oylik ko'rishlar limiti tekshiruvi natijasi shu muddatga keshlanadi —
// har bir pageview'da COUNT so'rovi yubormaslik uchun. Redis'da saqlanadi
// (in-process Map emas) — bir nechta server nusxasi ishlaganda ham umumiy
// kesh bo'lishi uchun; Redis mavjud bo'lmasa RedisCacheService jimgina
// no-op qiladi (har safar qayta hisoblanadi, funksiya buzilmaydi).
const VIEW_LIMIT_CACHE_TTL_SECONDS = 5 * 60;

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoip: GeoIpService,
    private readonly redisCache: RedisCacheService,
    private readonly email: EmailService,
    @Optional() private readonly queue: QueueService,
  ) {}

  async track(dto: TrackEventDto, ip: string) {
    // Validate site key exists
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: dto.siteKey },
      select: { id: true, userId: true },
    });
    if (!website) return { ok: false };

    // Oylik ko'rishlar limiti — faqat yangi pageview'lar uchun (exit event
    // yangi ko'rish emas, mavjud sessiyani yakunlaydi, shuning uchun o'tkaziladi)
    if (
      !dto.isExit &&
      (await this.isViewLimitExceeded(website.id, website.userId))
    ) {
      return { ok: false, reason: 'monthly view limit reached' };
    }

    // Queue available → async processing (fast response). Navbatga qo'yish
    // muvaffaqiyatsiz bo'lsa (masalan Redis vaqtincha mavjud emas), ochiq,
    // autentifikatsiyasiz tracking snippet uchun 500 qaytarish o'rniga
    // to'g'ridan-to'g'ri DB yozuviga tushamiz — public endpoint hech qachon
    // Redis'ning vaqtinchalik holatiga qarab butunlay ishlamay qolmasligi kerak.
    if (this.queue) {
      try {
        if (dto.isExit) {
          await this.queue.addExitEvent({ ...dto, ip });
        } else {
          await this.queue.addPageview({ ...dto, ip });
        }
        return { ok: true, queued: true };
      } catch (err: unknown) {
        this.logger.warn(
          `Navbatga qo'yib bo'lmadi, to'g'ridan-to'g'ri yozilmoqda: ${getErrorMessage(err)}`,
        );
      }
    }

    // Fallback: direct DB write
    if (dto.isExit) {
      await this.handleExit(dto, website.id);
      return { ok: true };
    }
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
    return { ok: true };
  }

  async trackEvent(dto: CustomEventDto, ip: string) {
    const website = await this.prisma.website.findUnique({
      where: { trackingKey: dto.siteKey },
      select: { id: true },
    });
    if (!website) return { ok: false };

    if (this.queue) {
      try {
        await this.queue.addCustomEvent({ ...dto, ip });
        return { ok: true, queued: true };
      } catch (err: unknown) {
        this.logger.warn(
          `Navbatga qo'yib bo'lmadi, to'g'ridan-to'g'ri yozilmoqda: ${getErrorMessage(err)}`,
        );
      }
    }

    const geo = await this.geoip.lookup(ip);
    // Sessiyaga bog'lash — funnel tahlili sessiya bo'yicha ketma-ketlikni talab qiladi
    const session = dto.sessionId
      ? await this.prisma.session.findUnique({
          where: {
            websiteId_fingerprint: {
              websiteId: website.id,
              fingerprint: dto.sessionId,
            },
          },
          select: { id: true },
        })
      : null;

    await this.prisma.customEvent.create({
      data: {
        websiteId: website.id,
        sessionId: session?.id ?? null,
        name: dto.name,
        path: dto.path || null,
        properties: dto.properties ?? Prisma.DbNull,
        country: geo.country || null,
        ip: ip || null,
      },
    });
    return { ok: true };
  }

  // ─── Oylik ko'rishlar limiti (plan bo'yicha) ──────────────────────────────

  private async isViewLimitExceeded(
    websiteId: string,
    ownerId: string,
  ): Promise<boolean> {
    const cacheKey = `tracking:view-limit:${websiteId}`;
    const cached = await this.redisCache.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    let exceeded = false;
    try {
      const plan = await getEffectivePlan(this.prisma, ownerId);
      if (plan && plan.maxMonthlyViews !== -1) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const used = await this.prisma.pageView.count({
          where: {
            website: { userId: ownerId },
            createdAt: { gte: monthStart },
          },
        });
        exceeded = used >= plan.maxMonthlyViews;

        // notifyLimitReached o'zi Notification jadvalidan "shu oyda
        // allaqachon yuborilganmi" tekshiradi — shuning uchun bu yerda
        // "avval keshlangan holat"ni bilish shart emas, har safar kesh
        // yangilanganda (5 daqiqada bir marta) chaqirsa ham xabar faqat
        // bir marta yuboriladi.
        if (exceeded) {
          await this.notifyLimitReached(
            ownerId,
            used,
            plan.maxMonthlyViews,
            monthStart,
          );
        }
      }
    } catch (err: unknown) {
      // Limit tekshiruvi yiqilsa tracking to'xtamasligi kerak
      this.logger.warn(`View-limit tekshiruv xatosi: ${getErrorMessage(err)}`);
    }

    await this.redisCache.set(
      cacheKey,
      exceeded ? '1' : '0',
      VIEW_LIMIT_CACHE_TTL_SECONDS,
    );
    return exceeded;
  }

  private async notifyLimitReached(
    userId: string,
    used: number,
    limit: number,
    monthStart: Date,
  ) {
    const title = "Oylik ko'rishlar limiti tugadi";
    // Shu oyda allaqachon xabar berilgan bo'lsa qayta yubormaymiz
    const already = await this.prisma.notification.findFirst({
      where: { userId, title, createdAt: { gte: monthStart } },
      select: { id: true },
    });
    if (already) return;

    const body = `Planingizdagi oylik ${limit.toLocaleString()} ko'rish limiti tugadi (${used.toLocaleString()} ta ishlatildi). Yangi ko'rishlar oy oxirigacha qabul qilinmaydi — planni yangilang.`;
    await this.prisma.notification.create({
      data: { userId, title, body, type: 'warning' },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      await this.email.sendLimitReached(
        user.email,
        user.name || '',
        used,
        limit,
      );
    }
    this.logger.log(`View limiti tugadi: user=${userId} (${used}/${limit})`);
  }

  async getEventStats(
    websiteId: string,
    period: 'today' | 'week' | 'month' = 'week',
  ) {
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const [grouped, latest] = await Promise.all([
      this.prisma.customEvent.groupBy({
        by: ['name'],
        where: { websiteId, createdAt: { gte: from } },
        _count: { name: true },
        orderBy: { _count: { name: 'desc' } },
      }),
      // Latest occurrence per event name
      this.prisma.customEvent.findMany({
        where: { websiteId, createdAt: { gte: from } },
        orderBy: { createdAt: 'desc' },
        select: { name: true, createdAt: true },
        distinct: ['name'],
      }),
    ]);

    const lastSeenMap = new Map(latest.map((e) => [e.name, e.createdAt]));

    return {
      period,
      events: grouped.map((e) => ({
        name: e.name,
        count: e._count.name,
        lastSeen: lastSeenMap.get(e.name) ?? null,
      })),
    };
  }

  async getEventDetail(
    websiteId: string,
    eventName: string,
    period: 'today' | 'week' | 'month' = 'week',
  ) {
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const events = await this.prisma.customEvent.findMany({
      where: { websiteId, name: eventName, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        path: true,
        properties: true,
        country: true,
        device: true,
        createdAt: true,
      },
    });

    return events;
  }

  // ─── Direct DB methods (used by QueueProcessor fallback) ─────────────────

  private async upsertSession(
    dto: TrackEventDto,
    websiteId: string,
    ip: string,
    country?: string | null,
  ) {
    // Haqiqiy upsert — (websiteId, fingerprint) unique constraint tufayli
    // parallel so'rovlarda ham duplikat sessiya yaratilmaydi
    return this.prisma.session.upsert({
      where: {
        websiteId_fingerprint: { websiteId, fingerprint: dto.sessionId },
      },
      update: {
        lastSeenAt: new Date(),
        pageCount: { increment: 1 },
        bounced: false,
        exitPage: dto.path,
      },
      create: {
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
        ip: ip || null,
        country: country || null,
      },
    });
  }

  private async handleExit(dto: TrackEventDto, websiteId: string) {
    const session = await this.prisma.session.findUnique({
      where: {
        websiteId_fingerprint: { websiteId, fingerprint: dto.sessionId },
      },
    });
    if (!session) return;

    await this.prisma.session.update({
      where: { id: session.id },
      // increment — SPA'da har sahifadan chiqishda kelgan vaqtlar yig'iladi,
      // aks holda sessiya davomiyligi faqat oxirgi sahifanikiga teng bo'lib qoladi
      data: {
        duration: { increment: dto.duration || 0 },
        exitPage: dto.path,
        lastSeenAt: new Date(),
      },
    });

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
}
