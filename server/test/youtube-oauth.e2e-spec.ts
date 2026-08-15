process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'e2e-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'e2e-google-client-secret';
// YOUTUBE_API_KEY/GOOGLE_API_KEY qasddan o'rnatilmagan — fetchAndSaveStats()
// shu holatda erta qaytadi (real Analytics/statistika so'rovlari yubormaydi),
// bu testni faqat OAuth almashinuvi + Connection yozuviga qaratadi.
delete process.env.YOUTUBE_API_KEY;
delete process.env.GOOGLE_API_KEY;

jest.mock('axios');

import axios from 'axios';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { YoutubeModule } from '../src/youtube/youtube.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { signOAuthState } from '../src/common/utils/oauth-state.util';
import { decrypt } from '../src/common/utils/crypto.util';

const mockedAxios = axios as jest.Mocked<typeof axios>;

interface TestConnection {
  id: string;
  userId: string;
  platform: string;
  platformUserId: string;
  platformUsername?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive?: boolean;
}

describe('YouTube — Google OAuth connect callback (e2e)', () => {
  let app: INestApplication;
  const connectionsById = new Map<string, TestConnection>();
  let nextId = 1;

  const prismaMock = {
    connection: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(connectionsById.get(where.id) ?? null);
      }),
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: {
            userId_platform_platformUserId: {
              userId: string;
              platform: string;
              platformUserId: string;
            };
          };
          create: Partial<TestConnection>;
          update: Partial<TestConnection>;
        }) => {
          const existing = [...connectionsById.values()].find(
            (c) =>
              c.userId === where.userId_platform_platformUserId.userId &&
              c.platform === where.userId_platform_platformUserId.platform &&
              c.platformUserId ===
                where.userId_platform_platformUserId.platformUserId,
          );
          if (existing) {
            Object.assign(existing, update);
            return Promise.resolve(existing);
          }
          const conn = { id: `conn-${nextId++}`, ...create } as TestConnection;
          connectionsById.set(conn.id, conn);
          return Promise.resolve(conn);
        },
      ),
    },
    platformStat: {
      findUnique: jest.fn(() => Promise.resolve(null)),
    },
  } as unknown as PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [YoutubeModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockImplementation((url: string) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return Promise.resolve({
          data: {
            access_token: 'fake-access-token',
            refresh_token: 'fake-refresh-token',
            expires_in: 3600,
          },
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });
    mockedAxios.get.mockImplementation(
      (url: string, config?: { params?: { mine?: boolean } }) => {
        if (url.includes('/channels') && config?.params?.mine) {
          return Promise.resolve({
            data: {
              items: [
                {
                  id: 'UC_e2e_channel',
                  snippet: { title: 'E2E Test Channel' },
                },
              ],
            },
          });
        }
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      },
    );
  });

  it('exchanges the code, creates an encrypted Connection, and redirects to /connections?connected=youtube', async () => {
    const userId = 'user-e2e-1';
    const state = signOAuthState(userId);

    const res = await request(app.getHttpServer())
      .get('/youtube/oauth/callback')
      .query({ code: 'fake-auth-code', state })
      .expect(302);

    expect(res.headers.location).toBe(
      'http://localhost:3000/connections?connected=youtube',
    );

    const conn = [...connectionsById.values()].find((c) => c.userId === userId);
    expect(conn).toBeDefined();
    if (!conn) throw new Error('unreachable');
    expect(conn.platformUserId).toBe('UC_e2e_channel');
    expect(conn.platformUsername).toBe('E2E Test Channel');
    // Tokenlar xom holda saqlanmasligi kerak — encrypt() orqali shifrlangan
    // bo'lishi va decrypt() bilan asl qiymatga qaytishi kerak.
    expect(conn.accessToken).not.toBe('fake-access-token');
    expect(decrypt(conn.accessToken as string)).toBe('fake-access-token');
    expect(decrypt(conn.refreshToken as string)).toBe('fake-refresh-token');
  });

  it('redirects with an error (not a crash) when the state is invalid/expired', async () => {
    const res = await request(app.getHttpServer())
      .get('/youtube/oauth/callback')
      .query({ code: 'fake-auth-code', state: 'tampered-or-expired-state' })
      .expect(302);

    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(
      'http://localhost:3000/connections',
    );
    expect(location.searchParams.get('error')).toBe('youtube');
  });

  it('redirects with an error when Google itself reports an OAuth error', async () => {
    const res = await request(app.getHttpServer())
      .get('/youtube/oauth/callback')
      .query({
        error: 'access_denied',
        error_description: 'User denied access',
      })
      .expect(302);

    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(
      'http://localhost:3000/connections',
    );
    expect(location.searchParams.get('error')).toBe('youtube');
    expect(location.searchParams.get('message')).toBe('User denied access');
  });
});
