import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader?.startsWith('Bearer mk_live_')) {
      throw new UnauthorizedException('Valid API key required');
    }
    const key = authHeader.replace('Bearer ', '');
    const user = await this.apiKeysService.validate(key);
    if (!user) throw new UnauthorizedException('Invalid or expired API key');
    req.user = user;
    return true;
  }
}
