import { getEffectivePlan } from './plan.util';
import type { PrismaService } from '../../prisma/prisma.service';

const FREE_PLAN = {
  id: 'free-id',
  slug: 'free',
  maxWebsites: 1,
  maxPlatforms: 1,
};
const PRO_PLAN = {
  id: 'pro-id',
  slug: 'pro',
  maxWebsites: 10,
  maxPlatforms: 10,
};

function makePrisma(userSubscription: any) {
  return {
    userSubscription: {
      findUnique: jest.fn().mockResolvedValue(userSubscription),
    },
    plan: { findUnique: jest.fn().mockResolvedValue(FREE_PLAN) },
  } as unknown as PrismaService;
}

describe('getEffectivePlan', () => {
  it('returns the paid plan for an ACTIVE subscription', async () => {
    const prisma = makePrisma({
      status: 'ACTIVE',
      currentPeriodEnd: null,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(PRO_PLAN);
  });

  it('returns the paid plan for a TRIALING subscription', async () => {
    const prisma = makePrisma({
      status: 'TRIALING',
      currentPeriodEnd: null,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(PRO_PLAN);
  });

  it('keeps a CANCELED subscription active until currentPeriodEnd', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const prisma = makePrisma({
      status: 'CANCELED',
      currentPeriodEnd: future,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(PRO_PLAN);
  });

  it('falls back to free once a CANCELED subscription is past currentPeriodEnd', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prisma = makePrisma({
      status: 'CANCELED',
      currentPeriodEnd: past,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(FREE_PLAN);
  });

  it('falls back to free for an EXPIRED subscription', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const prisma = makePrisma({
      status: 'EXPIRED',
      currentPeriodEnd: future,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(FREE_PLAN);
  });

  it('falls back to free when there is no subscription at all', async () => {
    const prisma = makePrisma(null);
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(FREE_PLAN);
  });

  it('a CANCELED subscription with no currentPeriodEnd is treated as already ended', async () => {
    const prisma = makePrisma({
      status: 'CANCELED',
      currentPeriodEnd: null,
      plan: PRO_PLAN,
    });
    const plan = await getEffectivePlan(prisma, 'user-1');
    expect(plan).toBe(FREE_PLAN);
  });
});
