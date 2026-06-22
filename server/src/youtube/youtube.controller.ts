import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { YoutubeService } from './youtube.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @UseGuards(JwtGuard)
  @Get('connect')
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.youtubeService.getAuthUrl(userId);
  }

  // Google bu URL ga qaytadi — state ichida userId bor
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const userId = parseInt(state);
    await this.youtubeService.handleCallback(code, userId);
    res.redirect(`${process.env.APP_URL || 'http://localhost:5173'}?connected=youtube`);
  }
}
