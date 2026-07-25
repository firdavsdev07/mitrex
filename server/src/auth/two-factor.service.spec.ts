process.env.ENCRYPTION_KEY = 'b'.repeat(64);

import { authenticator } from 'otplib';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import type { PrismaService } from '../prisma/prisma.service';

interface TwoFactorUser {
  id: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  password?: string;
}

function makePrisma(user: TwoFactorUser) {
  const state = { ...user };
  return {
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ ...state })),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: Partial<TwoFactorUser> }) => {
          Object.assign(state, data);
          return Promise.resolve({ ...state });
        }),
    },
  } as unknown as PrismaService;
}

describe('TwoFactorService', () => {
  it('generateSetup stores an encrypted secret and returns a QR code', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    const service = new TwoFactorService(prisma);

    const res = await service.generateSetup('u1', 'user@example.com');
    expect(res.secret).toMatch(/^[A-Z2-7]+$/); // base32
    expect(res.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    // Stored value must not be the raw secret
    expect(
      (
        prisma.user.update as unknown as jest.Mock<
          unknown,
          [{ data: Partial<TwoFactorUser> }]
        >
      ).mock.calls[0][0].data.twoFactorSecret,
    ).not.toBe(res.secret);
  });

  it('generateSetup refuses to run again once 2FA is already enabled', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: true,
      twoFactorSecret: 'x',
    });
    const service = new TwoFactorService(prisma);
    await expect(
      service.generateSetup('u1', 'user@example.com'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirm rejects an incorrect TOTP code', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    const service = new TwoFactorService(prisma);
    await service.generateSetup('u1', 'user@example.com');

    await expect(service.confirm('u1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('confirm accepts a code generated against the stored secret', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    const service = new TwoFactorService(prisma);
    const { secret } = await service.generateSetup('u1', 'user@example.com');

    const code = authenticator.generate(secret);
    const res = await service.confirm('u1', code);
    expect(res).toEqual({ enabled: true });
  });

  it('verifyCode returns false when 2FA is not enabled', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    const service = new TwoFactorService(prisma);
    expect(await service.verifyCode('u1', '123456')).toBe(false);
  });

  it('verifyCode returns true for a valid code once enabled', async () => {
    const prisma = makePrisma({
      id: 'u1',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    const service = new TwoFactorService(prisma);
    const { secret } = await service.generateSetup('u1', 'user@example.com');
    await service.confirm('u1', authenticator.generate(secret));

    expect(await service.verifyCode('u1', authenticator.generate(secret))).toBe(
      true,
    );
    expect(await service.verifyCode('u1', '000000')).toBe(false);
  });
});
