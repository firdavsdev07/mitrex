process.env.JWT_SECRET = 'test-jwt-secret';

import { AuthService } from './auth.service';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { JwtService } from '@nestjs/jwt';
import type { EmailService } from '../email/email.service';
import type { TwoFactorService } from './two-factor.service';
import {
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
} from '../common/utils/refresh-token.util';
import { sha256Hex } from '../common/utils/crypto.util';

interface FakeUser {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  avatar: string | null;
  role: string;
  provider: string;
  providerId: string | null;
  twoFactorEnabled: boolean;
  deletedAt: Date | null;
}

// Haqiqiy JWT emas — faqat payload'ni base64 JSON qilib "sign" qiladi va
// qaytarib "verify" qiladi, testda AuthService'ning o'zi ishlatadigan
// jwt.sign/jwt.verify interfeysini qondiradi.
function makeFakeJwt() {
  return {
    sign: jest.fn((payload: object) =>
      Buffer.from(JSON.stringify(payload)).toString('base64'),
    ),
    verify: jest.fn((token: string): { sub: string; twofa?: boolean } => {
      try {
        return JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as {
          sub: string;
          twofa?: boolean;
        };
      } catch {
        throw new Error('invalid token');
      }
    }),
  } as unknown as JwtService;
}

function makePrisma(seedUsers: FakeUser[] = []) {
  const users = new Map(seedUsers.map((u) => [u.id, { ...u }]));
  const refreshTokens = new Map<
    string,
    {
      id: string;
      userId: string;
      tokenHash: string;
      revokedAt: Date | null;
      expiresAt: Date;
    }
  >();
  const resetTokens = new Map<
    string,
    {
      id: string;
      userId: string;
      token: string;
      usedAt: Date | null;
      expiresAt: Date;
    }
  >();
  let nextId = users.size + 1;

  const rawPrisma = {
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email?: string; id?: string } }) => {
          const list = [...users.values()];
          const found = where.email
            ? list.find((u) => u.email === where.email)
            : list.find((u) => u.id === where.id);
          return Promise.resolve(found ?? null);
        },
      ),
      findFirst: jest.fn(
        ({
          where,
        }: {
          where: { provider: string; providerId: string | null };
        }) => {
          const found = [...users.values()].find(
            (u) =>
              u.provider === where.provider &&
              u.providerId === where.providerId,
          );
          return Promise.resolve(found ?? null);
        },
      ),
      create: jest.fn(({ data }: { data: Partial<FakeUser> }) => {
        const user: FakeUser = {
          id: `u-${nextId++}`,
          email: data.email!,
          password: data.password ?? null,
          name: data.name ?? null,
          avatar: data.avatar ?? null,
          role: 'USER',
          provider: data.provider ?? 'LOCAL',
          providerId: data.providerId ?? null,
          twoFactorEnabled: false,
          deletedAt: null,
        };
        users.set(user.id, user);
        return Promise.resolve(user);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<FakeUser>;
        }) => {
          const user = users.get(where.id);
          if (!user) throw new Error('user not found');
          Object.assign(user, data);
          return Promise.resolve(user);
        },
      ),
    },
    refreshToken: {
      create: jest.fn(
        ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const rt = {
            id: `rt-${refreshTokens.size + 1}`,
            userId: data.userId,
            tokenHash: data.tokenHash,
            revokedAt: null,
            expiresAt: data.expiresAt,
          };
          refreshTokens.set(rt.tokenHash, rt);
          return Promise.resolve(rt);
        },
      ),
      findUnique: jest.fn(({ where }: { where: { tokenHash: string } }) =>
        Promise.resolve(refreshTokens.get(where.tokenHash) ?? null),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { revokedAt: Date };
        }) => {
          const rt = [...refreshTokens.values()].find((r) => r.id === where.id);
          if (rt) rt.revokedAt = data.revokedAt;
          return Promise.resolve(rt);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { userId?: string; tokenHash?: string; revokedAt: null };
          data: { revokedAt: Date };
        }) => {
          let count = 0;
          for (const rt of refreshTokens.values()) {
            if (rt.revokedAt) continue;
            if (where.userId && rt.userId !== where.userId) continue;
            if (where.tokenHash && rt.tokenHash !== where.tokenHash) continue;
            rt.revokedAt = data.revokedAt;
            count++;
          }
          return Promise.resolve({ count });
        },
      ),
    },
    passwordResetToken: {
      create: jest.fn(
        ({
          data,
        }: {
          data: { userId: string; token: string; expiresAt: Date };
        }) => {
          const t = {
            id: `prt-${resetTokens.size + 1}`,
            userId: data.userId,
            token: data.token,
            usedAt: null,
            expiresAt: data.expiresAt,
          };
          resetTokens.set(t.token, t);
          return Promise.resolve(t);
        },
      ),
      findUnique: jest.fn(({ where }: { where: { token: string } }) =>
        Promise.resolve(resetTokens.get(where.token) ?? null),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { usedAt: Date };
        }) => {
          const t = [...resetTokens.values()].find((x) => x.id === where.id);
          if (t) t.usedAt = data.usedAt;
          return Promise.resolve(t);
        },
      ),
    },
    loginEvent: {
      create: jest.fn<
        Promise<object>,
        [
          {
            data: {
              userId: string;
              provider: string;
              success: boolean;
              ip?: string;
              userAgent?: string;
            };
          },
        ]
      >(() => Promise.resolve({})),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return {
    prisma: rawPrisma as unknown as PrismaService,
    // Testlarda mock chaqiruvlarini (masalan loginEvent.create) tekshirish
    // uchun — PrismaService'ga cast qilingan versiyada bu class metodi
    // sifatida ko'rinib, unbound-method lint xatosini keltirib chiqaradi.
    rawPrisma,
    users,
    refreshTokens,
    resetTokens,
  };
}

