process.env.ENCRYPTION_KEY = 'a'.repeat(64);

import axios from 'axios';
import { readInsight, ThreadsService } from './threads.service';
import { decrypt } from '../common/utils/crypto.util';
import type { PrismaService } from '../prisma/prisma.service';

// Tashqi Threads API'siga haqiqiy so'rov yuborilmasligi uchun — aks holda
// testlar internetga bog'lanib qolardi (CI'da uzilib turadi).
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Threads insight javoblari metrikaga qarab ikki xil shaklda keladi — bu
// parser jimgina noto'g'ri ishlab qolsa, statistika nol bo'lib ko'rinadi
// (xato ham bermaydi), shuning uchun alohida qoplangan.
describe('readInsight', () => {
  it('reads a lifetime metric from total_value', () => {
    const body = {
      data: [
        {
          name: 'followers_count',
          period: 'lifetime',
          total_value: { value: 1234 },
        },
      ],
    };

    expect(readInsight(body, 'followers_count')).toBe(1234);
  });

  it('sums a time-series metric across the returned days', () => {
    const body = {
      data: [
        {
          name: 'views',
          period: 'day',
          values: [{ value: 10 }, { value: 32 }, { value: 8 }],
        },
      ],
    };

    expect(readInsight(body, 'views')).toBe(50);
  });

  it('returns null when the metric is absent, not 0', () => {
    const body = { data: [{ name: 'views', values: [{ value: 5 }] }] };

    // null va 0 farqi muhim: "ruxsat yo'q / ma'lumot yo'q" ni "haqiqatan
    // nol ko'rish" bilan aralashtirib yubormaslik kerak.
    expect(readInsight(body, 'likes')).toBeNull();
    expect(readInsight(undefined, 'likes')).toBeNull();
    expect(readInsight(null, 'likes')).toBeNull();
  });

  it('returns null for a metric that came back with no values', () => {
    const body = { data: [{ name: 'views', period: 'day', values: [] }] };

    expect(readInsight(body, 'views')).toBeNull();
  });

  it('prefers total_value when both shapes are present', () => {
    const body = {
      data: [
        {
          name: 'views',
          total_value: { value: 99 },
          values: [{ value: 1 }, { value: 2 }],
        },
      ],
    };

    expect(readInsight(body, 'views')).toBe(99);
  });
});

describe('ThreadsService#ensureFreshToken', () => {
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
    return { service: new ThreadsService(prisma), updates };
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
      tokenExpiresAt: days(40),
    });

    expect(token).toBe('still-good');
    expect(updates).toHaveLength(0);
  });

  it('keeps the current token when tokenExpiresAt is unknown', async () => {
    const { service, updates } = makeService();

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'unknown-expiry',
      tokenExpiresAt: null,
    });

    expect(token).toBe('unknown-expiry');
    expect(updates).toHaveLength(0);
  });

  it('refreshes and stores the token when expiry is close', async () => {
    const { service, updates } = makeService();
    mockedAxios.get.mockResolvedValueOnce({
      data: { access_token: 'refreshed-token', expires_in: 5184000 },
    });

    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      tokenExpiresAt: days(2),
    });

    expect(token).toBe('refreshed-token');
    expect(updates).toHaveLength(1);
    // DB'ga shifrlangan holda yozilishi shart — xom token hech qachon
    // ustunga tushmasligi kerak.
    const stored = (updates[0].data as { accessToken: string }).accessToken;
    expect(stored).not.toBe('refreshed-token');
    expect(decrypt(stored)).toBe('refreshed-token');
  });

  it('falls back to the existing token when the refresh call fails', async () => {
    const { service, updates } = makeService();
    mockedAxios.get.mockRejectedValueOnce(new Error('network down'));

    // Eski token hali amal qiladi — refresh ishlamagani uchun sync butunlay
    // to'xtab qolmasligi kerak.
    const token = await service.ensureFreshToken({
      id: 'conn-1',
      accessToken: 'about-to-expire',
      tokenExpiresAt: days(2),
    });

    expect(token).toBe('about-to-expire');
    expect(updates).toHaveLength(0);
  });
});
