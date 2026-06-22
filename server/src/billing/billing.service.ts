import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(userId: string) {
    const sub = await (this.prisma as any).userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    const freePlan = await (this.prisma as any).plan.findUnique({ where: { slug: 'free' } });

    return {
      subscription: sub || null,
      plan: sub?.plan || freePlan,
      isDefault: !sub,
      // Stripe will be integrated here later
      paymentMethod: null,
      nextBillingDate: sub?.currentPeriodEnd || null,
    };
  }

  async checkout(userId: string, planSlug: string) {
    const plan = await (this.prisma as any).plan.findUnique({ where: { slug: planSlug } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    const currentSub = await (this.prisma as any).userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (currentSub?.plan?.slug === planSlug) {
      throw new BadRequestException('You are already on this plan');
    }

    // Downgrade to free: cancel subscription
    if (planSlug === 'free') {
      if (currentSub) {
        await (this.prisma as any).userSubscription.update({
          where: { userId },
          data: { status: 'CANCELED', canceledAt: new Date() },
        });
      }
      return {
        success: true,
        plan: 'free',
        message: 'Downgraded to Free plan',
        // TODO: Cancel Stripe subscription
      };
    }

    // Upgrade: activate plan immediately (mock — no real payment)
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await (this.prisma as any).userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        canceledAt: null,
      },
      include: { plan: true },
    });

    return {
      success: true,
      plan: sub.plan.slug,
      message: `Successfully upgraded to ${sub.plan.name}`,
      expiresAt: periodEnd,
      // TODO: Replace with Stripe checkout session URL
      // stripeUrl: 'https://checkout.stripe.com/...'
    };
  }

  async cancel(userId: string) {
    const sub = await (this.prisma as any).userSubscription.findUnique({ where: { userId } });
    if (!sub || sub.status === 'CANCELED') {
      throw new BadRequestException('No active subscription to cancel');
    }

    await (this.prisma as any).userSubscription.update({
      where: { userId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    return {
      success: true,
      message: 'Subscription canceled. You will keep access until the end of billing period.',
      accessUntil: sub.currentPeriodEnd,
      // TODO: Cancel Stripe subscription
    };
  }

  async getInvoices(userId: string) {
    // TODO: Fetch from Stripe
    // For now return mock data
    const sub = await (this.prisma as any).userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) return { invoices: [] };

    return {
      invoices: [
        {
          id: 'mock_inv_001',
          date: sub.currentPeriodStart,
          amount: sub.plan.price,
          currency: sub.plan.currency,
          status: 'paid',
          plan: sub.plan.name,
          // TODO: Real Stripe invoice PDF URL
          downloadUrl: null,
        },
      ],
    };
  }
}
