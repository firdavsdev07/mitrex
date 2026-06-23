import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('export')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('websites/:id/pageviews')
  @ApiOperation({ summary: 'Export page views as CSV' })
  @ApiParam({ name: 'id', description: 'Website ID' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'all'], required: false })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download', content: { 'text/csv': {} } })
  async exportPageviews(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period: 'week' | 'month' | 'all',
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportWebsitePageviews(userId, id, period);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pageviews-${id}-${period || 'month'}.csv"`);
    res.send(csv);
  }

  @Get('connections/:platform/stats')
  @ApiOperation({ summary: 'Export platform stats as CSV' })
  @ApiParam({ name: 'platform', description: 'Platform slug e.g. YOUTUBE' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download', content: { 'text/csv': {} } })
  async exportPlatformStats(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportPlatformStats(userId, platform);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${platform.toLowerCase()}-stats.csv"`);
    res.send(csv);
  }

  @Get('connections/:platform/posts')
  @ApiOperation({ summary: 'Export post stats as CSV' })
  @ApiParam({ name: 'platform', description: 'Platform slug e.g. YOUTUBE' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download', content: { 'text/csv': {} } })
  async exportPosts(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.exportPosts(userId, platform);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${platform.toLowerCase()}-posts.csv"`);
    res.send(csv);
  }

  @Get('my-data')
  @ApiOperation({ summary: 'Export all user data as JSON (GDPR data portability)' })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'JSON file download with all user data', content: { 'application/json': {} } })
  async exportUserData(@CurrentUser('id') userId: string, @Res() res: Response) {
    const data = await this.exportService.exportUserData(userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="metrix-my-data.json"');
    res.send(JSON.stringify(data, null, 2));
  }
}
