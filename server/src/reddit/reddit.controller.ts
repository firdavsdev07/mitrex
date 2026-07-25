import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { RedditService } from './reddit.service';
import { ConnectRedditDto } from './dto/connect-reddit.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reddit')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('reddit')
export class RedditController {
  constructor(private readonly redditService: RedditService) {}

  @Post('connect')
  @UseGuards(PlanGuard)
  @PlanLimit('platforms')
  @ApiOperation({
    summary: 'Track a subreddit (no OAuth needed — public data)',
  })
  @ApiResponse({
    status: 201,
    description: '{ connected, subreddit, subscribers }',
  })
  @ApiResponse({ status: 400, description: 'Subreddit not found' })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  connect(@CurrentUser('id') userId: string, @Body() dto: ConnectRedditDto) {
    return this.redditService.connect(userId, dto);
  }
}