function makeEmail() {
  return {
    sendWelcome: jest.fn(),
    sendPasswordReset: jest.fn(),
  } as unknown as EmailService;
}

function makeTwoFactor(overrides?: { verifyCode?: boolean }) {
  return {
    verifyCode: jest.fn(() => Promise.resolve(overrides?.verifyCode ?? true)),
  } as unknown as TwoFactorService;
}

// AuthService#issueTokens xususiy (private) — uni reflection orqali
// chaqirish o'rniga, xuddi shu utility funksiyalar bilan haqiqiy refresh
// token qatorini to'g'ridan-to'g'ri "seed" qilamiz.
function seedRefreshToken(
  refreshTokens: Map<
    string,
    {
      id: string;
      userId: string;
      tokenHash: string;
      revokedAt: Date | null;
      expiresAt: Date;
    }
  >,
  userId: string,
): string {
  const raw = generateRefreshToken();
  const tokenHash = hashRefreshToken(raw);
  refreshTokens.set(tokenHash, {
    id: `rt-seed-${refreshTokens.size + 1}`,
    userId,
    tokenHash,
    revokedAt: null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return raw;
}

describe('AuthService#register', () => {
  it('creates a new local user and issues tokens', async () => {
    const { prisma, users } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.register({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(users.size).toBe(1);
  });

  it('rejects registering an email that already exists', async () => {
    const { prisma } = makePrisma([
      {
        id: 'u-1',
        email: 'exists@example.com',
        password: 'hashed',
        name: null,
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        twoFactorEnabled: false,
        deletedAt: null,
      },
    ]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.register({
        email: 'exists@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService#login', () => {
  async function seedLocalUser(
    password: string,
    overrides?: Partial<FakeUser>,
  ) {
    const bcrypt = await import('bcrypt');
    return {
      id: 'u-1',
      email: 'user@example.com',
      password: await bcrypt.hash(password, 10),
      name: 'User',
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: false,
      deletedAt: null,
      ...overrides,
    };
  }

  it('rejects an unknown email', async () => {
    const { prisma } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.login({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects the wrong password and logs the failed attempt', async () => {
    const user = await seedLocalUser('correct-password');
    const { prisma, rawPrisma } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.login({
        email: user.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const loggedCall = rawPrisma.loginEvent.create.mock.calls[0][0];
    expect(loggedCall.data.success).toBe(false);
  });

  it('rejects login for a soft-deleted account', async () => {
    const user = await seedLocalUser('correct-password', {
      deletedAt: new Date(),
    });
    const { prisma } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.login({
        email: user.email,
        password: 'correct-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns tokens for a correct password when 2FA is disabled', async () => {
    const user = await seedLocalUser('correct-password');
    const { prisma } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect('twoFactorRequired' in result).toBe(false);
    if (!('twoFactorRequired' in result)) {
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(user.email);
    }
  });

  it('returns a tempToken instead of full tokens when 2FA is enabled', async () => {
    const user = await seedLocalUser('correct-password', {
      twoFactorEnabled: true,
    });
    const { prisma } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result).toHaveProperty('twoFactorRequired', true);
    expect(result).toHaveProperty('tempToken');
  });
});

describe('AuthService#verifyTwoFactor', () => {
  it('rejects an invalid or expired temp token', async () => {
    const { prisma } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.verifyTwoFactor('not-a-real-token', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a wrong 2FA code', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: 'hashed',
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: true,
      deletedAt: null,
    };
    const { prisma } = makePrisma([user]);
    const jwt = makeFakeJwt();
    const service = new AuthService(
      prisma,
      jwt,
      makeEmail(),
      makeTwoFactor({ verifyCode: false }),
    );
    const tempToken = jwt.sign({ sub: user.id, twofa: true });

    await expect(
      service.verifyTwoFactor(tempToken, '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues full tokens for a correct 2FA code', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: 'hashed',
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: true,
      deletedAt: null,
    };
    const { prisma } = makePrisma([user]);
    const jwt = makeFakeJwt();
    const service = new AuthService(
      prisma,
      jwt,
      makeEmail(),
      makeTwoFactor({ verifyCode: true }),
    );
    const tempToken = jwt.sign({ sub: user.id, twofa: true });

    const result = await service.verifyTwoFactor(tempToken, '123456');

    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe(user.email);
  });
});

describe('AuthService#oauthLogin', () => {
  it('creates a new user on first OAuth login', async () => {
    const { prisma, users } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.oauthLogin({
      providerId: 'google-123',
      provider: 'GOOGLE',
      email: 'oauth@example.com',
      emailVerified: true,
      name: 'OAuth User',
    });

    expect(users.size).toBe(1);
    expect(result.user.email).toBe('oauth@example.com');
  });

  it('logs an existing OAuth user back in without creating a duplicate', async () => {
    const { prisma, users } = makePrisma([
      {
        id: 'u-1',
        email: 'oauth@example.com',
        password: null,
        name: 'OAuth User',
        avatar: null,
        role: 'USER',
        provider: 'GOOGLE',
        providerId: 'google-123',
        twoFactorEnabled: false,
        deletedAt: null,
      },
    ]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await service.oauthLogin({
      providerId: 'google-123',
      provider: 'GOOGLE',
      email: 'oauth@example.com',
      emailVerified: true,
      name: 'OAuth User',
    });

    expect(users.size).toBe(1);
  });

  it('links an existing local account by email on first OAuth login', async () => {
    const { prisma, users } = makePrisma([
      {
        id: 'u-1',
        email: 'shared@example.com',
        password: 'hashed',
        name: 'Local User',
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        twoFactorEnabled: false,
        deletedAt: null,
      },
    ]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await service.oauthLogin({
      providerId: 'google-999',
      provider: 'GOOGLE',
      email: 'shared@example.com',
      emailVerified: true,
      name: 'Local User',
    });

    expect(users.size).toBe(1);
    expect(users.get('u-1')?.provider).toBe('GOOGLE');
    expect(users.get('u-1')?.providerId).toBe('google-999');
  });

  it('does not link an existing account when the OAuth email is unverified', async () => {
    const { prisma, users } = makePrisma([
      {
        id: 'u-1',
        email: 'shared@example.com',
        password: 'hashed',
        name: 'Local User',
        avatar: null,
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        twoFactorEnabled: false,
        deletedAt: null,
      },
    ]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.oauthLogin({
        providerId: 'discord-999',
        provider: 'DISCORD',
        email: 'shared@example.com',
        emailVerified: false,
        name: 'Attacker',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // Hisob bog'lanmagan va o'zgarmagan bo'lishi kerak
    expect(users.size).toBe(1);
    expect(users.get('u-1')?.provider).toBe('LOCAL');
    expect(users.get('u-1')?.providerId).toBeNull();
  });

  it('rejects OAuth login for a soft-deleted account', async () => {
    const { prisma } = makePrisma([
      {
        id: 'u-1',
        email: 'deleted@example.com',
        password: null,
        name: null,
        avatar: null,
        role: 'USER',
        provider: 'GOOGLE',
        providerId: 'google-1',
        twoFactorEnabled: false,
        deletedAt: new Date(),
      },
    ]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.oauthLogin({
        providerId: 'google-1',
        provider: 'GOOGLE',
        email: 'deleted@example.com',
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService#refreshSession', () => {
  it('rejects an unknown refresh token', async () => {
    const { prisma } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.refreshSession('not-a-real-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates a valid refresh token and returns new tokens', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: null,
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: false,
      deletedAt: null,
    };
    const { prisma, refreshTokens } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );
    const refreshToken = seedRefreshToken(refreshTokens, user.id);

    const result = await service.refreshSession(refreshToken);

    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);
  });

  it('revokes every session on refresh-token reuse (compromise detection)', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: null,
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: false,
      deletedAt: null,
    };
    const { prisma, refreshTokens } = makePrisma([user]);
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );
    const refreshToken = seedRefreshToken(refreshTokens, user.id);
    // Bir marta ishlatib qo'yamiz (rotate) — token endi revoked bo'ladi.
    await service.refreshSession(refreshToken);

    // Xuddi shu (endi revoked) tokenni yana ishlatishga urinish — o'g'irlik
    // belgisi.
    await expect(service.refreshSession(refreshToken)).rejects.toThrow(
      /reuse detected/i,
    );

    // Barcha tokenlar (yangi rotated bo'lgani ham) bekor qilingan bo'lishi kerak.
    for (const rt of refreshTokens.values()) {
      expect(rt.revokedAt).not.toBeNull();
    }
  });
});

describe('AuthService#forgotPassword / resetPassword', () => {
  it('returns the same generic message whether or not the email exists (no enumeration)', async () => {
    const { prisma } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.forgotPassword({
      email: 'nobody@example.com',
    });

    expect(result.message).toBe("Agar email mavjud bo'lsa, xabar yuborildi");
  });

  it('rejects an unknown reset token', async () => {
    const { prisma } = makePrisma();
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.resetPassword({
        token: 'unknown',
        password: 'newpassword123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired reset token', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: 'hashed',
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: false,
      deletedAt: null,
    };
    const { prisma, resetTokens } = makePrisma([user]);
    resetTokens.set(sha256Hex('expired-token'), {
      id: 'prt-1',
      userId: user.id,
      token: sha256Hex('expired-token'),
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    await expect(
      service.resetPassword({
        token: 'expired-token',
        password: 'newpassword123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the password and revokes existing sessions on a valid reset', async () => {
    const user = {
      id: 'u-1',
      email: 'user@example.com',
      password: 'old-hash',
      name: null,
      avatar: null,
      role: 'USER',
      provider: 'LOCAL',
      providerId: null,
      twoFactorEnabled: false,
      deletedAt: null,
    };
    const { prisma, resetTokens, refreshTokens } = makePrisma([user]);
    resetTokens.set(sha256Hex('valid-token'), {
      id: 'prt-1',
      userId: user.id,
      token: sha256Hex('valid-token'),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    refreshTokens.set('some-hash', {
      id: 'rt-existing',
      userId: user.id,
      tokenHash: 'some-hash',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const service = new AuthService(
      prisma,
      makeFakeJwt(),
      makeEmail(),
      makeTwoFactor(),
    );

    const result = await service.resetPassword({
      token: 'valid-token',
      password: 'brand-new-password',
    });

    expect(result.message).toBe('Password updated successfully');
    expect(resetTokens.get(sha256Hex('valid-token'))?.usedAt).not.toBeNull();
    expect(refreshTokens.get('some-hash')?.revokedAt).not.toBeNull();
  });
});
