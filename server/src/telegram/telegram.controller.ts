import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @UseGuards(JwtGuard)
  @Get('connect')
  getConnectInfo(@CurrentUser('id') userId: string) {
    return this.telegramService.getConnectInfo(userId);
  }

  // Telegram bu endpoint ga update yuboradi — ochiq, secret header bilan himoyalangan
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    await this.telegramService.handleWebhook(body);
    return { ok: true };
  }
}
