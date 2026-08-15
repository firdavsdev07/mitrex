import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { CreatePlanDto, UpdatePlanDto } from '../plans/dto/create-plan.dto';

// Sync cron'i har 6 soatda ishlaydi; 12 soat — ketma-ket ikki siklning
// o'tkazib yuborilgani, ya'ni tasodifiy kechikish emas.
const STALE_SYNC_HOURS = 12;

// Ulanishlarning yarmidan ko'pi eskirgan bo'lsa muammo tizimli (cron yoki
// Redis to'xtagan); bir qismi eskirgan bo'lsa — alohida ulanishlar muammosi.
export function syncStatusOf(
  lastSyncAt: Date | null,
  stale: number,
  total: number,
): 'ok' | 'degraded' | 'down' | 'idle' {
  if (total === 0) return 'idle';
  if (!lastSyncAt) return 'down';
  if (stale === 0) return 'ok';
  return stale >= total / 2 ? 'down' : 'degraded';
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard stats ──────────────────────────────────────────────────────

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      activeConnections,
      totalWebsites,
      totalViews,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: monthStart }, deletedAt: null },
      }),
      this.prisma.connection.count({ where: { isActive: true } }),
      this.prisma.website.count(),
      this.prisma.pageView.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    return {
      totalUsers,
      newUsersThisMonth,
      activeConnections,
      totalWebsites,
      totalViews,
    };
  }

  // ─── Sync salomatligi ─────────────────────────────────────────────────────
  // 6 soatlik cron jimgina to'xtab qolsa (Redis uzildi, konteyner qayta
  // ishga tushmadi, xato tashlandi) buni hech kim sezmaydi: ma'lumot
  // yangilanmaydi, lekin xato ham ko'rinmaydi. Shu sabab "oxirgi marta
  // qachon sinxronlangan" va "nechtasi eskirib qolgan" ko'rsatkichlari
  // admin panelga chiqariladi.

  async getSyncHealth() {
    const now = Date.now();
    // Cron har 6 soatda ishlaydi — 12 soatdan oshgani ikki siklni
    // o'tkazib yuborgani, ya'ni tizimda muammo borligini bildiradi.
    const staleThreshold = new Date(now - STALE_SYNC_HOURS * 60 * 60 * 1000);

    const [total, stale, failing, lastSynced, byPlatformRaw] =
      await Promise.all([
        this.prisma.connection.count({ where: { isActive: true } }),
        this.prisma.connection.count({
          where: {
            isActive: true,
            OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: staleThreshold } }],
          },
        }),
        this.prisma.connection.count({
          where: { isActive: true, lastSyncError: { not: null } },
        }),
        this.prisma.connection.findFirst({
          where: { isActive: true, lastSyncAt: { not: null } },
          orderBy: { lastSyncAt: 'desc' },
          select: { lastSyncAt: true },
        }),
        this.prisma.connection.groupBy({
          by: ['platform'],
          where: { isActive: true },
          _count: { _all: true },
          _max: { lastSyncAt: true },
        }),
      ]);

    // Xato bergan ulanishlarni platforma kesimida sanash — groupBy'ni
    // ikkinchi marta filtr bilan chaqirish o'rniga bitta so'rov.
    const failingByPlatform = await this.prisma.connection.groupBy({
      by: ['platform'],
      where: { isActive: true, lastSyncError: { not: null } },
      _count: { _all: true },
    });
    const failingMap = new Map(
      failingByPlatform.map((r) => [r.platform, r._count._all]),
    );

    const lastSyncAt = lastSynced?.lastSyncAt ?? null;

    return {
      // Umumiy holat — UI shu bitta qiymatga qarab rang tanlashi mumkin.
      status: syncStatusOf(lastSyncAt, stale, total),
      lastSyncAt,
      staleThresholdHours: STALE_SYNC_HOURS,
      connections: { total, stale, failing },
      byPlatform: byPlatformRaw
        .map((row) => ({
          platform: row.platform,
          total: row._count._all,
          failing: failingMap.get(row.platform) ?? 0,
          lastSyncAt: row._max.lastSyncAt,
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    deleted?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (!params.deleted) where.deletedAt = null;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          provider: true,
          deletedAt: true,
          createdAt: true,
          subscription: {
            select: { plan: { select: { name: true, slug: true } } },
          },
          _count: { select: { connections: true, websites: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        connections: {
          select: { platform: true, platformUsername: true, isActive: true },
        },
        websites: { select: { id: true, name: true, domain: true } },
        _count: { select: { connections: true, websites: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async banUser(id: string, banned: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    // Ban = deletedAt set (admin tomonidan)
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: banned ? new Date() : null,
        deleteReason: banned ? 'Blocked by admin' : null,
      },
      select: { id: true, email: true, deletedAt: true },
    });
  }

  async changeUserPlan(userId: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { slug: planSlug },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
      },
      update: { planId: plan.id, status: 'ACTIVE', canceledAt: null },
      include: { plan: true },
    });
  }

  // ─── Platforms ────────────────────────────────────────────────────────────

  async getPlatforms() {
    return this.prisma.platformConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async togglePlatform(
    slug: Platform,
    data: { enabled?: boolean; comingSoon?: boolean },
  ) {
    const config = await this.prisma.platformConfig.findUnique({
      where: { slug },
    });
    if (!config) throw new NotFoundException('Platform not found');
    return this.prisma.platformConfig.update({ where: { slug }, data });
  }

  // ─── Plans ────────────────────────────────────────────────────────────────

  async getPlans() {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPlan(data: CreatePlanDto) {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: UpdatePlanDto) {
    return this.prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
