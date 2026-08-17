import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@metrix/prisma-client';

// Lemon Squeezy integratsiyasi olib tashlandi (2026-08-16) — hozircha
// hech qanday to'lov provayderi ulanmagan.
//
// DIQQAT — TEST REJIMI: `checkout` haqiqiy pul o'tkazishni TEKSHIRMAYDI,
// so'ralgan tarifga darhol obuna qiladi ("tariflarga qarab qabul qiladi").
// Bu ataylab shunday — funksionallikni (plan limitlari, upgrade oqimi)
// real to'lov provayderisiz sinash uchun. Haqiqiy provayder ulanganda BU
// METOD albatta checkout session/webhook tasdig'iga almashtirilishi kerak —
// aks holda foydalanuvchi pul to'lamasdan istalgan tarifga o'ta oladi.
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const freePlan = await this.prisma.plan.findUnique({
      where: { slug: 'free' },
    });

    return {
      subscription: sub || null,
      plan: sub?.plan || freePlan,
      isDefault: !sub,
      paymentMethod: null,
      nextBillingDate: sub?.currentPeriodEnd || null,
    };
  }

  async checkout(userId: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { slug: planSlug },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    const currentSub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (currentSub?.planId === plan.id && currentSub.status === 'ACTIVE') {
      throw new BadRequestException('You are already on this plan');
    }

    // Free — obuna yozuvi shart emas ("yozuv yo'q" = free, getSubscription
    // shu konventsiyaga tayanadi), mavjud bo'lsa bekor qilib qo'yiladi.
    if (planSlug === 'free') {
      if (currentSub) {
        await this.prisma.userSubscription.update({
          where: { userId },
          data: { status: 'CANCELED', canceledAt: new Date() },
        });
      }
      return {
        success: true,
        plan: 'free',
        message: 'Downgraded to Free plan',
      };
    }

    this.logger.warn(
      `TEST checkout qabul qilindi (userId=${userId}, plan=${planSlug}) — real to'lov YO'Q.`,
    );

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
      },
    });

    return {
      success: true,
      plan: planSlug,
      message: `${plan.name} tarifiga o'tdingiz (test rejimi — real to'lov yo'q).`,
    };
  }

  async cancel(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub || sub.status === 'CANCELED') {
      throw new BadRequestException('No active subscription to cancel');
    }

    await this.prisma.userSubscription.update({
      where: { userId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    return {
      success: true,
      message:
        'Subscription canceled. You will keep access until the end of billing period.',
      accessUntil: sub.currentPeriodEnd,
    };
  }

  getInvoices() {
    // To'lov provayderi ulanmagani uchun hisob-fakturalar tarixi yo'q.
    return { invoices: [] };
  }
}
