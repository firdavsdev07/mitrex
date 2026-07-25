import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, Prisma } from '@metrix/prisma-client';
import { CreatePlanDto, UpdatePlanDto } from '../plans/dto/create-plan.dto';

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
