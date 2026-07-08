import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
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
  @Post('connect')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Connect Telegram channel or group by @handle' })
  @ApiBody({ schema: { properties: { channel: { type: 'string', example: '@mychannel' } } } })
  @ApiResponse({ status: 201, description: '{ connected, channel, username, members, type }' })
  @ApiResponse({ status: 400, description: 'Channel not found or bot is not admin' })
  connectChannel(
    @CurrentUser('id') userId: string,
    @Body('channel') channel: string,
  ) {
    return this.telegramService.connectChannel(userId, channel);
  }

  @ApiExcludeEndpoint()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    await this.telegramService.handleWebhook(body);
    return { ok: true };
  }
}
