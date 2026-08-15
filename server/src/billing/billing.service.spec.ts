/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
process.env.LEMONSQUEEZY_API_KEY = 'ls_api_dummy';
process.env.LEMONSQUEEZY_STORE_ID = '12345';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'ls_whsec_dummy';

import axios from 'axios';
import * as crypto from 'crypto';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

import { BillingService } from './billing.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@metrix/prisma-client';

interface FakeSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  lemonCustomerId: string | null;
  lemonSubscriptionId: string | null;
}

function makePrisma(opts?: {
  subscription?: Partial<FakeSubscription> | null;
  plans?: Record<
    string,
    {
      id: string;
      slug: string;
      isActive: boolean;
      lemonVariantId: string | null;
      name: string;
    }
  >;
}) {
  let sub: FakeSubscription | null =
    opts?.subscription === undefined
      ? null
      : opts.subscription === null
        ? null
        : {
            id: 'sub-1',
            userId: 'user-1',
            planId: 'plan-starter',
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: null,
            canceledAt: null,
            lemonCustomerId: null,
            lemonSubscriptionId: null,
            ...opts.subscription,
          };

  const plans = opts?.plans ?? {
    free: {
      id: 'plan-free',
      slug: 'free',
      isActive: true,
      lemonVariantId: null,
      name: 'Free',
    },
    starter: {
      id: 'plan-starter',
      slug: 'starter',
      isActive: true,
      lemonVariantId: 'variant_starter_123',
      name: 'Starter',
    },
  };

  const upsertCalls: unknown[] = [];
  const updateCalls: unknown[] = [];

  const prisma = {
    userSubscription: {
      findUnique: jest.fn(
        ({
          where,
        }: {
          where: { userId?: string; lemonSubscriptionId?: string };
        }) => {
          if (!sub) return Promise.resolve(null);
          if (where.userId && sub.userId !== where.userId)
            return Promise.resolve(null);
          if (
            where.lemonSubscriptionId &&
            sub.lemonSubscriptionId !== where.lemonSubscriptionId
          )
            return Promise.resolve(null);
          const plan = Object.values(plans).find((p) => p.id === sub!.planId);
          return Promise.resolve({ ...sub, plan });
        },
      ),
      findFirst: jest.fn(
        (args: {
          where: {
            userId?: string;
            lemonSubscriptionId?: { not: string };
            status?: SubscriptionStatus;
          };
        }) => {
          if (!sub) return Promise.resolve(null);
          const where = args.where;
          if (where.userId && sub.userId !== where.userId)
            return Promise.resolve(null);
          if (where.status && sub.status !== where.status)
            return Promise.resolve(null);
          if (
            where.lemonSubscriptionId &&
            where.lemonSubscriptionId.not &&
            sub.lemonSubscriptionId === where.lemonSubscriptionId.not
          ) {
            return Promise.resolve(null);
          }
          const plan = Object.values(plans).find((p) => p.id === sub!.planId);
          return Promise.resolve({ ...sub, plan });
        },
      ),
      update: jest.fn(
        (args: {
          where: { userId?: string; id?: string };
          data: Partial<FakeSubscription>;
        }) => {
          updateCalls.push(args);
          sub = { ...(sub as FakeSubscription), ...args.data };
          return Promise.resolve(sub);
        },
      ),
      upsert: jest.fn(
        (args: {
          where: { userId: string };
          create: Omit<FakeSubscription, 'id'>;
          update: Partial<FakeSubscription>;
        }) => {
          upsertCalls.push(args);
          sub = sub
            ? { ...sub, ...args.update }
            : { id: 'sub-new', ...args.create };
          return Promise.resolve(sub);
        },
      ),
    },
    plan: {
      findUnique: jest.fn(({ where }: { where: { slug: string } }) =>
        Promise.resolve(plans[where.slug] ?? null),
      ),
    },
  } as unknown as PrismaService;

  return { prisma, upsertCalls, updateCalls, getSub: () => sub };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BillingService#checkout', () => {
  it('throws NotFoundException for an unknown plan slug', async () => {
    const { prisma } = makePrisma();
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'u@example.com', 'nonexistent'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects re-subscribing to the plan the user is already active on', async () => {
    const { prisma } = makePrisma({
      subscription: { status: SubscriptionStatus.ACTIVE },
    });
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'u@example.com', 'starter'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('downgrades to free locally and cancels the Lemon Squeezy subscription if one exists', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: {
        lemonSubscriptionId: 'sub_ls_1',
        status: SubscriptionStatus.ACTIVE,
      },
    });
    mockedAxios.delete.mockResolvedValue({ data: {} });
    const service = new BillingService(prisma);

    const result = await service.checkout('user-1', 'u@example.com', 'free');

    expect(result).toEqual({
      success: true,
      plan: 'free',
      message: 'Downgraded to Free plan',
    });
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'https://api.lemonsqueezy.com/v1/subscriptions/sub_ls_1',
      expect.any(Object),
    );
    expect(getSub()?.status).toBe(SubscriptionStatus.CANCELED);
  });

  it('throws when the plan has no lemonVariantId provisioned yet', async () => {
    const { prisma } = makePrisma({
      subscription: null,
      plans: {
        starter: {
          id: 'plan-starter',
          slug: 'starter',
          isActive: true,
          lemonVariantId: null,
          name: 'Starter',
        },
      },
    });
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'u@example.com', 'starter'),
    ).rejects.toThrow(/lemonVariantId/);
  });

  it('creates a Lemon Squeezy checkout session, returning the checkout URL', async () => {
    const { prisma } = makePrisma({ subscription: null });
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          attributes: {
            url: 'https://checkout.lemonsqueezy.com/checkout/session_abc',
          },
        },
      },
    });
    const service = new BillingService(prisma);

    const result = await service.checkout('user-1', 'u@example.com', 'starter');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.lemonsqueezy.com/v1/checkouts',
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'checkouts',
          attributes: expect.objectContaining({
            checkout_data: {
              email: 'u@example.com',
              custom: { userId: 'user-1', planSlug: 'starter' },
            },
          }),
        }),
      }),
      expect.any(Object),
    );
    expect(result).toEqual({
      success: true,
      checkoutUrl: 'https://checkout.lemonsqueezy.com/checkout/session_abc',
    });
  });
});

