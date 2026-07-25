import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@metrix/prisma-client';
import { getErrorMessage } from '../common/utils/error.util';

// Stripe abonement holatlarini ilovaning soddaroq SubscriptionStatus
// enumiga tushiradi — bizga faqat "hozir kirish huquqi bormi" muhim,
// Stripe'ning to'liq holat mashinasi emas.
const STRIPE_STATUS_MAP: Record<
  Stripe.Subscription.Status,
  SubscriptionStatus
> = {
  active: SubscriptionStatus.ACTIVE,
  trialing: SubscriptionStatus.TRIALING,
  canceled: SubscriptionStatus.CANCELED,
  incomplete_expired: SubscriptionStatus.EXPIRED,
  past_due: SubscriptionStatus.EXPIRED,
  unpaid: SubscriptionStatus.EXPIRED,
  incomplete: SubscriptionStatus.EXPIRED,
  paused: SubscriptionStatus.EXPIRED,
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private get stripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new ServiceUnavailableException(
        "To'lov tizimi hali sozlanmagan (STRIPE_SECRET_KEY yo'q)",
      );
    }
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return this.stripeClient;
  }

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

  // Foydalanuvchining Stripe mijoz ID'sini qaytaradi — mavjud bo'lmasa,
  // Stripe'da yangi Customer yaratadi (checkout paytida ishlatiladi).
  private async getOrCreateStripeCustomer(
    userId: string,
    email: string,
  ): Promise<string> {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (sub?.stripeCustomerId) return sub.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
    return customer.id;
  }

  async checkout(userId: string, userEmail: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { slug: planSlug },
    });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');

    const currentSub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    // Faqat amaldagi (bekor qilinmagan) obuna uchun bloklaymiz — CANCELED
    // holatdagi user xuddi shu planga qayta obuna bo'la olishi kerak.
    if (currentSub?.plan?.slug === planSlug && currentSub.status === 'ACTIVE') {
      throw new BadRequestException('You are already on this plan');
    }

    // Downgrade to free: Stripe obunasini bekor qilamiz (agar mavjud
    // bo'lsa) va lokal holatni yangilaymiz — free plan uchun Stripe
    // checkout kerak emas.
    if (planSlug === 'free') {
      if (currentSub?.stripeSubscriptionId) {
        await this.stripe.subscriptions
          .cancel(currentSub.stripeSubscriptionId)
          .catch((err: unknown) => {
            this.logger.warn(
              `Stripe subscription cancel xatosi (userId=${userId}): ${getErrorMessage(err)}`,
            );
          });
      }
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

    if (!plan.stripePriceId) {
      throw new ServiceUnavailableException(
        `"${plan.name}" plani hali Stripe'da sozlanmagan (stripePriceId yo'q). scripts/stripe-provision-plans.ts ishga tushiring.`,
      );
    }

    const customerId = await this.getOrCreateStripeCustomer(userId, userEmail);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${frontendUrl}/settings?billing=success`,
      cancel_url: `${frontendUrl}/settings?billing=canceled`,
      client_reference_id: userId,
      metadata: { userId, planSlug },
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        "Stripe checkout havolasi yaratilmadi. Keyinroq qayta urinib ko'ring.",
      );
    }

    return { success: true, checkoutUrl: session.url };
  }

  async cancel(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub || sub.status === 'CANCELED') {
      throw new BadRequestException('No active subscription to cancel');
    }

    // Stripe orqali obuna bo'lsa — davr oxirigacha kirish huquqi qoladi;
    // Stripe davr tugaganda customer.subscription.deleted webhook yuboradi
    // (handleWebhookEvent shu yerda lokal holatni CANCELED qiladi).
    if (sub.stripeSubscriptionId) {
      await this.stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await this.prisma.userSubscription.update({
        where: { userId },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });
    }

    return {
      success: true,
      message:
        'Subscription canceled. You will keep access until the end of billing period.',
      accessUntil: sub.currentPeriodEnd,
    };
  }

  async getInvoices(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return { invoices: [] };

    if (!sub.stripeCustomerId) {
      // Stripe orqali hech qachon obuna bo'lmagan (masalan doim free yoki
      // admin tomonidan qo'lda berilgan plan) — Stripe'da invoice yo'q.
      return { invoices: [] };
    }

    const stripeInvoices = await this.stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 24,
    });

    return {
      invoices: stripeInvoices.data.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000),
        amount: (inv.amount_paid ?? inv.total) / 100,
        currency: inv.currency.toUpperCase(),
        status: inv.status,
        plan: sub.plan.name,
        downloadUrl: inv.hosted_invoice_url ?? inv.invoice_pdf ?? null,
      })),
    };
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        "STRIPE_WEBHOOK_SECRET sozlanmagan — webhook tekshirib bo'lmaydi",
      );
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.onSubscriptionChanged(event.data.object);
        break;
      default:
        // Boshqa event turlari (invoice.paid va h.k.) hozircha e'tiborsiz
        // qoldiriladi — kerak bo'lsa keyin qo'shiladi.
        break;
    }
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id ?? session.metadata?.userId;
    const planSlug = session.metadata?.planSlug;
    if (!userId || !planSlug || !session.customer || !session.subscription) {
      this.logger.warn(
        `checkout.session.completed: yetarli metadata yo'q (sessionId=${session.id})`,
      );
      return;
    }

    const plan = await this.prisma.plan.findUnique({
      where: { slug: planSlug },
    });
    if (!plan) {
      this.logger.warn(
        `checkout.session.completed: plan topilmadi (${planSlug})`,
      );
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;

    const stripeSub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = stripeSub.items.data[0]?.current_period_end;

    await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: STRIPE_STATUS_MAP[stripeSub.status],
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      },
      update: {
        planId: plan.id,
        status: STRIPE_STATUS_MAP[stripeSub.status],
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        canceledAt: null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      },
    });

    this.logger.log(`Checkout yakunlandi: userId=${userId} plan=${planSlug}`);
  }

  private async onSubscriptionChanged(subscription: Stripe.Subscription) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) {
      this.logger.warn(
        `subscription webhook: lokal yozuv topilmadi (stripeSubscriptionId=${subscription.id})`,
      );
      return;
    }

    const periodEnd = subscription.items.data[0]?.current_period_end;
    const status =
      subscription.status === 'canceled'
        ? SubscriptionStatus.CANCELED
        : STRIPE_STATUS_MAP[subscription.status];

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        canceledAt: subscription.status === 'canceled' ? new Date() : null,
      },
    });
  }
}
