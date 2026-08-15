import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TrackingController } from '../src/tracking/tracking.controller';
import { TrackingService } from '../src/tracking/tracking.service';
import { RetentionService } from '../src/tracking/retention.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { GeoIpService } from '../src/common/services/geoip.service';
import { RedisCacheService } from '../src/common/services/redis-cache.service';
import { EmailService } from '../src/email/email.service';
import { QueueService } from '../src/queue/queue.service';

interface TestWebsite {
  id: string;
  userId: string;
  name: string;
  domain: string | null;
  trackingKey: string;
}

interface TestSession {
  id: string;
  websiteId: string;
  fingerprint: string;
  device: string | null;
  browser: string | null;
  country: string | null;
  duration: number;
  bounced: boolean;
  pageCount: number;
  startedAt: Date;
  lastSeenAt: Date;
}

interface TestPageView {
  id: string;
  websiteId: string;
  sessionId: string | null;
  path: string;
  referrer: string | null;
  scrollDepth: number | null;
  duration: number | null;
  isEntry: boolean;
  isExit: boolean;
  createdAt: Date;
}

interface TestCustomEvent {
  id: string;
  websiteId: string;
  sessionId: string | null;
  name: string;
  path: string | null;
  properties: any;
  createdAt: Date;
}

describe('Tracking Ingestion Flow (e2e)', () => {
  let app: INestApplication;
  
  // Local mock store
  const websites: TestWebsite[] = [
    {
      id: 'w-1',
      userId: 'u-1',
      name: 'Test Website',
      domain: 'https://testsite.com',
      trackingKey: 'mk_testkey123',
    },
  ];
  
  const sessions: TestSession[] = [];
  const pageViews: TestPageView[] = [];
  const customEvents: TestCustomEvent[] = [];
  
  let nextSessionIdNum = 1;
  let nextPageViewIdNum = 1;
  let nextEventIdNum = 1;

  const prismaMock = {
    website: {
      findUnique: jest.fn(({ where }: { where: { trackingKey: string } }) => {
        const found = websites.find(w => w.trackingKey === where.trackingKey);
        return Promise.resolve(found ?? null);
      }),
    },
    session: {
      findUnique: jest.fn(({ where }: { where: { id?: string; websiteId_fingerprint?: { websiteId: string; fingerprint: string } } }) => {
        if (where.id) {
          return Promise.resolve(sessions.find(s => s.id === where.id) ?? null);
        }
        if (where.websiteId_fingerprint) {
          const found = sessions.find(
            s => s.websiteId === where.websiteId_fingerprint!.websiteId &&
                 s.fingerprint === where.websiteId_fingerprint!.fingerprint
          );
          return Promise.resolve(found ?? null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn(({ data }: { data: any }) => {
        const s: TestSession = {
          id: `session-${nextSessionIdNum++}`,
          websiteId: data.websiteId,
          fingerprint: data.fingerprint,
          device: data.device || null,
          browser: data.browser || null,
          country: data.country || null,
          duration: data.duration ?? 0,
          bounced: data.bounced ?? true,
          pageCount: data.pageCount ?? 1,
          startedAt: new Date(),
          lastSeenAt: new Date(),
        };
        sessions.push(s);
        return Promise.resolve(s);
      }),
      update: jest.fn(({ where, data }: { where: { id: string }, data: any }) => {
        const idx = sessions.findIndex(s => s.id === where.id);
        if (idx !== -1) {
          sessions[idx] = { ...sessions[idx], ...data };
          return Promise.resolve(sessions[idx]);
        }
        return Promise.resolve(null);
      }),
      upsert: jest.fn(({ where, create, update }: { where: any, create: any, update: any }) => {
        const fingerprint = where.websiteId_fingerprint?.fingerprint || create.fingerprint;
        const websiteId = where.websiteId_fingerprint?.websiteId || create.websiteId;
        const existing = sessions.find(s => s.websiteId === websiteId && s.fingerprint === fingerprint);
        if (existing) {
          Object.assign(existing, update);
          return Promise.resolve(existing);
        }
        const s: TestSession = {
          id: `session-${nextSessionIdNum++}`,
          websiteId,
          fingerprint,
          device: create.device || null,
          browser: create.browser || null,
          country: create.country || null,
          duration: create.duration ?? 0,
          bounced: create.bounced ?? true,
          pageCount: create.pageCount ?? 1,
          startedAt: new Date(),
          lastSeenAt: new Date(),
        };
        sessions.push(s);
        return Promise.resolve(s);
      }),
    },
    pageView: {
      findFirst: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(({ data }: { data: any }) => {
        const pv: TestPageView = {
          id: `pv-${nextPageViewIdNum++}`,
          websiteId: data.websiteId,
          sessionId: data.sessionId || null,
          path: data.path,
          referrer: data.referrer || null,
          scrollDepth: data.scrollDepth || null,
          duration: data.duration || null,
          isEntry: data.isEntry ?? false,
          isExit: data.isExit ?? false,
          createdAt: new Date(),
        };
        pageViews.push(pv);
        return Promise.resolve(pv);
      }),
    },
    customEvent: {
      create: jest.fn(({ data }: { data: any }) => {
        const e: TestCustomEvent = {
          id: `ev-${nextEventIdNum++}`,
          websiteId: data.websiteId,
          sessionId: data.sessionId || null,
          name: data.name,
          path: data.path || null,
          properties: data.properties || null,
          createdAt: new Date(),
        };
        customEvents.push(e);
        return Promise.resolve(e);
      }),
    },
    userPlan: {
      findFirst: jest.fn(() => Promise.resolve({ plan: { limits: { pageviews: 1000 } } })),
    },
    $queryRaw: jest.fn(() => Promise.resolve([{ count: 0 }])),
  } as unknown as PrismaService;

  const geoIpMock = {
    lookup: jest.fn(() => ({ country: 'UZ' })),
  };

  const redisMock = {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
  };

  const emailMock = {
    sendLimitWarning: jest.fn(() => Promise.resolve()),
  };

  const queueMock = {
    add: jest.fn(() => Promise.resolve()),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        TrackingService,
        RetentionService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GeoIpService, useValue: geoIpMock },
        { provide: RedisCacheService, useValue: redisMock },
        { provide: EmailService, useValue: emailMock },
        { provide: QueueService, useValue: queueMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should successfully record page view and establish session', async () => {
    const payload = {
      siteKey: 'mk_testkey123',
      path: '/home',
      sessionId: 'browser-fingerprint-e2e',
      referrer: 'https://google.com',
      browser: 'Chrome',
      device: 'desktop',
    };

    const res = await request(app.getHttpServer())
      .post('/track')
      .send(payload)
      .expect(201);

    expect(res.body).toEqual({ ok: true });
    
    // Should create a session
    expect(sessions.length).toBe(1);
    expect(sessions[0].fingerprint).toBe(payload.sessionId);
    expect(sessions[0].websiteId).toBe('w-1');

    // Should create a page view
    expect(pageViews.length).toBe(1);
    expect(pageViews[0].path).toBe('/home');
    expect(pageViews[0].referrer).toBe('https://google.com');
  });

  it('should record custom event', async () => {
    const payload = {
      siteKey: 'mk_testkey123',
      name: 'Click Banner',
      sessionId: 'browser-fingerprint-e2e',
      path: '/home',
      properties: { color: 'blue' },
    };

    const res = await request(app.getHttpServer())
      .post('/track/event')
      .send(payload)
      .expect(201);

    expect(res.body).toEqual({ ok: true });

    // Should record a custom event
    expect(customEvents.length).toBe(1);
    expect(customEvents[0].name).toBe('Click Banner');
    expect(customEvents[0].properties).toEqual({ color: 'blue' });
  });

  it('should reject track for non-existing siteKey', async () => {
    const payload = {
      siteKey: 'invalid-key',
      path: '/home',
      sessionId: 'fingerprint-abc',
    };

    const res = await request(app.getHttpServer())
      .post('/track')
      .send(payload)
      .expect(201); // Controller returns { ok: false } instead of throwing 400 with 201 Created status

    expect(res.body).toEqual({ ok: false });
  });
});
