import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BlueskyService } from './bluesky.service';
import { ConnectBlueskyDto } from './dto/connect-bluesky.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('bluesky')
export class BlueskyController {
  constructor(private readonly blueskyService: BlueskyService) {}

  @Post('connect')
  connect(@CurrentUser('id') userId: string, @Body() dto: ConnectBlueskyDto) {
    return this.blueskyService.connect(userId, dto);
  }
}
