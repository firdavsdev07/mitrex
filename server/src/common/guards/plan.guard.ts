import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { getEffectivePlan } from '../utils/plan.util';
import { AuthenticatedRequest } from '../../auth/types/jwt-user.type';

export const PlanLimit = (resource: 'websites' | 'platforms') =>
  SetMetadata('planLimit', resource);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>('planLimit', ctx.getHandler());
    if (!resource) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.user?.id;
    if (!userId) return true;

    const plan = await getEffectivePlan(this.prisma, userId);
    if (!plan) return true;

    if (resource === 'websites') {
      if (plan.maxWebsites === -1) return true;
      const count = await this.prisma.website.count({ where: { userId } });
      if (count >= plan.maxWebsites) {
        throw new ForbiddenException(
          `Your "${plan.name}" plan website limit reached (${plan.maxWebsites} ). Please upgrade your plan.`,
        );
      }
    }

    if (resource === 'platforms') {
      if (plan.maxPlatforms === -1) return true;
      const count = await this.prisma.connection.count({
        where: { userId, isActive: true },
      });
      if (count >= plan.maxPlatforms) {
        throw new ForbiddenException(
          `Your "${plan.name}" plan platform limit reached (${plan.maxPlatforms} ). Please upgrade your plan.`,
        );
      }
    }

    return true;
  }
}
