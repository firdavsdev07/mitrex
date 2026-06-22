import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Platform } from '@metrix/prisma-client';

@UseGuards(JwtGuard)
@Controller('connections/:platform/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  getPosts(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: Platform,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.getPosts(userId, platform, parseInt(limit || '20'), parseInt(offset || '0'));
  }

  @Get('top')
  getTopPosts(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: Platform,
    @Query('metric') metric: 'views' | 'likes' | 'comments' | 'engagementRate',
  ) {
    return this.postsService.getTopPosts(userId, platform, metric);
  }
}
