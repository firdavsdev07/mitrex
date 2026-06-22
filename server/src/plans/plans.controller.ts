import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Public — hamma ko'ra oladi
  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  // Auth kerak — user o'z subscriptionini ko'radi
  @UseGuards(JwtGuard)
  @Get('my')
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.plansService.getUserSubscription(userId);
  }
}
