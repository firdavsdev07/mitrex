import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { getErrorMessage } from '../common/utils/error.util';

// Plan.dataRetentionDays'ni amalda qo'llaydi: har kuni ertalab plan
// muddatidan eskirgan xom analytics ma'lumotlarini (pageview, sessiya,
// custom event) o'chiradi. -1 (yoki 0) = cheksiz saqlash.
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *') // har kuni 03:00
  async purgeExpiredData() {
    const [users, freePlan] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
              plan: { select: { dataRetentionDays: true } },
            },
          },
        },
      }),
      this.prisma.plan.findUnique({
        where: { slug: 'free' },
        select: { dataRetentionDays: true },
      }),
    ]);

    // Amaldagi retention bo'yicha guruhlash — retention → userId[]
    const now = new Date();
    const groups = new Map<number, string[]>();
    for (const user of users) {
      const sub = user.subscription;
      const periodOk = !sub?.currentPeriodEnd || sub.currentPeriodEnd >= now;
      const active =
        sub &&
        periodOk &&
        (sub.status === 'ACTIVE' ||
          sub.status === 'TRIALING' ||
          (sub.status === 'CANCELED' && !!sub.currentPeriodEnd));
      const retention = active
        ? sub.plan.dataRetentionDays
        : (freePlan?.dataRetentionDays ?? 30);

      if (retention <= 0) continue; // -1/0 = cheksiz
      const list = groups.get(retention) ?? [];
      list.push(user.id);
      groups.set(retention, list);
    }

    let totalViews = 0;
    let totalSessions = 0;
    let totalEvents = 0;

    for (const [retention, userIds] of groups) {
      const cutoff = new Date(now.getTime() - retention * 24 * 60 * 60 * 1000);
      try {
        const [views, events, sessions] = await Promise.all([
          this.prisma.pageView.deleteMany({
            where: {
              website: { userId: { in: userIds } },
              createdAt: { lt: cutoff },
            },
          }),
          this.prisma.customEvent.deleteMany({
            where: {
              website: { userId: { in: userIds } },
              createdAt: { lt: cutoff },
            },
          }),
          // Sessiya oxirgi faolligi ham muddatdan eski bo'lsagina o'chadi
          this.prisma.session.deleteMany({
            where: {
              website: { userId: { in: userIds } },
              lastSeenAt: { lt: cutoff },
            },
          }),
        ]);
        totalViews += views.count;
        totalEvents += events.count;
        totalSessions += sessions.count;
      } catch (err: unknown) {
        this.logger.error(
          `Retention tozalash xatosi (retention=${retention}): ${getErrorMessage(err)}`,
        );
      }
    }

    if (totalViews || totalSessions || totalEvents) {
      this.logger.log(
        `Retention: ${totalViews} pageview, ${totalSessions} sessiya, ${totalEvents} event o'chirildi`,
      );
    }
  }
}
