import { Controller, Get, Post, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Saqlangan insightlar ro'yxati
  @Get('insights')
  getInsights(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getInsights(userId, type, limit ? parseInt(limit) : 10);
  }

  // Haftalik insight qo'lda yaratish
  @Post('insights/weekly')
  generateWeekly(@CurrentUser('id') userId: string) {
    return this.aiService.generateWeeklyInsight(userId).then((content) => ({ content }));
  }

  // Sayt uchun insight
  @Post('insights/website/:websiteId')
  generateWebsiteInsight(
    @CurrentUser('id') userId: string,
    @Param('websiteId') websiteId: string,
  ) {
    return this.aiService.generateWebsiteInsight(userId, websiteId).then((content) => ({ content }));
  }
}
