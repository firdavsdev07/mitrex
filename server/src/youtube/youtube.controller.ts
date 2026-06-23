import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('youtube')
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @Get('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get Google OAuth URL to connect YouTube channel' })
  @ApiResponse({ status: 200, description: '{ url: string } — redirect user to this URL' })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.youtubeService.getAuthUrl(userId);
  }

  @ApiExcludeEndpoint()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.youtubeService.handleCallback(code, state);
    res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}?connected=youtube`);
  }
}
