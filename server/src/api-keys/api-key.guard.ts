import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey?.startsWith('mk_live_')) {
      throw new UnauthorizedException(
        'Valid API key required (X-API-Key: mk_live_...)',
      );
    }
    const user = await this.apiKeysService.validate(apiKey);
    if (!user) throw new UnauthorizedException('Invalid or expired API key');
    req.user = user;
    return true;
  }
}
