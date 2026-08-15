process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'e2e-test-webhook-secret';
process.env.JWT_SECRET = 'e2e-test-jwt-secret';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { BillingModule } from '../src/billing/billing.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface TestSubscription {
  id: string;
  userId: string;
  planSlug: string;
  status: string;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  lemonCustomerId: string | null;
  lemonSubscriptionId: string;
}

describe('Billing Webhook Ingestion (e2e)', () => {
  let app: INestApplication;
  const subscriptions: TestSubscription[] = [];

  const prismaMock = {
    userSubscription: {
      findUnique: jest.fn(({ where }: { where: { userId?: string; lemonSubscriptionId?: string } }) => {
        if (where.userId) {
          return Promise.resolve(subscriptions.find(s => s.userId === where.userId) ?? null);
        }
        if (where.lemonSubscriptionId) {
          return Promise.resolve(subscriptions.find(s => s.lemonSubscriptionId === where.lemonSubscriptionId) ?? null);
        }
        return Promise.resolve(null);
      }),
      findFirst: jest.fn(() => Promise.resolve(null)),
      upsert: jest.fn(({ where, create, update }: { where: any; create: any; update: any }) => {
        const lemonSubscriptionId = create.lemonSubscriptionId || update.lemonSubscriptionId;
        const userId = where.userId || create.userId;
        const idx = subscriptions.findIndex(s => s.userId === userId);
        if (idx !== -1) {
          subscriptions[idx] = { ...subscriptions[idx], ...update };
          return Promise.resolve(subscriptions[idx]);
        }
        const s: TestSubscription = {
          id: `sub-${subscriptions.length + 1}`,
          userId,
          planSlug: create.planSlug || 'starter',
          status: create.status,
          currentPeriodEnd: create.currentPeriodEnd || null,
          canceledAt: create.canceledAt || null,
          lemonCustomerId: create.lemonCustomerId || null,
          lemonSubscriptionId,
        };
        subscriptions.push(s);
        return Promise.resolve(s);
      }),
    },
    plan: {
      findUnique: jest.fn(({ where }: { where: { slug: string } }) => {
        return Promise.resolve({ id: 'p-starter', slug: where.slug || 'starter' });
      }),
    },
    user: {
      findUnique: jest.fn(({ where }: { where: { email: string } }) => {
        return Promise.resolve({ id: 'u-123', email: where.email });
      }),
    },
  } as unknown as PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BillingModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication({
      // We must enable rawBody to let NestJS capture req.rawBody for signature checks
      rawBody: true,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully handle valid subscription_created webhook', async () => {
    const payload = {
      meta: {
        event_name: 'subscription_created',
        custom_data: {
          userId: 'u-123',
          planSlug: 'starter',
        },
      },
      data: {
        id: 'sub_ls_123',
        attributes: {
          status: 'active',
          variant_name: 'Starter',
          renews_at: '2026-09-11T00:00:00.000Z',
          ends_at: null,
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    
    // Generate signature using e2e-test-webhook-secret
    const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET!);
    const signature = hmac.update(rawBody).digest('hex');

    await request(app.getHttpServer())
      .post('/billing/webhook')
      .set('x-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(200);

    // Verify subscription was created in the mock prisma store
    expect(subscriptions.length).toBe(1);
    expect(subscriptions[0].lemonSubscriptionId).toBe('sub_ls_123');
    expect(subscriptions[0].userId).toBe('u-123');
    expect(subscriptions[0].status).toBe('ACTIVE');
  });

  it('should reject webhooks with invalid signatures', async () => {
    const payload = { event: 'test' };
    const rawBody = JSON.stringify(payload);

    await request(app.getHttpServer())
      .post('/billing/webhook')
      .set('x-signature', 'invalid-sig')
      .set('Content-Type', 'application/json')
      .send(rawBody)
      .expect(400);
  });
});
