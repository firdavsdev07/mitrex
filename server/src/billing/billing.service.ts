import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@metrix/prisma-client';
import { getErrorMessage } from '../common/utils/error.util';

// Lemon Squeezy obuna holatlarini ilovaning SubscriptionStatus enumiga moslashtiradi
const LEMON_STATUS_MAP: Record<string, SubscriptionStatus> = {
  on_trial: SubscriptionStatus.TRIALING,
  active: SubscriptionStatus.ACTIVE,
  cancelled: SubscriptionStatus.CANCELED,
  expired: SubscriptionStatus.EXPIRED,
  past_due: SubscriptionStatus.EXPIRED,
  unpaid: SubscriptionStatus.EXPIRED,
  paused: SubscriptionStatus.EXPIRED,
};

export interface LemonSqueezyAttributes {
  customer_id?: number | string;
  subscription_id?: number | string;
  status?: string;
  renews_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  total?: number;
  currency?: string;
  urls?: {
    invoice_url?: string | null;
  };
  url?: string;
}

export interface LemonSqueezyData {
  id: string | number;
  type: string;
  attributes: LemonSqueezyAttributes;
}

export interface LemonSqueezyMeta {
  event_name?: string;
  custom_data?: {
    userId?: string;
    planSlug?: string;
  };
}

