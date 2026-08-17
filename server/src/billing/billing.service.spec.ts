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
}

function makePrisma(opts?: {
  subscription?: Partial<FakeSubscription> | null;
  plans?: Record<
    string,
    { id: string; slug: string; isActive: boolean; name: string }
  >;
}) {
  let sub: FakeSubscription | null =
    opts?.subscription === undefined || opts.subscription === null
      ? null
      : {
          id: 'sub-1',
          userId: 'user-1',
          planId: 'plan-starter',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: null,
          canceledAt: null,
          ...opts.subscription,
        };

  const plans = opts?.plans ?? {
    free: { id: 'plan-free', slug: 'free', isActive: true, name: 'Free' },
    starter: {
      id: 'plan-starter',
      slug: 'starter',
      isActive: true,
      name: 'Starter',
    },
  };

  const updateCalls: unknown[] = [];
  const upsertCalls: unknown[] = [];

  const prisma = {
    userSubscription: {
      findUnique: jest.fn(({ where }: { where: { userId: string } }) => {
        if (!sub || sub.userId !== where.userId) return Promise.resolve(null);
        const plan = Object.values(plans).find((p) => p.id === sub!.planId);
        return Promise.resolve({ ...sub, plan });
      }),
      update: jest.fn(
        (args: {
          where: { userId: string };
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

  return { prisma, updateCalls, upsertCalls, getSub: () => sub };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BillingService#checkout', () => {
  it('throws NotFoundException for an unknown plan slug', async () => {
    const { prisma } = makePrisma();
    const service = new BillingService(prisma);

    await expect(
      service.checkout('user-1', 'nonexistent'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('downgrades to free locally without needing a payment provider', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { status: SubscriptionStatus.ACTIVE },
    });
    const service = new BillingService(prisma);

    const res = await service.checkout('user-1', 'free');

    expect(res).toEqual({
      success: true,
      plan: 'free',
      message: 'Downgraded to Free plan',
    });
    expect(getSub()?.status).toBe(SubscriptionStatus.CANCELED);
  });

  it('accepts a paid plan in test mode — no real payment, subscribes immediately', async () => {
    const { prisma, getSub } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    const res = await service.checkout('user-1', 'starter');

    expect(res.success).toBe(true);
    expect(res.plan).toBe('starter');
    expect(getSub()?.planId).toBe('plan-starter');
    expect(getSub()?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(getSub()?.currentPeriodEnd).toBeInstanceOf(Date);
  });

  it('switches an existing active subscription to a different paid plan', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { planId: 'plan-free', status: SubscriptionStatus.ACTIVE },
      plans: {
        free: { id: 'plan-free', slug: 'free', isActive: true, name: 'Free' },
        starter: {
          id: 'plan-starter',
          slug: 'starter',
          isActive: true,
          name: 'Starter',
        },
      },
    });
    const service = new BillingService(prisma);

    await service.checkout('user-1', 'starter');

    expect(getSub()?.planId).toBe('plan-starter');
    expect(getSub()?.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('rejects re-subscribing to the plan the user is already active on', async () => {
    const { prisma } = makePrisma({
      subscription: { status: SubscriptionStatus.ACTIVE },
    });
    const service = new BillingService(prisma);

    await expect(service.checkout('user-1', 'starter')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('BillingService#cancel', () => {
  it('throws BadRequestException when there is no active subscription', async () => {
    const { prisma } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    await expect(service.cancel('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('marks the subscription canceled locally', async () => {
    const { prisma, getSub } = makePrisma({
      subscription: { status: SubscriptionStatus.ACTIVE },
    });
    const service = new BillingService(prisma);

    const res = await service.cancel('user-1');

    expect(res.success).toBe(true);
    expect(getSub()?.status).toBe(SubscriptionStatus.CANCELED);
    expect(getSub()?.canceledAt).toBeInstanceOf(Date);
  });
});

describe('BillingService#getSubscription', () => {
  it('falls back to the free plan when the user has no subscription row', async () => {
    const { prisma } = makePrisma({ subscription: null });
    const service = new BillingService(prisma);

    const res = await service.getSubscription('user-1');

    expect(res.isDefault).toBe(true);
    expect(res.subscription).toBeNull();
  });
});

describe('BillingService#getInvoices', () => {
  it('always returns an empty list — no payment provider is connected', () => {
    const { prisma } = makePrisma();
    const service = new BillingService(prisma);

    expect(service.getInvoices()).toEqual({ invoices: [] });
  });
});
