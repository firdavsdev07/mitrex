import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WebsitesService } from './websites.service';
import { TrackingService } from '../tracking/tracking.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('websites')
export class WebsitesController {
  constructor(
    private readonly websitesService: WebsitesService,
    private readonly trackingService: TrackingService,
  ) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWebsiteDto) {
    return this.websitesService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.websitesService.findAll(userId);
  }

  @Get(':id/script')
  getScript(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.getScript(userId, id);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getAnalytics(userId, id, period);
  }

  @Get(':id/analytics/pages')
  getPages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getPages(userId, id, period);
  }

  @Get(':id/analytics/sessions')
  getSessions(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getSessions(userId, id, period);
  }

  @Get(':id/analytics/sources')
  getSources(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getSources(userId, id, period);
  }

  @Get(':id/realtime')
  getRealtime(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.getRealtime(userId, id);
  }

  @Get(':id/events')
  getEvents(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.trackingService.getEventStats(id, period);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.remove(userId, id);
  }
}
