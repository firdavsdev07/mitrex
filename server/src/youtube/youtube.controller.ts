import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response } from 'express';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { YoutubeService } from './youtube.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { verifyOAuthState } from '../common/utils/oauth-state.util';
import {
  redirectWithOAuthError,
  describeOAuthError,
} from '../common/utils/oauth-redirect.util';

@ApiTags('youtube')
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('connect')
  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary:
      'Connect YouTube channel by handle, URL or channel ID (no OAuth needed)',
  })
  @ApiBody({
    schema: { properties: { handle: { type: 'string', example: '@MrBeast' } } },
  })
  @ApiResponse({
    status: 201,
    description: '{ connected, channel, subscribers }',
  })
  @ApiResponse({
    status: 400,
    description: 'Channel not found or YOUTUBE_API_KEY missing',
  })
  connectByHandle(
    @CurrentUser('id') userId: string,
    @Body('handle') handle: string,
  ) {
    return this.youtubeService.connectByHandle(userId, handle);
  }

  @Get('oauth/connect')
  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary:
      'Get Google OAuth URL to connect YOUR OWN YouTube channel — enables per-video subscriber stats',
  })
  @ApiResponse({
    status: 200,
    description: '{ url: string } — redirect user to this URL',
  })
  getOAuthUrl(@CurrentUser('id') userId: string) {
    return this.youtubeService.getAuthUrl(userId);
  }

  @ApiExcludeEndpoint()
  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return redirectWithOAuthError(res, 'youtube', errorDescription || error);
    }

    let userId: string;
    try {
      userId = verifyOAuthState(state);
    } catch {
      return redirectWithOAuthError(
        res,
        'youtube',
        "Ulanish havolasi muddati tugagan, qaytadan urinib ko'ring",
      );
    }

    try {
      await this.youtubeService.handleOAuthCallback(code, userId);
    } catch (err) {
      return redirectWithOAuthError(res, 'youtube', describeOAuthError(err));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/connections?connected=youtube`);
  }
}
