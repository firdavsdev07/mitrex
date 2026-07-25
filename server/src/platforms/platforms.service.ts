import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class PlatformsService {
  constructor(private readonly prisma: PrismaService) {}

  // Foydalanuvchilar uchun — barcha platformalar ro'yxati (ulangan holati bilan)
  async findAll(userId: string) {
    const [configs, connections] = await Promise.all([
      this.prisma.platformConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.connection.findMany({
        where: { userId, isActive: true },
        select: { platform: true, platformUsername: true },
      }),
    ]);

    const connectedMap = new Map(
      connections.map((c) => [c.platform, c.platformUsername]),
    );

    return configs.map((cfg) => ({
      slug: cfg.slug,
      displayName: cfg.displayName,
      description: cfg.description,
      iconUrl: cfg.iconUrl,
      enabled: cfg.enabled,
      comingSoon: cfg.comingSoon,
      connected: connectedMap.has(cfg.slug),
      connectedAs: connectedMap.get(cfg.slug) ?? null,
    }));
  }

  // Admin — bitta platformani toggle qilish
  async toggle(
    slug: Platform,
    data: { enabled?: boolean; comingSoon?: boolean },
  ) {
    const config = await this.prisma.platformConfig.findUnique({
      where: { slug },
    });
    if (!config) throw new NotFoundException('Platform not found');

    return this.prisma.platformConfig.update({
      where: { slug },
      data: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.comingSoon !== undefined && { comingSoon: data.comingSoon }),
      },
    });
  }

  // Admin — barcha platformalar (to'liq ma'lumot)
  async findAllAdmin() {
    return this.prisma.platformConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }
}
