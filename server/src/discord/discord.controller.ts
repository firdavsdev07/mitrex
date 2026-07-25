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
import { DiscordService } from './discord.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { verifyOAuthState } from '../common/utils/oauth-state.util';
import {
  redirectWithOAuthError,
  describeOAuthError,
} from '../common/utils/oauth-redirect.util';

@ApiTags('discord')
@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @Get('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get Discord OAuth URL to connect a server' })
  @ApiResponse({
    status: 200,
    description: '{ url: string } — redirect user to this URL',
  })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.discordService.getAuthUrl(userId);
  }

  @ApiExcludeEndpoint()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('guild_id') guildId: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return redirectWithOAuthError(res, 'discord', errorDescription || error);
    }

    let userId: string;
    try {
      userId = verifyOAuthState(state);
    } catch {
      return redirectWithOAuthError(
        res,
        'discord',
        "Ulanish havolasi muddati tugagan, qaytadan urinib ko'ring",
      );
    }

    try {
      await this.discordService.handleCallback(code, guildId, userId);
    } catch (err) {
      return redirectWithOAuthError(res, 'discord', describeOAuthError(err));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/connections?connected=discord`);
  }
}
