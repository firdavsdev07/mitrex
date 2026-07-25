import { BadRequestException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import type { PrismaService } from '../prisma/prisma.service';

interface ApiKeyRow {
  id: string;
  userId: string;
  name: string;
  key: string;
  keyPrefix: string;
  expiresAt: Date | null;
  isActive: boolean;
  lastUsedAt: Date | null;
}

function makePrisma() {
  const rows: ApiKeyRow[] = [];
  return {
    apiKey: {
      count: jest.fn().mockImplementation(() => Promise.resolve(rows.length)),
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Partial<ApiKeyRow> }) => {
          const row = {
            id: `k${rows.length + 1}`,
            isActive: true,
            lastUsedAt: null,
            ...data,
          } as ApiKeyRow;
          rows.push(row);
          return Promise.resolve(row);
        }),
      findUnique: jest
        .fn()
        .mockImplementation(
          ({ where }: { where: { key?: string; id?: string } }) => {
            const row = rows.find(
              (r) => r.key === where.key || r.id === where.id,
            );
            if (!row) return Promise.resolve(null);
            return Promise.resolve({
              ...row,
              user: {
                id: 'u1',
                email: 'u1@example.com',
                role: 'USER',
                deletedAt: null,
              },
            });
          },
        ),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([...rows])),
      update: jest
        .fn()
        .mockImplementation(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<ApiKeyRow>;
          }) => {
            const row = rows.find((r) => r.id === where.id);
            if (row) Object.assign(row, data);
            return Promise.resolve(row);
          },
        ),
    },
  } as unknown as PrismaService;
}

describe('ApiKeysService', () => {
  it('never stores the raw key — only its hash', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    const created = await service.create('u1', 'My script');

    expect(created.key).toMatch(/^mk_live_/); // returned once to the user
    const storedCall = (
      prisma.apiKey.create as unknown as jest.Mock<
        unknown,
        [{ data: Partial<ApiKeyRow> }]
      >
    ).mock.calls[0][0];
    expect(storedCall.data.key).not.toBe(created.key);
    expect(storedCall.data.key).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it('validate() accepts the raw key returned at creation time', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    const created = await service.create('u1', 'My script');

    const user = await service.validate(created.key);
    expect(user?.id).toBe('u1');
  });

  it('validate() rejects a made-up key', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    await service.create('u1', 'My script');

    const user = await service.validate('mk_live_not_a_real_key');
    expect(user).toBeNull();
  });

  it('validate() rejects a revoked key', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    const created = await service.create('u1', 'My script');
    await service.revoke('u1', created.id);

    expect(await service.validate(created.key)).toBeNull();
  });

  it('findAll() masks the key down to its prefix', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    await service.create('u1', 'My script');

    const list = await service.findAll('u1');
    expect(list[0].key).toMatch(/^mk_live_.*\.\.\.$/);
  });

  it('refuses to create a 6th active key', async () => {
    const prisma = makePrisma();
    const service = new ApiKeysService(prisma);
    for (let i = 0; i < 5; i++) await service.create('u1', `key-${i}`);

    await expect(service.create('u1', 'one-too-many')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
