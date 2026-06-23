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
import { Platform } from '@metrix/prisma-client';

@ApiTags('posts')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('connections/:platform/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List posts/videos for a connected platform' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Platform slug' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Default 20' })
  @ApiQuery({ name: 'offset', required: false, type: 'number', description: 'Default 0' })
  @ApiResponse({ status: 200, description: 'Paginated list of posts with engagement stats' })
  getPosts(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: Platform,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.getPosts(userId, platform, parseInt(limit || '20'), parseInt(offset || '0'));
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top performing posts by a given metric' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Platform slug' })
  @ApiQuery({ name: 'metric', enum: ['views', 'likes', 'comments', 'engagementRate'], required: false })
  @ApiResponse({ status: 200, description: 'Top posts sorted by metric' })
  getTopPosts(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: Platform,
    @Query('metric') metric: 'views' | 'likes' | 'comments' | 'engagementRate',
  ) {
    return this.postsService.getTopPosts(userId, platform, metric);
  }
}