export interface LemonSqueezyEvent {
  meta?: LemonSqueezyMeta;
  data: LemonSqueezyData;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get apiKey(): string {
    const key = process.env.LEMONSQUEEZY_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException(
        "To'lov tizimi hali sozlanmagan (LEMONSQUEEZY_API_KEY yo'q)",
      );
    }
    return key;
  }

  private get storeId(): string {
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!storeId) {
      throw new ServiceUnavailableException(
        "To'lov tizimi hali sozlanmagan (LEMONSQUEEZY_STORE_ID yo'q)",
      );
    }
    return storeId;
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

    // Downgrade to free: Lemon Squeezy obunasini bekor qilamiz (agar mavjud bo'lsa) va lokal holatni yangilaymiz.
    if (planSlug === 'free') {
      if (currentSub?.lemonSubscriptionId) {
        await this.cancelSubscription(currentSub.lemonSubscriptionId).catch(
          (err: unknown) => {
            this.logger.warn(
              `Lemon Squeezy subscription cancel xatosi (userId=${userId}): ${getErrorMessage(err)}`,
            );
          },
        );
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

    if (!plan.lemonVariantId) {
      throw new ServiceUnavailableException(
        `"${plan.name}" plani hali Lemon Squeezy'da sozlanmagan (lemonVariantId yo'q). scripts/lemon-provision-plans.ts ishga tushiring.`,
      );
    }

    if (
      currentSub?.lemonSubscriptionId &&
      currentSub.status === SubscriptionStatus.ACTIVE
    ) {
      try {
        await this.updateSubscriptionVariant(
          currentSub.lemonSubscriptionId,
          plan.lemonVariantId,
        );
        return {
          success: true,
          plan: planSlug,
          message: `Obuna muvaffaqiyatli ${plan.name} tarifiga o'tkazildi.`,
        };
      } catch (err: unknown) {
        this.logger.warn(
          `Lemon Squeezy subscription direct update failed for subId=${currentSub.lemonSubscriptionId}: ${getErrorMessage(err)}. Falling back to new checkout session.`,
        );
      }
    }

    const checkoutUrl = await this.createCheckoutSession(
      userId,
      userEmail,
      plan.lemonVariantId,
      planSlug,
    );
    return { success: true, checkoutUrl };
  }

  private async createCheckoutSession(
    userId: string,
    email: string,
    variantId: string,
    planSlug: string,
  ): Promise<string> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const response = await axios.post<{
        data: { attributes: { url?: string } };
      }>(
        'https://api.lemonsqueezy.com/v1/checkouts',
        {
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email,
                custom: {
                  userId,
                  planSlug,
                },
              },
              product_options: {
                redirect_url: `${frontendUrl}/settings?billing=success`,
              },
            },
            relationships: {
              store: {
                data: {
                  type: 'stores',
                  id: String(this.storeId),
                },
              },
              variant: {
                data: {
                  type: 'variants',
                  id: String(variantId),
                },
              },
            },
          },
        },
        {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      const url = response.data?.data?.attributes?.url;
      if (!url) {
        throw new Error('No checkout URL returned from Lemon Squeezy');
      }
      return url;
    } catch (err: unknown) {
      this.logger.error(
        `Lemon Squeezy checkout session yaratishda xato: ${getErrorMessage(err)}`,
      );
      throw new ServiceUnavailableException(
        "Lemon Squeezy checkout havolasi yaratilmadi. Keyinroq qayta urinib ko'ring.",
      );
    }
  }

  async cancel(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
    });
    if (!sub || sub.status === 'CANCELED') {
      throw new BadRequestException('No active subscription to cancel');
    }

    // Lemon Squeezy orqali obuna bo'lsa — davr oxirigacha kirish huquqi qoladi;
    // Lemon Squeezy davr tugaganda subscription_expired webhook yuboradi.
    if (sub.lemonSubscriptionId) {
      await this.cancelSubscription(sub.lemonSubscriptionId);
      await this.prisma.userSubscription.update({
        where: { userId },
        data: { canceledAt: new Date() },
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

  private async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.delete(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Lemon Squeezy subscription bekor qilishda xato (${subscriptionId}): ${getErrorMessage(err)}`,
      );
      throw new BadRequestException("Obunani bekor qilib bo'lmadi.");
    }
  }

  private async updateSubscriptionVariant(
    subscriptionId: string,
    variantId: string,
  ): Promise<any> {
    try {
      const response = await axios.patch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        {
          data: {
            type: 'subscriptions',
            id: subscriptionId,
            attributes: {
              variant_id: Number(variantId),
            },
          },
        },
        {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      return response.data;
    } catch (err: unknown) {
      this.logger.error(
        `Lemon Squeezy subscription variant update xatosi (subId=${subscriptionId}, variantId=${variantId}): ${getErrorMessage(err)}`,
      );
      throw err;
    }
  }

  async getInvoices(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return { invoices: [] };

    if (!sub.lemonSubscriptionId) {
      return { invoices: [] };
    }

    try {
      const response = await axios.get<{ data: LemonSqueezyData[] }>(
        `https://api.lemonsqueezy.com/v1/subscription-invoices?filter[subscription_id]=${sub.lemonSubscriptionId}`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      const items = response.data?.data || [];
      return {
        invoices: items.map((inv) => ({
          id: String(inv.id),
          date: inv.attributes.created_at
            ? new Date(inv.attributes.created_at)
            : new Date(),
          amount: Number(inv.attributes.total || 0) / 100,
          currency: String(inv.attributes.currency || '').toUpperCase(),
          status: String(inv.attributes.status || ''),
          plan: sub.plan.name,
          downloadUrl: inv.attributes.urls?.invoice_url || null,
        })),
      };
    } catch (err: unknown) {
      this.logger.error(
        `Lemon Squeezy getInvoices xatosi: ${getErrorMessage(err)}`,
      );
      throw new ServiceUnavailableException(
        "To'lovlar tarixini yuklashda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
      );
    }
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  constructEvent(rawBody: Buffer, signature: string): LemonSqueezyEvent {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        "LEMONSQUEEZY_WEBHOOK_SECRET sozlanmagan — webhook tekshirib bo'lmaydi",
      );
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');

    const digestBuffer = Buffer.from(digest, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (
      digestBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }

    return JSON.parse(rawBody.toString('utf8')) as LemonSqueezyEvent;
  }

  async handleWebhookEvent(event: LemonSqueezyEvent) {
    const eventName = event.meta?.event_name;

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await this.onSubscriptionCreatedOrUpdated(event);
        break;
      case 'subscription_cancelled':
        await this.onSubscriptionCancelled(event);
        break;
      case 'subscription_expired':
        await this.onSubscriptionExpired(event);
        break;
      case 'subscription_payment_success':
        await this.onPaymentSuccess(event);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${eventName}`);
        break;
    }
  }

  private async onSubscriptionCreatedOrUpdated(event: LemonSqueezyEvent) {
    const customData = event.meta?.custom_data;
    const userId = customData?.userId;
    const planSlug = customData?.planSlug;
    const subscriptionId = String(event.data.id);
    const customerId = String(event.data.attributes.customer_id);
    const statusKey = event.data.attributes.status || '';
    const status: SubscriptionStatus =
      LEMON_STATUS_MAP[statusKey] || SubscriptionStatus.ACTIVE;

    const renewsAt = event.data.attributes.renews_at;
    const endsAt = event.data.attributes.ends_at;
    const periodEnd = endsAt
      ? new Date(endsAt)
      : renewsAt
        ? new Date(renewsAt)
        : null;

    if (userId) {
      const plan = planSlug
        ? await this.prisma.plan.findUnique({ where: { slug: planSlug } })
        : null;

      if (!plan) {
        this.logger.warn(
          `onSubscriptionCreatedOrUpdated: plan topilmadi (${planSlug})`,
        );
        return;
      }

      // Check if user already has an active subscription with a different ID
      const oldSub = await this.prisma.userSubscription.findFirst({
        where: {
          userId,
          lemonSubscriptionId: { not: subscriptionId },
          status: SubscriptionStatus.ACTIVE,
        },
      });

      if (oldSub?.lemonSubscriptionId) {
        this.logger.log(
          `Cancelling old subscription ${oldSub.lemonSubscriptionId} for userId=${userId} after upgrade`,
        );
        await this.cancelSubscription(oldSub.lemonSubscriptionId).catch(
          (err: unknown) => {
            this.logger.warn(
              `Failed to cancel old subscription ${oldSub.lemonSubscriptionId} after upgrade: ${getErrorMessage(err)}`,
            );
          },
        );
      }

      await this.prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          planId: plan.id,
          status,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          lemonCustomerId: customerId,
          lemonSubscriptionId: subscriptionId,
        },
        update: {
          planId: plan.id,
          status,
          currentPeriodEnd: periodEnd,
          canceledAt: endsAt ? new Date() : null,
          lemonCustomerId: customerId,
          lemonSubscriptionId: subscriptionId,
        },
      });
      this.logger.log(
        `Subscription created/updated: userId=${userId} plan=${planSlug}`,
      );
    } else {
      const sub = await this.prisma.userSubscription.findUnique({
        where: { lemonSubscriptionId: subscriptionId },
      });
      if (!sub) {
        this.logger.warn(
          `subscription webhook: lokal yozuv topilmadi (lemonSubscriptionId=${subscriptionId})`,
        );
        return;
      }

      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          status,
          currentPeriodEnd: periodEnd,
          canceledAt: endsAt ? new Date() : null,
        },
      });
      this.logger.log(`Subscription updated: subId=${subscriptionId}`);
    }
  }

  private async onSubscriptionCancelled(event: LemonSqueezyEvent) {
    const subscriptionId = String(event.data.id);
    const endsAt = event.data.attributes.ends_at;

    const sub = await this.prisma.userSubscription.findUnique({
      where: { lemonSubscriptionId: subscriptionId },
    });
    if (!sub) {
      this.logger.warn(
        `onSubscriptionCancelled: sub topilmadi (${subscriptionId})`,
      );
      return;
    }

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        currentPeriodEnd: endsAt ? new Date(endsAt) : sub.currentPeriodEnd,
      },
    });
    this.logger.log(`Subscription cancelled: subId=${subscriptionId}`);
  }

  private async onSubscriptionExpired(event: LemonSqueezyEvent) {
    const subscriptionId = String(event.data.id);

    const sub = await this.prisma.userSubscription.findUnique({
      where: { lemonSubscriptionId: subscriptionId },
    });
    if (!sub) {
      this.logger.warn(
        `onSubscriptionExpired: sub topilmadi (${subscriptionId})`,
      );
      return;
    }

    await this.prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });
    this.logger.log(`Subscription expired: subId=${subscriptionId}`);
  }

  private async fetchSubscription(
    subscriptionId: string,
  ): Promise<{ data: LemonSqueezyData }> {
    try {
      const response = await axios.get<{ data: LemonSqueezyData }>(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      return response.data;
    } catch (err) {
      this.logger.error(
        `fetchSubscription error (subscriptionId=${subscriptionId}): ${getErrorMessage(err)}`,
      );
      throw err;
    }
  }

  private async onPaymentSuccess(event: LemonSqueezyEvent) {
    const subscriptionId = String(event.data.attributes.subscription_id);
    this.logger.log(`Payment success: subscriptionId=${subscriptionId}`);

    const sub = await this.prisma.userSubscription.findUnique({
      where: { lemonSubscriptionId: subscriptionId },
    });
    if (!sub) {
      this.logger.warn(
        `onPaymentSuccess: local subscription record not found for subId=${subscriptionId}`,
      );
      return;
    }

    try {
      const lsSub = await this.fetchSubscription(subscriptionId);
      const renewsAt = lsSub.data?.attributes?.renews_at;
      const endsAt = lsSub.data?.attributes?.ends_at;
      const periodEnd = endsAt
        ? new Date(endsAt)
        : renewsAt
          ? new Date(renewsAt)
          : null;

      await this.prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodEnd: periodEnd,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      this.logger.log(
        `Subscription period renewed: subId=${subscriptionId}, new periodEnd=${periodEnd?.toISOString()}`,
      );
    } catch (err) {
      this.logger.error(
        `onPaymentSuccess processing failed: ${getErrorMessage(err)}`,
      );
    }
  }
}
