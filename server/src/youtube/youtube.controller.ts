import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { YoutubeService } from './youtube.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('youtube')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('connect')
  @UseGuards(PlanGuard)
  @PlanLimit('platforms')
  @ApiOperation({ summary: 'Connect YouTube channel by handle, URL or channel ID (no OAuth needed)' })
  @ApiBody({ schema: { properties: { handle: { type: 'string', example: '@MrBeast' } } } })
  @ApiResponse({ status: 201, description: '{ connected, channel, subscribers }' })
  @ApiResponse({ status: 400, description: 'Channel not found or YOUTUBE_API_KEY missing' })
  connectByHandle(
    @CurrentUser('id') userId: string,
    @Body('handle') handle: string,
  ) {
    return this.youtubeService.connectByHandle(userId, handle);
  }
}
