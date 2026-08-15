process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-jwt-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';
import { GoogleGuard } from '../src/auth/guards/google.guard';
import { REFRESH_COOKIE_NAME } from '../src/common/utils/refresh-token.util';

interface TestUser {
  id: string;
  email: string;
  name: string | null;
  provider: string;
  providerId: string | null;
  password?: string;
  role: string;
  twoFactorEnabled: boolean;
  deletedAt: string | null;
  avatar?: string | null;
}

// Google'ning o'zi bilan haqiqiy tarmoq so'rovi yubormaydi — GoogleGuard'ni
// Passport strategiyasi muvaffaqiyatli yakunlangandagi req.user bilan bir xil
// shaklda almashtiramiz. Bu aynan shu conversation'da topilgan haqiqiy
// muammolarni (redirect_uri_mismatch, keyin front-end'ning /login'ga tashlab
// yuborishi) qamrab oladigan qatlamni — controller → AuthService.oauthLogin
// → cookie/redirect javobi — sinaydi.
function mockGoogleUser(overrides: Partial<TestUser> = {}) {
  return {
    providerId: 'google-e2e-123',
    provider: 'GOOGLE',
    email: 'e2e-google-user@example.com',
    emailVerified: true,
    name: 'E2E Google User',
    avatar: null,
    ...overrides,
  };
}

describe('Auth — Google OAuth callback (e2e)', () => {
  let app: INestApplication;
  let googleUser: ReturnType<typeof mockGoogleUser>;
  const usersByEmail = new Map<string, TestUser>();
  const usersById = new Map<string, TestUser>();
  let nextId = 1;

  const prismaMock = {
    user: {
      findFirst: jest.fn(
        ({ where }: { where: { provider: string; providerId: string } }) => {
          return (
            [...usersById.values()].find(
              (u) =>
                u.provider === where.provider &&
                u.providerId === where.providerId,
            ) ?? null
          );
        },
      ),
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) return usersByEmail.get(where.email) ?? null;
          if (where.id) return usersById.get(where.id) ?? null;
          return null;
        },
      ),
      create: jest.fn(({ data }: { data: Partial<TestUser> }) => {
        const user = {
          id: `u-${nextId++}`,
          role: 'USER',
          twoFactorEnabled: false,
          deletedAt: null,
          ...data,
        } as TestUser;
        usersByEmail.set(user.email, user);
        usersById.set(user.id, user);
        return user;
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<TestUser>;
        }) => {
          const user = usersById.get(where.id);
          Object.assign(user as TestUser, data);
          return user;
        },
      ),
    },
    refreshToken: {
      create: jest.fn(({ data }: { data: unknown }) => data),
    },
    loginEvent: {
      // auth.service.ts#logLoginEvent bu chaqiruvni await qilmasdan
      // .catch() bilan zanjirlaydi — shuning uchun mock haqiqiy Promise
      // qaytarishi shart (oddiy qiymat emas).
      create: jest.fn(({ data }: { data: unknown }) => Promise.resolve(data)),
    },
  } as unknown as PrismaService;

  const emailMock = {
    sendWelcome: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendAccountDeleted: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule, EmailModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(EmailService)
      .useValue(emailMock as unknown as EmailService)
      .overrideGuard(GoogleGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{ user?: unknown }>();
          req.user = googleUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a new user on first Google login, sets the refresh cookie, and redirects with an access token', async () => {
    googleUser = mockGoogleUser();

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .expect(302);

    expect(res.headers.location).toMatch(
      /^http:\/\/localhost:3000\/auth\/callback\?token=/,
    );

    const setCookie = res.headers['set-cookie'] as string | string[];
    const refreshCookie = (
      Array.isArray(setCookie) ? setCookie : [setCookie]
    ).find((c: string) => c?.startsWith(`${REFRESH_COOKIE_NAME}=`));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    // Bu CLAUDE.md/auth.controller.ts'da ataylab hujjatlashtirilgan: cookie
    // '/auth'ga emas, '/' ga scoped — frontend middleware sessiya borligini
    // shu orqali oldindan bila oladi.
    expect(refreshCookie).toMatch(/Path=\//i);

    expect(usersByEmail.has('e2e-google-user@example.com')).toBe(true);
    expect(emailMock.sendWelcome).toHaveBeenCalledWith(
      'e2e-google-user@example.com',
      'E2E Google User',
    );
  });

  it('logs an existing Google user back in without creating a duplicate user', async () => {
    googleUser = mockGoogleUser();
    const usersBefore = usersByEmail.size;

    const res = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .expect(302);

    expect(res.headers.location).toMatch(
      /^http:\/\/localhost:3000\/auth\/callback\?token=/,
    );
    expect(usersByEmail.size).toBe(usersBefore);
  });

  it('links an existing email/password account by provider on first Google login for that email', async () => {
    const existing = {
      id: `u-${nextId++}`,
      email: 'already-local@example.com',
      name: 'Local User',
      provider: 'LOCAL',
      providerId: null,
      password: 'hashed',
      role: 'USER',
      twoFactorEnabled: false,
      deletedAt: null,
    };
    usersByEmail.set(existing.email, existing);
    usersById.set(existing.id, existing);

    googleUser = mockGoogleUser({
      providerId: 'google-different-id',
      email: 'already-local@example.com',
      name: 'Local User',
    });

    await request(app.getHttpServer()).get('/auth/google/callback').expect(302);

    const updated = usersByEmail.get('already-local@example.com');
    expect(updated).toBeDefined();
    expect(updated?.provider).toBe('GOOGLE');
    expect(updated?.providerId).toBe('google-different-id');
  });
});
