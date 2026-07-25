import { Controller, Get, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { WebsitesService } from './websites.service';

// Auth'siz — faqat sayt egasi shareId'ni yoqqan (enableShare) bo'lsa ochiladi.
// shareId 16 hex belgidan iborat tasodifiy token, taxmin qilib topib
// bo'lmaydi — shuning uchun alohida ruxsat tekshiruvi shart emas.
@ApiTags('public')
@Controller('public/dashboard')
export class PublicWebsiteController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get(':shareId')
  @Throttle({
    short: { ttl: 1000, limit: 10 },
    medium: { ttl: 60000, limit: 100 },
  })
  @ApiOperation({ summary: 'Get a public read-only analytics snapshot' })
  @ApiParam({ name: 'shareId', description: 'Public share token' })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Public overview + trend + top pages',
  })
  @ApiResponse({ status: 404, description: 'Link disabled or not found' })
  getSnapshot(
    @Param('shareId') shareId: string,
    @Query('period') period?: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getPublicSnapshot(shareId, period);
  }
}
