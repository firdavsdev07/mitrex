import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  // Barcha aktiv planlar (public)
  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Admin: barcha planlar
  findAllAdmin() {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.plan.findUnique({ where: { slug } });
  }

  create(data: {
    name: string;
    slug: string;
    price: number;
    currency?: string;
    maxWebsites: number;
    maxPlatforms: number;
    maxMonthlyViews: number;
    hasAiInsights?: boolean;
    hasWeeklyReport?: boolean;
    hasCustomAlerts?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.plan.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      price: number;
      maxWebsites: number;
      maxPlatforms: number;
      maxMonthlyViews: number;
      hasAiInsights: boolean;
      hasWeeklyReport: boolean;
      hasCustomAlerts: boolean;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.plan.update({ where: { id }, data });
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    // Soft delete — isActive = false
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Foydalanuvchi subscription
  async getUserSubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) {
      // Subscription yo'q bo'lsa — free plan
      const freePlan = await this.findBySlug('free');
      return { plan: freePlan, status: 'ACTIVE', isDefault: true };
    }
    return sub;
  }

  async changePlan(userId: string, planSlug: string) {
    const plan = await this.findBySlug(planSlug);
    if (!plan || !plan.isActive)
      throw new BadRequestException('Plan not found yoki aktiv emas');

    return this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        canceledAt: null,
      },
      include: { plan: true },
    });
  }

  // Foydalanuvchining hozirgi plan limitlarini olish
  async getUserLimits(userId: string) {
    const sub = await this.getUserSubscription(userId);
    const plan = sub.plan;
    if (!plan)
      return { maxWebsites: 1, maxPlatforms: 2, maxMonthlyViews: 5000 };
    return {
      maxWebsites: plan.maxWebsites,
      maxPlatforms: plan.maxPlatforms,
      maxMonthlyViews: plan.maxMonthlyViews,
      hasAiInsights: plan.hasAiInsights,
      hasWeeklyReport: plan.hasWeeklyReport,
      hasCustomAlerts: plan.hasCustomAlerts,
    };
  }
}
