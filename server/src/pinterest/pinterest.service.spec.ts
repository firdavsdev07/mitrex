process.env.ENCRYPTION_KEY = 'a'.repeat(64);

import axios from 'axios';
import { pickLatestReadyDay, PinterestService } from './pinterest.service';
import { decrypt } from '../common/utils/crypto.util';
import type { PrismaService } from '../prisma/prisma.service';

// Tashqi Pinterest API'siga haqiqiy so'rov yuborilmasligi uchun.
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Pinterest analitikasi 1-2 kun kechikadi va tayyor bo'lmagan kunlarni
// nollar bilan qaytaradi. Bu tanlovni noto'g'ri qilsak, har sync'da nol
// yozib o'sish grafigini buzgan bo'lardik — shuning uchun alohida test.
describe('pickLatestReadyDay', () => {
  it('picks the most recent READY day, skipping pending ones', () => {
    const body = {
      ALL: {
        daily_metrics: [
          {
            date: '2026-08-11',
            data_status: 'READY',
            metrics: { IMPRESSION: 10 },
          },
          {
            date: '2026-08-13',
            data_status: 'READY',
            metrics: { IMPRESSION: 30 },
          },
          {
            date: '2026-08-14',
            data_status: 'PENDING',
            metrics: { IMPRESSION: 0 },
          },
        ],
      },
    };

    expect(pickLatestReadyDay(body)?.date).toBe('2026-08-13');
  });

  it('treats a missing data_status as READY', () => {
    const body = {
      ALL: {
        daily_metrics: [{ date: '2026-08-12', metrics: { IMPRESSION: 7 } }],
      },
    };

    expect(pickLatestReadyDay(body)?.metrics?.IMPRESSION).toBe(7);
  });

  it('returns null when nothing is ready yet', () => {
    const body = {
      ALL: {
        daily_metrics: [
          {
            date: '2026-08-14',
            data_status: 'PENDING',
            metrics: { IMPRESSION: 0 },
          },
        ],
      },
    };

    expect(pickLatestReadyDay(body)).toBeNull();
  });

  it('returns null for empty or missing payloads', () => {
    expect(pickLatestReadyDay({ ALL: { daily_metrics: [] } })).toBeNull();
    expect(pickLatestReadyDay({})).toBeNull();
    expect(pickLatestReadyDay(undefined)).toBeNull();
    expect(pickLatestReadyDay(null)).toBeNull();
  });
});

describe('PinterestService#ensureFreshToken', () => {
  function makeService() {
    const updates: Array<{ where: { id: string }; data: unknown }> = [];
    const prisma = {
      connection: {
        update: jest.fn((args: { where: { id: string }; data: unknown }) => {
          updates.push(args);
          return Promise.resolve(args.data);
        }),
      },
    } as unknown as PrismaService;
    return { service: new PinterestService(prisma), updates };
  }

  const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the current token when it is nowhere near expiry', async () => {
    const { service, updates } = makeService();

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'still-good',
      refreshToken: 'refresh-me',
      tokenExpiresAt: days(20),
    });

    expect(token).toBe('still-good');
    expect(updates).toHaveLength(0);
  });

  it('does not attempt a refresh without a refresh token', async () => {
    const { service, updates } = makeService();

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      refreshToken: null,
      tokenExpiresAt: days(1),
    });

    expect(token).toBe('about-to-expire');
    // `.mock.calls` orqali — metodning o'zini uzatish unbound-method lint
    // qoidasini buzadi.
    expect(mockedAxios.post.mock.calls).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('refreshes and stores both tokens encrypted', async () => {
    const { service, updates } = makeService();
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 2592000,
      },
    });

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      refreshToken: 'old-refresh',
      tokenExpiresAt: days(1),
    });

    expect(token).toBe('new-access');
    const data = updates[0].data as {
      accessToken: string;
      refreshToken: string;
    };
    expect(decrypt(data.accessToken)).toBe('new-access');
    expect(decrypt(data.refreshToken)).toBe('new-refresh');
  });

  it('keeps the old refresh token when the response omits a new one', async () => {
    const { service, updates } = makeService();
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'new-access', expires_in: 2592000 },
    });

    await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      refreshToken: 'old-refresh',
      tokenExpiresAt: days(1),
    });

    // refreshToken umuman yozilmasligi kerak — aks holda mavjud tokenni
    // null bilan o'chirib, ulanishni butunlay buzib qo'yardik.
    expect(updates[0].data).not.toHaveProperty('refreshToken');
  });

  it('falls back to the existing token when the refresh call fails', async () => {
    const { service, updates } = makeService();
    mockedAxios.post.mockRejectedValueOnce(new Error('network down'));

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      refreshToken: 'old-refresh',
      tokenExpiresAt: days(1),
    });

    expect(token).toBe('about-to-expire');
    expect(updates).toHaveLength(0);
  });
});
