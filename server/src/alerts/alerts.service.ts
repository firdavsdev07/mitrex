import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAlertDto, UpdateAlertDto } from './dto/create-alert.dto';
import { Prisma } from '@metrix/prisma-client';
import { getErrorMessage } from '../common/utils/error.util';

type AlertWithUser = Prisma.AlertGetPayload<{
  include: { user: { select: { id: true; email: true; name: true } } };
}>;

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAlertDto) {
    await this.assertTargetOwnership(userId, dto.websiteId, dto.connectionId);
    return this.prisma.alert.create({
      data: { userId, ...dto },
    });
  }

  private async assertTargetOwnership(
    userId: string,
    websiteId?: string,
    connectionId?: string,
  ) {
    if (websiteId) {
      const website = await this.prisma.website.findUnique({
        where: { id: websiteId },
        select: { userId: true },
      });
      if (!website || website.userId !== userId)
        throw new ForbiddenException('Website not found');
    }
    if (connectionId) {
      const connection = await this.prisma.connection.findUnique({
        where: { id: connectionId },
        select: { userId: true },
      });
      if (!connection || connection.userId !== userId)
        throw new ForbiddenException('Connection not found');
    }
  }

  async findAll(userId: string) {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Join website name and connection info
    const websiteIds = [
      ...new Set(alerts.map((a) => a.websiteId).filter(Boolean)),
    ] as string[];
    const connectionIds = [
      ...new Set(alerts.map((a) => a.connectionId).filter(Boolean)),
    ] as string[];

    type WebsiteSummary = Prisma.WebsiteGetPayload<{
      select: { id: true; name: true; domain: true };
    }>;
    type ConnectionSummary = Prisma.ConnectionGetPayload<{
      select: { id: true; platform: true; platformUsername: true };
    }>;

    const [websites, connections]: [WebsiteSummary[], ConnectionSummary[]] =
      await Promise.all([
        websiteIds.length
          ? this.prisma.website.findMany({
              where: { id: { in: websiteIds } },
              select: { id: true, name: true, domain: true },
            })
          : [],
        connectionIds.length
          ? this.prisma.connection.findMany({
              where: { id: { in: connectionIds } },
              select: { id: true, platform: true, platformUsername: true },
            })
          : [],
      ]);

    const websiteMap = new Map<string, WebsiteSummary>(
      websites.map((w) => [w.id, w]),
    );
    const connectionMap = new Map<string, ConnectionSummary>(
      connections.map((c) => [c.id, c]),
    );

    return alerts.map((a) => ({
      ...a,
      website: a.websiteId ? (websiteMap.get(a.websiteId) ?? null) : null,
      connection: a.connectionId
        ? (connectionMap.get(a.connectionId) ?? null)
        : null,
    }));
  }

  async update(userId: string, id: string, data: UpdateAlertDto) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId)
      throw new NotFoundException('Alert not found');
    await this.assertTargetOwnership(userId, data.websiteId, data.connectionId);
    // Faqat ruxsat etilgan maydonlarni yozamiz — `userId` kabi hech qachon
    // so'ralmagan qiymat Prisma'ga yetib bormasligi kerak.
    return this.prisma.alert.update({
      where: { id },
      data: {
        name: data.name,
        metric: data.metric,
        threshold: data.threshold,
        websiteId: data.websiteId,
        connectionId: data.connectionId,
        channel: data.channel,
        isActive: data.isActive,
      },
    });
  }

  async remove(userId: string, id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId)
      throw new NotFoundException('Alert not found');
    await this.prisma.alert.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async getNotifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId)
      throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  // ─── Alert checker (runs every hour) ─────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async checkAlerts() {
    this.logger.log('Checking alerts...');

    // Butun tizimdagi faol alertlar sonini bitta so'rovda emas, sahifalab
    // o'qiymiz — foydalanuvchi bazasi o'sishi bilan bitta findMany() hamma
    // qatorni xotiraga yuklab yubormasligi uchun.
    const batchSize = 500;
    let cursor: string | undefined;
    let checked = 0;

    while (true) {
      const alerts = await this.prisma.alert.findMany({
        where: { isActive: true },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (alerts.length === 0) break;

      for (const alert of alerts) {
        try {
          await this.evaluateAlert(alert);
        } catch (err: unknown) {
          this.logger.error(
            `Alert check error (${alert.id}): ${getErrorMessage(err)}`,
          );
        }
      }

      checked += alerts.length;
      cursor = alerts[alerts.length - 1].id;
      if (alerts.length < batchSize) break;
    }

    this.logger.log(`Checked ${checked} alert(s).`);
  }

  private async evaluateAlert(alert: AlertWithUser) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    let triggered = false;
    let message = '';

    switch (alert.metric) {
      case 'TRAFFIC_SPIKE':
      case 'TRAFFIC_DROP': {
        if (!alert.websiteId) break;
        const [current, previous] = await Promise.all([
          this.prisma.pageView.count({
            where: {
              websiteId: alert.websiteId,
              createdAt: { gte: oneHourAgo },
            },
          }),
          this.prisma.pageView.count({
            where: {
              websiteId: alert.websiteId,
              createdAt: { gte: twoHoursAgo, lt: oneHourAgo },
            },
          }),
        ]);
        if (previous === 0) break;
        const ratio = current / previous;
        if (alert.metric === 'TRAFFIC_SPIKE' && ratio >= alert.threshold) {
          triggered = true;
          message = `Traffic spike detected! ${current} views/hr vs ${previous} views/hr (${(ratio * 100 - 100).toFixed(0)}% increase)`;
        } else if (
          alert.metric === 'TRAFFIC_DROP' &&
          ratio <= 1 - alert.threshold
        ) {
          triggered = true;
          message = `Traffic drop detected! ${current} views/hr vs ${previous} views/hr (${((1 - ratio) * 100).toFixed(0)}% decrease)`;
        }
        break;
      }
      case 'SITE_DOWN': {
        if (!alert.websiteId) break;
        const recentViews = await this.prisma.pageView.count({
          where: { websiteId: alert.websiteId, createdAt: { gte: oneHourAgo } },
        });
        if (recentViews === 0) {
          triggered = true;
          message = `No traffic detected on your website for the last hour. Site may be down.`;
        }
        break;
      }
      case 'FOLLOWER_SPIKE':
      case 'FOLLOWER_DROP': {
        if (!alert.connectionId) break;
        const stats = await this.prisma.platformStat.findMany({
          where: { connectionId: alert.connectionId },
          orderBy: { date: 'desc' },
          take: 2,
        });
        // stats[1].followers === 0 bo'lsa bo'linishning oldini olish uchun
        // hali ham o'tkazib yuboriladi, lekin stats[0].followers === 0
        // (masalan akkaunt bloklanib, obunachilar 0 ga tushgani) endi
        // haqiqiy pastga tushish sifatida hisoblanadi — avvalgi `!stats[0].followers`
        // tekshiruvi aynan shu eng yomon holatni "ma'lumot yo'q" deb o'tkazib yuborardi.
        if (
          stats.length < 2 ||
          stats[0].followers == null ||
          stats[1].followers == null ||
          stats[1].followers === 0
        )
          break;
        const change =
          (stats[0].followers - stats[1].followers) / stats[1].followers;
        if (alert.metric === 'FOLLOWER_SPIKE' && change >= alert.threshold) {
          triggered = true;
          message = `Follower spike! +${(change * 100).toFixed(1)}% increase (${stats[1].followers} → ${stats[0].followers})`;
        } else if (
          alert.metric === 'FOLLOWER_DROP' &&
          change <= -alert.threshold
        ) {
          triggered = true;
          message = `Follower drop! ${(change * 100).toFixed(1)}% decrease (${stats[1].followers} → ${stats[0].followers})`;
        }
        break;
      }
    }

    if (!triggered) return;

    // Throttle: don't fire same alert more than once per hour
    if (
      alert.lastTriggered &&
      now.getTime() - alert.lastTriggered.getTime() < 60 * 60 * 1000
    )
      return;

    await this.fireAlert(alert, message);
  }

  private async fireAlert(alert: AlertWithUser, message: string) {
    // Create in-app notification
    await this.prisma.notification.create({
      data: {
        userId: alert.userId,
        title: alert.name,
        body: message,
        type: 'warning',
      },
    });

    // Send email if channel is EMAIL (IN_APP faqat yuqoridagi notification bilan cheklanadi)
    if (alert.channel === 'EMAIL') {
      await this.email.sendAlert(
        alert.user.email,
        alert.user.name || '',
        alert.name,
        message,
      );
    }

    // Update lastTriggered
    await this.prisma.alert.update({
      where: { id: alert.id },
      data: { lastTriggered: new Date() },
    });

    this.logger.log(`Alert fired: "${alert.name}" — ${message}`);
  }
}