describe('BillingService#cancel', () => {
  it('throws BadRequestException when there is nothing to cancel', async () => {
    const { prisma } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    await expect(service.cancel('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cancels on Lemon Squeezy when a subscription exists', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { lemonSubscriptionId: 'sub_ls_1' },
    });
    mockedAxios.delete.mockResolvedValue({ data: {} });
    const service = new BillingService(prisma);

    await service.cancel('user-1');

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'https://api.lemonsqueezy.com/v1/subscriptions/sub_ls_1',
      expect.any(Object),
    );
    expect(getSub()?.canceledAt).toBeInstanceOf(Date);
  });

  it('cancels locally when there is no Lemon Squeezy subscription', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { lemonSubscriptionId: null },
    });
    const service = new BillingService(prisma);

    await service.cancel('user-1');

    expect(mockedAxios.delete).not.toHaveBeenCalled();
    expect(getSub()?.status).toBe(SubscriptionStatus.CANCELED);
  });
});

describe('BillingService#getInvoices', () => {
  it('returns an empty list when the user has no subscription', async () => {
    const { prisma } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    expect(await service.getInvoices('user-1')).toEqual({ invoices: [] });
  });

  it('returns an empty list when the subscription has no Lemon Squeezy subscription ID', async () => {
    const { prisma } = makePrisma({
      subscription: { lemonSubscriptionId: null },
    });
    const service = new BillingService(prisma);

    expect(await service.getInvoices('user-1')).toEqual({ invoices: [] });
  });

  it('maps Lemon Squeezy invoices to the app shape', async () => {
    const { prisma } = makePrisma({
      subscription: { lemonSubscriptionId: 'sub_ls_1' },
    });
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 'inv_1',
            attributes: {
              created_at: '2026-08-09T17:16:11.000Z',
              total: 900,
              currency: 'usd',
              status: 'paid',
              urls: {
                invoice_url: 'https://invoices.lemonsqueezy.com/inv_1',
              },
            },
          },
        ],
      },
    });
    const service = new BillingService(prisma);

    const result = await service.getInvoices('user-1');

    expect(result.invoices).toEqual([
      {
        id: 'inv_1',
        date: new Date('2026-08-09T17:16:11.000Z'),
        amount: 9,
        currency: 'USD',
        status: 'paid',
        plan: 'Starter',
        downloadUrl: 'https://invoices.lemonsqueezy.com/inv_1',
      },
    ]);
  });
});

