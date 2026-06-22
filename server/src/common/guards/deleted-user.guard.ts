import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DeletedUserGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (user?.deletedAt) {
      throw new ForbiddenException('Hisobingiz o\'chirilgan. Tiklash uchun emailingizni tekshiring.');
    }
    return true;
  }
}
