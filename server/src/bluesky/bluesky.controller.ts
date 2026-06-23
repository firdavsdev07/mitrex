import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlanGuard, PlanLimit } from '../common/guards/plan.guard';
import { BlueskyService } from './bluesky.service';
import { ConnectBlueskyDto } from './dto/connect-bluesky.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('bluesky')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('bluesky')
export class BlueskyController {
  constructor(private readonly blueskyService: BlueskyService) {}

  @Post('connect')
  @UseGuards(PlanGuard)
  @PlanLimit('platforms')
  @ApiOperation({ summary: 'Connect Bluesky account with handle and App Password' })
  @ApiResponse({ status: 201, description: 'Bluesky account connected' })
  @ApiResponse({ status: 400, description: 'Invalid handle or App Password' })
  @ApiResponse({ status: 403, description: 'Plan platform limit reached' })
  connect(@CurrentUser('id') userId: string, @Body() dto: ConnectBlueskyDto) {
    return this.blueskyService.connect(userId, dto);
  }
}
