import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SyncService } from '../sync/sync.service';

@ApiTags('dashboard')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly syncService: SyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregated overview: web + all platforms' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Overview data for all connected sources' })
  getOverview(
    @CurrentUser('id') userId: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.dashboardService.getOverview(userId, period);
  }

  @Get('history/:platform')
  @ApiOperation({ summary: 'Get follower/views history chart data for a platform' })
  @ApiParam({ name: 'platform', description: 'Platform slug e.g. YOUTUBE, TELEGRAM' })
  @ApiQuery({ name: 'days', type: 'number', required: false, description: 'Number of days (default 30)' })
  @ApiResponse({ status: 200, description: 'Daily stat series for charting' })
  getPlatformHistory(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Query('days') days: string,
  ) {
    return this.dashboardService.getPlatformHistory(userId, platform, parseInt(days) || 30);
  }

  @Get('sync')
  @ApiOperation({ summary: 'Manually sync all connected platforms now' })
  @ApiResponse({ status: 200, description: 'Sync started' })
  syncNow(@CurrentUser('id') userId: string) {
    return this.syncService.syncUser(userId);
  }
}
