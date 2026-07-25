import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { sha256Hex } from '../common/utils/crypto.util';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string, expiresInDays?: number) {
    // Max 5 active keys per user
    const count = await this.prisma.apiKey.count({
      where: { userId, isActive: true },
    });
    if (count >= 5)
      throw new BadRequestException('Maximum 5 active API keys allowed');

    // Format: mk_live_<40 random hex chars>
    const rawKey = `mk_live_${crypto.randomBytes(20).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Faqat hash saqlanadi — xom kalit hech qachon DBga yozilmaydi
    const apiKey = await this.prisma.apiKey.create({
      data: { userId, name, key: sha256Hex(rawKey), keyPrefix, expiresAt },
    });

    // Return the raw key only once
    return {
      ...apiKey,
      key: rawKey,
      warning: 'Save this key — it will not be shown again',
    };
  }

  async findAll(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        keyPrefix: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      ...k,
      key: `${k.keyPrefix ?? 'mk_live_'}...`,
    }));
  }

  async revoke(userId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId)
      throw new NotFoundException('API key not found');
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    return { revoked: true };
  }

  // Validate API key (used by ApiKeyGuard) — raw key kelib, hash bo'yicha qidiriladi
  async validate(rawKey: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: sha256Hex(rawKey) },
      include: {
        user: {
          select: { id: true, email: true, role: true, deletedAt: true },
        },
      },
    });

    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
    if (apiKey.user.deletedAt) return null;

    // Update lastUsedAt (non-blocking)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return apiKey.user;
  }

  // Public API: get aggregated stats for a website by API key
  async getWebsiteStats(userId: string, domain: string, period = 'week') {
    const website = await this.prisma.website.findFirst({
      where: { userId, domain },
    });
    if (!website) throw new NotFoundException('Website not found');

    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === 'week') from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);

    const [views, sessions] = await Promise.all([
      this.prisma.pageView.count({
        where: { websiteId: website.id, createdAt: { gte: from } },
      }),
      this.prisma.session.count({
        where: { websiteId: website.id, startedAt: { gte: from } },
      }),
    ]);

    return { domain, period, views, sessions, websiteId: website.id };
  }
}
