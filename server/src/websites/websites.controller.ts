import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { WebsitesService } from './websites.service';
import { TrackingService } from '../tracking/tracking.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('websites')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('websites')
export class WebsitesController {
  constructor(
    private readonly websitesService: WebsitesService,
    private readonly trackingService: TrackingService,
  ) {}

  @Post()
  @UseGuards(PlanGuard)
  @PlanLimit('websites')
  @ApiOperation({ summary: 'Add a new website' })
  @ApiResponse({ status: 201, description: 'Website created with a unique tracking key' })
  @ApiResponse({ status: 403, description: 'Plan website limit reached' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWebsiteDto) {
    return this.websitesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all websites for current user' })
  @ApiResponse({ status: 200, description: 'Array of websites' })
  findAll(@CurrentUser('id') userId: string) {
    return this.websitesService.findAll(userId);
  }

  @Get(':id/script')
  @ApiOperation({ summary: 'Get the embed script tag for a website' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiResponse({ status: 200, description: 'HTML script tag to embed on the site' })
  getScript(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.getScript(userId, id);
  }

  @Get(':id/analytics/trend')
  @ApiOperation({ summary: 'Get daily visitors + pageviews trend for charting' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Daily { date, visitors, views }[]' })
  getTrend(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getTrend(userId, id, period);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get overview analytics (visitors, views, bounce rate)' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Analytics overview' })
  getAnalytics(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getAnalytics(userId, id, period);
  }

  @Get(':id/analytics/pages')
  @ApiOperation({ summary: 'Get top pages breakdown' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Page view counts per path' })
  getPages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getPages(userId, id, period);
  }

  @Get(':id/analytics/sessions')
  @ApiOperation({ summary: 'Get session list with device/browser/country' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Session breakdown' })
  getSessions(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getSessions(userId, id, period);
  }

  @Get(':id/analytics/sources')
  @ApiOperation({ summary: 'Get traffic sources (referrers, UTM campaigns)' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Traffic source breakdown' })
  getSources(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.websitesService.getSources(userId, id, period);
  }

  @Get(':id/realtime')
  @ApiOperation({ summary: 'Get real-time active visitors (last 5 minutes)' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiResponse({ status: 200, description: 'Real-time visitor count and pages' })
  getRealtime(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.getRealtime(userId, id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get custom event stats grouped by name' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Custom event breakdown by name' })
  getEvents(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.trackingService.getEventStats(id, period);
  }

  @Get(':id/events/:name')
  @ApiOperation({ summary: 'Get recent event instances for a specific event name' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiParam({ name: 'name', description: 'Event name' })
  @ApiQuery({ name: 'period', enum: ['today', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Last 20 event instances with properties' })
  getEventDetail(
    @CurrentUser('id') _userId: string,
    @Param('id') id: string,
    @Param('name') name: string,
    @Query('period') period: 'today' | 'week' | 'month',
  ) {
    return this.trackingService.getEventDetail(id, name, period);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a website and all its data' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiResponse({ status: 200, description: 'Website deleted' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.websitesService.remove(userId, id);
  }
}
