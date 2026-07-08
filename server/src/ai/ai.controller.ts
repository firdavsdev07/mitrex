import { Controller, Get, Post, Delete, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('ai')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('insights')
  @ApiOperation({ summary: 'List saved AI insights' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type: WEEKLY, DAILY, WEBSITE, POST, CUSTOM' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Max results (default 10)' })
  @ApiResponse({ status: 200, description: 'Array of AI insights' })
  getInsights(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getInsights(userId, type, limit ? parseInt(limit) : 10);
  }

  @Post('insights/weekly')
  @ApiOperation({ summary: 'Generate a weekly AI insight on demand' })
  @ApiResponse({ status: 201, description: 'AI-generated weekly summary' })
  generateWeekly(@CurrentUser('id') userId: string) {
    return this.aiService.generateWeeklyInsight(userId).then((content) => ({ content }));
  }

  @Post('insights/website/:websiteId')
  @ApiOperation({ summary: 'Generate an AI insight for a specific website' })
  @ApiParam({ name: 'websiteId', description: 'Website ID' })
  @ApiResponse({ status: 201, description: 'AI-generated website insight' })
  generateWebsiteInsight(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.aiService.generateWebsiteInsight(userId, websiteId).then((content) => ({ content }));
  }

  @Post('insights/monthly')
  @ApiOperation({ summary: 'Generate a monthly AI insight (last 30 days)' })
  @ApiResponse({ status: 201, description: 'AI-generated monthly summary' })
  generateMonthly(@CurrentUser('id') userId: string) {
    return this.aiService.generateMonthlyInsight(userId).then((content) => ({ content }));
  }

  @Post('insights/yearly')
  @ApiOperation({ summary: 'Generate a yearly AI insight (last 365 days)' })
  @ApiResponse({ status: 201, description: 'AI-generated yearly summary' })
  generateYearly(@CurrentUser('id') userId: string) {
    return this.aiService.generateYearlyInsight(userId).then((content) => ({ content }));
  }

  @Post('insights/platform/:platform')
  @ApiOperation({ summary: 'Generate an AI insight for a connected platform' })
  @ApiParam({ name: 'platform', description: 'Platform slug e.g. YOUTUBE, TELEGRAM' })
  @ApiResponse({ status: 201, description: 'AI-generated platform insight' })
  generatePlatformInsight(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
  ) {
    return this.aiService.generatePlatformInsight(userId, platform.toUpperCase()).then((content) => ({ content }));
  }

  @Delete('insights/:id')
  @ApiOperation({ summary: 'Delete a saved insight' })
  @ApiParam({ name: 'id', description: 'Insight ID' })
  @ApiResponse({ status: 200, description: 'Insight deleted' })
  deleteInsight(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.aiService.deleteInsight(userId, id);
  }
}
