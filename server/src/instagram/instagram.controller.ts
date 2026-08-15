import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  UseGuards,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { Response, Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { InstagramService, MetaWebhookBody } from './instagram.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { verifyOAuthState } from '../common/utils/oauth-state.util';
import {
  redirectWithOAuthError,
  describeOAuthError,
} from '../common/utils/oauth-redirect.util';

@ApiTags('instagram')
@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @Get('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary:
      'Get Meta OAuth URL to connect Instagram (also links Facebook & Threads)',
  })
  @ApiResponse({
    status: 200,
    description: '{ url: string } — redirect user to this URL',
  })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.instagramService.getAuthUrl(userId);
  }

  @ApiExcludeEndpoint()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    // Foydalanuvchi Meta ruxsat ekranida rad etsa yoki ilova "Development"
    // rejimida bo'lib u Tester/Admin sifatida qo'shilmagan bo'lsa, Meta
    // `code` o'rniga shu parametrlar bilan qaytaradi — `code` bo'sh bo'ladi.
    if (error) {
      return redirectWithOAuthError(
        res,
        'instagram',
        errorDescription || error,
      );
    }

    let userId: string;
    try {
      userId = verifyOAuthState(state);
    } catch {
      return redirectWithOAuthError(
        res,
        'instagram',
        "Ulanish havolasi muddati tugagan, qaytadan urinib ko'ring",
      );
    }

    try {
      await this.instagramService.handleCallback(code, userId);
    } catch (err) {
      return redirectWithOAuthError(res, 'instagram', describeOAuthError(err));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/connections?connected=instagram`);
  }

  @ApiExcludeEndpoint()
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

  @ApiExcludeEndpoint()
  @Post('webhook')
  @SkipThrottle({ short: true, medium: true, long: true })
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body() body: MetaWebhookBody,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    if (!this.instagramService.verifySignature(req.rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature');
    }
    this.instagramService.handleWebhookEvent(body);
    return 'EVENT_RECEIVED';
  }
}