describe('BillingService webhook handling', () => {
  it('constructEvent verifies the signature and parses body', () => {
    const { prisma } = makePrisma();
    const service = new BillingService(prisma);

    const rawBody = Buffer.from('{"test":"ok"}');
    const hmac = crypto.createHmac('sha256', 'ls_whsec_dummy');
    const signature = hmac.update(rawBody).digest('hex');

    const event = service.constructEvent(rawBody, signature);

    expect(event).toEqual({ test: 'ok' });
  });

  it('activates the subscription on subscription_created', async () => {
    const { prisma, getSub } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      meta: {
        event_name: 'subscription_created',
        custom_data: { userId: 'user-1', planSlug: 'starter' },
      },
      data: {
        id: 'sub_ls_1',
        type: 'subscriptions',
        attributes: {
          customer_id: 'cus_123',
          status: 'active',
          renews_at: '2026-09-09T17:16:11.000Z',
          ends_at: null,
        },
      },
    });

    const sub = getSub();
    expect(sub?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub?.lemonCustomerId).toBe('cus_123');
    expect(sub?.lemonSubscriptionId).toBe('sub_ls_1');
    expect(sub?.currentPeriodEnd).toEqual(new Date('2026-09-09T17:16:11.000Z'));
  });

  it('syncs status on subscription_updated', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: {
        lemonSubscriptionId: 'sub_ls_1',
        status: SubscriptionStatus.ACTIVE,
      },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      meta: {
        event_name: 'subscription_updated',
      },
      data: {
        id: 'sub_ls_1',
        type: 'subscriptions',
        attributes: {
          customer_id: 'cus_123',
          status: 'past_due',
          renews_at: '2026-09-09T17:16:11.000Z',
          ends_at: null,
        },
      },
    });

    expect(getSub()?.status).toBe(SubscriptionStatus.EXPIRED);
  });

  it('marks the subscription canceled on subscription_cancelled', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: {
        lemonSubscriptionId: 'sub_ls_1',
        status: SubscriptionStatus.ACTIVE,
      },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      meta: {
        event_name: 'subscription_cancelled',
      },
      data: {
        id: 'sub_ls_1',
        type: 'subscriptions',
        attributes: {
          customer_id: 'cus_123',
          status: 'cancelled',
          ends_at: '2026-09-09T17:16:11.000Z',
        },
      },
    });

    const sub = getSub();
    expect(sub?.status).toBe(SubscriptionStatus.CANCELED);
    expect(sub?.canceledAt).toBeInstanceOf(Date);
    expect(sub?.currentPeriodEnd).toEqual(new Date('2026-09-09T17:16:11.000Z'));
  });

  it('marks subscription expired on subscription_expired', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: {
        lemonSubscriptionId: 'sub_ls_1',
        status: SubscriptionStatus.CANCELED,
      },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      meta: {
        event_name: 'subscription_expired',
      },
      data: {
        id: 'sub_ls_1',
        type: 'subscriptions',
        attributes: {
          status: 'expired',
        },
      },
    });

    expect(getSub()?.status).toBe(SubscriptionStatus.EXPIRED);
  });
});
