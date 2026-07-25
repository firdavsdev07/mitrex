process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';

const mockStripeInstance = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: {
    cancel: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  invoices: { list: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

import { BillingService } from './billing.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type Stripe from 'stripe';

interface FakeSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

function makePrisma(opts?: {
  subscription?: Partial<FakeSubscription> | null;
  plans?: Record<
    string,
    {
      id: string;
      slug: string;
      isActive: boolean;
      stripePriceId: string | null;
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
            status: 'ACTIVE',
            currentPeriodEnd: null,
            canceledAt: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            ...opts.subscription,
          };

  const plans = opts?.plans ?? {
    free: {
      id: 'plan-free',
      slug: 'free',
      isActive: true,
      stripePriceId: null,
      name: 'Free',
    },
    starter: {
      id: 'plan-starter',
      slug: 'starter',
      isActive: true,
      stripePriceId: 'price_starter_123',
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
          where: { userId?: string; stripeSubscriptionId?: string };
        }) => {
          if (!sub) return Promise.resolve(null);
          if (where.userId && sub.userId !== where.userId)
            return Promise.resolve(null);
          if (
            where.stripeSubscriptionId &&
            sub.stripeSubscriptionId !== where.stripeSubscriptionId
          )
            return Promise.resolve(null);
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
    const { prisma } = makePrisma({ subscription: { status: 'ACTIVE' } });
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'u@example.com', 'starter'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('downgrades to free locally and cancels the Stripe subscription if one exists', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { stripeSubscriptionId: 'sub_stripe_1', status: 'ACTIVE' },
    });
    mockStripeInstance.subscriptions.cancel.mockResolvedValue({});
    const service = new BillingService(prisma);

    const result = await service.checkout('user-1', 'u@example.com', 'free');

    expect(result).toEqual({
      success: true,
      plan: 'free',
      message: 'Downgraded to Free plan',
    });
    expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith(
      'sub_stripe_1',
    );
    expect(getSub()?.status).toBe('CANCELED');
  });

  it('throws when the plan has no stripePriceId provisioned yet', async () => {
    const { prisma } = makePrisma({
      subscription: null,
      plans: {
        starter: {
          id: 'plan-starter',
          slug: 'starter',
          isActive: true,
          stripePriceId: null,
          name: 'Starter',
        },
      },
    });
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'u@example.com', 'starter'),
    ).rejects.toThrow(/stripePriceId/);
  });

  it('creates a Stripe customer and checkout session, returning the checkout URL', async () => {
    const { prisma } = makePrisma({ subscription: null });
    mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_123' });
    mockStripeInstance.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_abc',
    });
    const service = new BillingService(prisma);

    const result = await service.checkout('user-1', 'u@example.com', 'starter');

    expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
      email: 'u@example.com',
      metadata: { userId: 'user-1' },
    });
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [{ price: 'price_starter_123', quantity: 1 }],
        client_reference_id: 'user-1',
      }),
    );
    expect(result).toEqual({
      success: true,
      checkoutUrl: 'https://checkout.stripe.com/session_abc',
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

  it('sets cancel_at_period_end on Stripe when a Stripe subscription exists', async () => {
    const { prisma } = makePrisma({
      subscription: { stripeSubscriptionId: 'sub_stripe_1' },
    });
    mockStripeInstance.subscriptions.update.mockResolvedValue({});
    const service = new BillingService(prisma);

    await service.cancel('user-1');

    expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
      'sub_stripe_1',
      { cancel_at_period_end: true },
    );
  });

  it('cancels locally without touching Stripe when there is no Stripe subscription', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { stripeSubscriptionId: null },
    });
    const service = new BillingService(prisma);

    await service.cancel('user-1');

    expect(mockStripeInstance.subscriptions.update).not.toHaveBeenCalled();
    expect(getSub()?.status).toBe('CANCELED');
  });
});

describe('BillingService#getInvoices', () => {
  it('returns an empty list when the user has no subscription', async () => {
    const { prisma } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    expect(await service.getInvoices('user-1')).toEqual({ invoices: [] });
  });

  it('returns an empty list when the subscription has no Stripe customer', async () => {
    const { prisma } = makePrisma({
      subscription: { stripeCustomerId: null },
    });
    const service = new BillingService(prisma);

    expect(await service.getInvoices('user-1')).toEqual({ invoices: [] });
  });

  it('maps Stripe invoices to the app shape', async () => {
    const { prisma } = makePrisma({
      subscription: { stripeCustomerId: 'cus_123' },
    });
    mockStripeInstance.invoices.list.mockResolvedValue({
      data: [
        {
          id: 'in_1',
          created: 1700000000,
          amount_paid: 900,
          total: 900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://stripe.com/invoice/1',
          invoice_pdf: null,
        },
      ],
    });
    const service = new BillingService(prisma);

    const result = await service.getInvoices('user-1');

    expect(result.invoices).toEqual([
      {
        id: 'in_1',
        date: new Date(1700000000 * 1000),
        amount: 9,
        currency: 'USD',
        status: 'paid',
        plan: 'Starter',
        downloadUrl: 'https://stripe.com/invoice/1',
      },
    ]);
  });
});

describe('BillingService webhook handling', () => {
  it('constructEvent verifies the signature via the Stripe SDK', () => {
    const { prisma } = makePrisma();
    const service = new BillingService(prisma);
    mockStripeInstance.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
    });

    const event = service.constructEvent(Buffer.from('{}'), 'sig_abc');

    expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('{}'),
      'sig_abc',
      'whsec_dummy',
    );
    expect(event).toEqual({ type: 'checkout.session.completed' });
  });

  it('activates the subscription on checkout.session.completed', async () => {
    const { prisma, getSub } = makePrisma({ subscription: null });
    mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
      status: 'active',
      items: { data: [{ current_period_end: 1700003600 }] },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          client_reference_id: 'user-1',
          metadata: { userId: 'user-1', planSlug: 'starter' },
          customer: 'cus_123',
          subscription: 'sub_stripe_1',
        },
      },
    } as unknown as Stripe.Event);

    const sub = getSub();
    expect(sub?.status).toBe('ACTIVE');
    expect(sub?.stripeCustomerId).toBe('cus_123');
    expect(sub?.stripeSubscriptionId).toBe('sub_stripe_1');
  });

  it('syncs status on customer.subscription.updated', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { stripeSubscriptionId: 'sub_stripe_1', status: 'ACTIVE' },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_stripe_1',
          status: 'past_due',
          items: { data: [{ current_period_end: 1700003600 }] },
        },
      },
    } as unknown as Stripe.Event);

    expect(getSub()?.status).toBe('EXPIRED');
  });

  it('marks the subscription canceled on customer.subscription.deleted', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { stripeSubscriptionId: 'sub_stripe_1', status: 'ACTIVE' },
    });
    const service = new BillingService(prisma);

    await service.handleWebhookEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_stripe_1',
          status: 'canceled',
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event);

    const sub = getSub();
    expect(sub?.status).toBe('CANCELED');
    expect(sub?.canceledAt).toBeInstanceOf(Date);
  });
});
