import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List all available plans (public)' })
  @ApiResponse({
    status: 200,
    description: 'Array of plans with pricing and limits',
  })
  findAll() {
    return this.plansService.findAll();
  }

  @UseGuards(JwtGuard)
  @Get('my')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: "Get current user's active subscription" })
  @ApiResponse({
    status: 200,
    description: 'Active subscription with plan info',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.plansService.getUserSubscription(userId);
  }
}
