import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ApiKeyGuard } from './api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ─── API Key management (JWT auth) ──────────────────────────────────────────
@UseGuards(JwtGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body('name') name: string,
    @Body('expiresInDays') expiresInDays?: number,
  ) {
    return this.apiKeysService.create(userId, name, expiresInDays);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.apiKeysService.findAll(userId);
  }

  @Delete(':id')
  revoke(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.apiKeysService.revoke(userId, id);
  }
}

// ─── Public API (API Key auth) ───────────────────────────────────────────────
@UseGuards(ApiKeyGuard)
@Controller('api/v1')
export class PublicApiController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get('stats')
  getStats(
    @CurrentUser('id') userId: string,
    @Query('domain') domain: string,
    @Query('period') period: string,
  ) {
    return this.apiKeysService.getWebsiteStats(userId, domain, period);
  }
}
