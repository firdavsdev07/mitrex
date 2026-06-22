import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { DiscordService } from './discord.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('discord')
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @UseGuards(JwtGuard)
  @Get('connect')
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.discordService.getAuthUrl(userId);
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('guild_id') guildId: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const userId = parseInt(state);
    await this.discordService.handleCallback(code, guildId, userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?connected=discord`);
  }
}
