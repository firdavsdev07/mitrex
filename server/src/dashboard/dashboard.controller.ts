import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from '../sync/sync.service';

@UseGuards(JwtGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly syncService: SyncService,
  ) {}

  @Get()
  getOverview(
    @CurrentUser('id') userId: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.dashboardService.getOverview(userId, period);
  }

  @Get('history/:platform')
  getPlatformHistory(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Query('days') days: string,
  ) {
    return this.dashboardService.getPlatformHistory(userId, platform, parseInt(days) || 30);
  }

  @Get('sync')
  syncNow(@CurrentUser('id') userId: string) {
    return this.syncService.syncUser(userId);
  }
}
