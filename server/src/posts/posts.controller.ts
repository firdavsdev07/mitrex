import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const TOP_METRICS = [
  'views',
  'likes',
  'comments',
  'engagementRate',
  'follows',
] as const;
type TopMetric = (typeof TOP_METRICS)[number];

function clampInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = parseInt(value ?? '', 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

@ApiTags('posts')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('connections/:connectionId/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List posts/videos for a connection' })
  @ApiParam({ name: 'connectionId', description: 'Connection UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Default 20',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Default 0',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of posts with engagement stats',
  })
  getPosts(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.getPosts(
      userId,
      connectionId,
      clampInt(limit, 20, 1, 100),
      clampInt(offset, 0, 0, 100_000),
    );
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top performing posts by a given metric' })
  @ApiParam({ name: 'connectionId', description: 'Connection UUID' })
  @ApiQuery({
    name: 'metric',
    enum: ['views', 'likes', 'comments', 'engagementRate', 'follows'],
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Top posts sorted by metric' })
  getTopPosts(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Query('metric') metric?: string,
  ) {
    // Whitelist — aks holda ixtiyoriy string Prisma orderBy'ga tushib 500 beradi
    const safeMetric: TopMetric = TOP_METRICS.includes(metric as TopMetric)
      ? (metric as TopMetric)
      : 'views';
    return this.postsService.getTopPosts(userId, connectionId, safeMetric);
  }
}
