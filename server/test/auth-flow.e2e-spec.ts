process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-jwt-secret';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailModule } from '../src/email/email.module';
import { EmailService } from '../src/email/email.service';
import { REFRESH_COOKIE_NAME } from '../src/common/utils/refresh-token.util';

interface TestUser {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  deletedAt: Date | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

describe('Auth Flow — Register, Login, Me (e2e)', () => {
  let app: INestApplication;
  const usersByEmail = new Map<string, TestUser>();
  const usersById = new Map<string, TestUser>();
  let nextId = 1;

  const prismaMock = {
    user: {
      findUnique: jest.fn(({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return Promise.resolve(usersByEmail.get(where.email.toLowerCase()) ?? null);
        if (where.id) return Promise.resolve(usersById.get(where.id) ?? null);
        return Promise.resolve(null);
      }),
      create: jest.fn(({ data }: { data: any }) => {
        const user: TestUser = {
          id: `u-${nextId++}`,
          email: data.email.toLowerCase(),
          password: data.password,
          name: data.name || null,
          role: 'USER',
          twoFactorEnabled: false,
          twoFactorSecret: null,
          deletedAt: null,
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersByEmail.set(user.email, user);
        usersById.set(user.id, user);
        return Promise.resolve(user);
      }),
    },
    refreshToken: {
      create: jest.fn(() => Promise.resolve({ id: 'rt-1' })),
      deleteMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    loginEvent: {
      create: jest.fn(() => Promise.resolve({ id: 'le-1' })),
    },
  } as unknown as PrismaService;

  const emailMock = {
    sendWelcome: jest.fn(() => Promise.resolve()),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule, EmailModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(EmailService)
      .useValue(emailMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete registration and login flow', async () => {
    const registerDto = {
      email: 'flow-test@metrix.uz',
      password: 'StrongPassword123!',
      name: 'Flow Test User',
    };

    // Step 1: Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(registerRes.body).toHaveProperty('user');
    expect(registerRes.body.user.email).toBe(registerDto.email);
    expect(registerRes.body).toHaveProperty('accessToken');

    // Step 2: Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: registerDto.email,
        password: registerDto.password,
      })
      .expect(200);

    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body.user.name).toBe(registerDto.name);

    // Verify refresh token cookie was set
    const cookies = loginRes.get('Set-Cookie');
    expect(cookies).toBeDefined();
    expect(cookies?.some(c => c.includes(REFRESH_COOKIE_NAME))).toBe(true);

    const accessToken = loginRes.body.accessToken;

    // Step 3: Get Auth Profile (/auth/me)
    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(registerDto.email);
    expect(meRes.body.name).toBe(registerDto.name);
  });

  it('should fail login with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'flow-test@metrix.uz',
        password: 'WrongPassword!',
      })
      .expect(401);
  });
});
