import {
  Controller, Get, Post, Query, Body,
  UseGuards, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { InstagramService } from './instagram.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @UseGuards(JwtGuard)
  @Get('connect')
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.instagramService.getAuthUrl(userId);
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    await this.instagramService.handleCallback(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?connected=instagram`);
  }

  // ─── Meta Webhook (required for App Review) ─────────────────────────────────
  // Meta verifies this endpoint with a GET challenge request
  @Get('webhook')
  @SkipThrottle({ short: true, medium: true, long: true })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.instagramService.verifyWebhook(mode, token, challenge);
    if (result !== null) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  // Meta sends real-time updates here
  @Post('webhook')
  @SkipThrottle({ short: true, medium: true, long: true })
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    await this.instagramService.handleWebhookEvent(body);
    return 'EVENT_RECEIVED';
  }
}
