import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ThreadsService } from './threads.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { verifyOAuthState } from '../common/utils/oauth-state.util';
import {
  redirectWithOAuthError,
  describeOAuthError,
} from '../common/utils/oauth-redirect.util';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @Get('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get Threads OAuth URL' })
  @ApiResponse({
    status: 200,
    description: '{ url: string } — redirect user to this URL',
  })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  getAuthUrl(@CurrentUser('id') userId: string) {
    return this.threadsService.getAuthUrl(userId);
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
    // Foydalanuvchi ruxsat ekranida rad etsa Threads `code` o'rniga shu
    // parametrlar bilan qaytaradi.
    if (error) {
      return redirectWithOAuthError(res, 'threads', errorDescription || error);
    }

    let userId: string;
    try {
      userId = verifyOAuthState(state);
    } catch {
      return redirectWithOAuthError(
        res,
        'threads',
        "Ulanish havolasi muddati tugagan, qaytadan urinib ko'ring",
      );
    }

    try {
      await this.threadsService.handleCallback(code, userId);
    } catch (err) {
      return redirectWithOAuthError(res, 'threads', describeOAuthError(err));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/connections?connected=threads`);
  }
}
