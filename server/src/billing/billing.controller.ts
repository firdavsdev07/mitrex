import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  getSubscription(@CurrentUser('id') userId: string) {
    return this.billingService.getSubscription(userId);
  }

  @Post('checkout')
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.billingService.checkout(userId, dto.plan);
  }

  @Delete('cancel')
  cancel(@CurrentUser('id') userId: string) {
    return this.billingService.cancel(userId);
  }

  @Get('invoices')
  getInvoices(@CurrentUser('id') userId: string) {
    return this.billingService.getInvoices(userId);
  }
}
