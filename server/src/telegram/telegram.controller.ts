import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { TelegramService } from './telegram.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @UseGuards(JwtGuard, PlanGuard)
  @PlanLimit('platforms')
  @Get('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get Telegram bot connect instructions and bot link' })
  @ApiResponse({ status: 200, description: '{ botUrl, instructions } — user opens bot and sends /start' })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  getConnectInfo(@CurrentUser('id') userId: string) {
    return this.telegramService.getConnectInfo(userId);
  }

  @ApiExcludeEndpoint()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    await this.telegramService.handleWebhook(body);
    return { ok: true };
  }
}
