import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateAlertDto) {
    return (this.prisma as any).alert.create({
      data: { userId, ...dto },
    });
  }

  async findAll(userId: string) {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Join website name and connection info
    const websiteIds = [...new Set(alerts.map((a) => a.websiteId).filter(Boolean))] as string[];
    const connectionIds = [...new Set(alerts.map((a) => a.connectionId).filter(Boolean))] as string[];

    const [websites, connections] = await Promise.all([
      websiteIds.length
        ? this.prisma.website.findMany({ where: { id: { in: websiteIds } }, select: { id: true, name: true, domain: true } })
        : [],
      connectionIds.length
        ? this.prisma.connection.findMany({ where: { id: { in: connectionIds } }, select: { id: true, platform: true, platformUsername: true } })
        : [],
    ]);

    const websiteMap = new Map<string, typeof websites[0]>(websites.map((w) => [w.id, w] as [string, typeof websites[0]]));
    const connectionMap = new Map<string, typeof connections[0]>(connections.map((c) => [c.id, c] as [string, typeof connections[0]]));

    return alerts.map((a) => ({
      ...a,
      website: a.websiteId ? websiteMap.get(a.websiteId) ?? null : null,
      connection: a.connectionId ? connectionMap.get(a.connectionId) ?? null : null,
    }));
  }

  async update(userId: string, id: string, data: Partial<CreateAlertDto>) {
    const alert = await (this.prisma as any).alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId) throw new NotFoundException('Alert not found');
    return (this.prisma as any).alert.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const alert = await (this.prisma as any).alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId) throw new NotFoundException('Alert not found');
    await (this.prisma as any).alert.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async getNotifications(userId: string, unreadOnly = false) {
    return (this.prisma as any).notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    const notif = await (this.prisma as any).notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new NotFoundException('Notification not found');
    return (this.prisma as any).notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await (this.prisma as any).notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: true };
  }

  async getUnreadCount(userId: string) {
    const count = await (this.prisma as any).notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  // ─── Alert checker (runs every hour) ─────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async checkAlerts() {
    this.logger.log('Checking alerts...');

    const alerts = await (this.prisma as any).alert.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    for (const alert of alerts) {
      try {
        await this.evaluateAlert(alert);
      } catch (err) {
        this.logger.error(`Alert check error (${alert.id}): ${err.message}`);
      }
    }
  }

  private async evaluateAlert(alert: any) {
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
            where: { websiteId: alert.websiteId, createdAt: { gte: oneHourAgo } },
          }),
          this.prisma.pageView.count({
            where: { websiteId: alert.websiteId, createdAt: { gte: twoHoursAgo, lt: oneHourAgo } },
          }),
        ]);
        if (previous === 0) break;
        const ratio = current / previous;
        if (alert.metric === 'TRAFFIC_SPIKE' && ratio >= alert.threshold) {
          triggered = true;
          message = `Traffic spike detected! ${current} views/hr vs ${previous} views/hr (${(ratio * 100 - 100).toFixed(0)}% increase)`;
        } else if (alert.metric === 'TRAFFIC_DROP' && ratio <= (1 - alert.threshold)) {
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
        if (stats.length < 2 || !stats[0].followers || !stats[1].followers) break;
        const change = (stats[0].followers - stats[1].followers) / stats[1].followers;
        if (alert.metric === 'FOLLOWER_SPIKE' && change >= alert.threshold) {
          triggered = true;
          message = `Follower spike! +${(change * 100).toFixed(1)}% increase (${stats[1].followers} → ${stats[0].followers})`;
        } else if (alert.metric === 'FOLLOWER_DROP' && change <= -alert.threshold) {
          triggered = true;
          message = `Follower drop! ${(change * 100).toFixed(1)}% decrease (${stats[1].followers} → ${stats[0].followers})`;
        }
        break;
      }
    }

    if (!triggered) return;

    // Throttle: don't fire same alert more than once per hour
    if (alert.lastTriggered && (now.getTime() - alert.lastTriggered.getTime()) < 60 * 60 * 1000) return;

    await this.fireAlert(alert, message);
  }

  private async fireAlert(alert: any, message: string) {
    // Create in-app notification
    await (this.prisma as any).notification.create({
      data: {
        userId: alert.userId,
        title: alert.name,
        body: message,
        type: 'warning',
      },
    });

    // Send email if channel is EMAIL
    if (alert.channel === 'EMAIL' || alert.channel === undefined) {
      await this.email.sendAlert(alert.user.email, alert.user.name || '', alert.name, message);
    }

    // Update lastTriggered
    await (this.prisma as any).alert.update({
      where: { id: alert.id },
      data: { lastTriggered: new Date() },
    });

    this.logger.log(`Alert fired: "${alert.name}" — ${message}`);
  }
}
