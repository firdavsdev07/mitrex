import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WebsitesService } from './websites.service';
import type { PrismaService } from '../prisma/prisma.service';

function makePrisma(overrides: any = {}) {
  return {
    website: { findUnique: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
    customEvent: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
    ...overrides,
  } as unknown as PrismaService;
}

describe('WebsitesService', () => {
  describe('findOne — access control', () => {
    it('allows the website owner', async () => {
      const prisma = makePrisma({
        website: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'w1', userId: 'u1', workspaceId: null }),
        },
      });
      const service = new WebsitesService(prisma);
      const site = await service.findOne('u1', 'w1');
      expect(site.id).toBe('w1');
    });

    it('allows a workspace member of a workspace-owned website', async () => {
      const prisma = makePrisma({
        website: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'w1',
            userId: 'owner',
            workspaceId: 'ws1',
          }),
        },
        workspaceMember: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ userId: 'u2', workspaceId: 'ws1' }),
        },
      });
      const service = new WebsitesService(prisma);
      const site = await service.findOne('u2', 'w1');
      expect(site.id).toBe('w1');
    });

    it('rejects a non-member, non-owner user', async () => {
      const prisma = makePrisma({
        website: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'w1',
            userId: 'owner',
            workspaceId: 'ws1',
          }),
        },
        workspaceMember: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new WebsitesService(prisma);
      await expect(service.findOne('stranger', 'w1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for a missing website', async () => {
      const prisma = makePrisma({
        website: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const service = new WebsitesService(prisma);
      await expect(service.findOne('u1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getFunnel', () => {
    function ownedSitePrisma(events: any[]) {
      return makePrisma({
        website: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'w1', userId: 'u1', workspaceId: null }),
        },
        customEvent: { findMany: jest.fn().mockResolvedValue(events) },
      });
    }

    it('rejects fewer than 2 steps', async () => {
      const service = new WebsitesService(ownedSitePrisma([]));
      await expect(
        service.getFunnel('u1', 'w1', ['Signup'], 'week'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('computes full conversion when every session completes every step in order', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const t1 = new Date('2026-01-01T00:01:00Z');
      const events = [
        { sessionId: 's1', name: 'Signup', createdAt: t0 },
        { sessionId: 's1', name: 'Purchase', createdAt: t1 },
        { sessionId: 's2', name: 'Signup', createdAt: t0 },
        { sessionId: 's2', name: 'Purchase', createdAt: t1 },
      ];
      const service = new WebsitesService(ownedSitePrisma(events));
      const result = await service.getFunnel(
        'u1',
        'w1',
        ['Signup', 'Purchase'],
        'week',
      );

      expect(result.steps).toEqual([
        { step: 'Signup', count: 2, dropOffPct: 0 },
        { step: 'Purchase', count: 2, dropOffPct: 0 },
      ]);
      expect(result.overallConversionPct).toBe(100);
    });

    it('drops sessions that never reach a later step', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const t1 = new Date('2026-01-01T00:01:00Z');
      const events = [
        { sessionId: 's1', name: 'Signup', createdAt: t0 },
        { sessionId: 's1', name: 'Purchase', createdAt: t1 },
        { sessionId: 's2', name: 'Signup', createdAt: t0 }, // Purchase qilmagan
        { sessionId: 's3', name: 'Signup', createdAt: t0 }, // Purchase qilmagan
      ];
      const service = new WebsitesService(ownedSitePrisma(events));
      const result = await service.getFunnel(
        'u1',
        'w1',
        ['Signup', 'Purchase'],
        'week',
      );

      expect(result.steps[0]).toEqual({
        step: 'Signup',
        count: 3,
        dropOffPct: 0,
      });
      expect(result.steps[1]).toEqual({
        step: 'Purchase',
        count: 1,
        dropOffPct: 66.7,
      });
      expect(result.overallConversionPct).toBe(33.3);
    });

    it('does not count a step that happened BEFORE the previous step (out-of-order)', async () => {
      const before = new Date('2026-01-01T00:00:00Z');
      const after = new Date('2026-01-01T00:01:00Z');
      const events = [
        // Purchase eventi Signup'dan OLDIN sodir bo'lgan — bu sessiya
        // funnel bosqichini "to'g'ri tartibda" bajarmagan hisoblanadi
        { sessionId: 's1', name: 'Purchase', createdAt: before },
        { sessionId: 's1', name: 'Signup', createdAt: after },
      ];
      const service = new WebsitesService(ownedSitePrisma(events));
      const result = await service.getFunnel(
        'u1',
        'w1',
        ['Signup', 'Purchase'],
        'week',
      );

      expect(result.steps[0].count).toBe(1); // Signup bajarilgan
      expect(result.steps[1].count).toBe(0); // lekin Purchase undan keyin emas
    });

    it('ignores events without a sessionId', async () => {
      const t0 = new Date('2026-01-01T00:00:00Z');
      const events = [{ sessionId: null, name: 'Signup', createdAt: t0 }];
      const service = new WebsitesService(ownedSitePrisma(events));
      const result = await service.getFunnel(
        'u1',
        'w1',
        ['Signup', 'Purchase'],
        'week',
      );
      expect(result.steps[0].count).toBe(0);
    });
  });

  describe('getTrend', () => {
    // Regressiya testi: DATE(...) ustuni TO_CHAR'siz qaytarilsa, pg driver
    // uni JS Date obyektiga aylantiradi va keyin String(date) qilinsa
    // "Wed Jul 15" kabi weekday-prefiksli, yilsiz satr chiqadi — bu ISO
    // emas va frontend'dagi `new Date(iso)` Invalid Date qaytaradi (trend
    // grafigi butunlay chizilmay qoladi). computeTrend TO_CHAR(...,
    // 'YYYY-MM-DD') ishlatishi va qatorni O'ZGARTIRMASDAN qaytarishi kerak.
    it('returns the date exactly as TO_CHAR provides it (proper ISO, not a Date-derived string)', async () => {
      const queryRaw = jest
        .fn()
        .mockResolvedValue([{ date: '2026-07-17', visitors: 3n, views: 5n }]);
      const prisma = makePrisma({
        website: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'w1', userId: 'u1', workspaceId: null }),
        },
        $queryRaw: queryRaw,
      });
      const service = new WebsitesService(prisma);

      const result = await service.getTrend('u1', 'w1', 'week');

      expect(result).toEqual([{ date: '2026-07-17', visitors: 3, views: 5 }]);
      // Ayniqsa: hech qanday weekday-prefiksli ("Fri", "Wed", ...) qiymat
      // chiqmasligi kerak.
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
