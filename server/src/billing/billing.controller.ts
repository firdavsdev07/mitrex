import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, description: 'Active subscription with plan details' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.billingService.getSubscription(userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Subscribe or upgrade to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription updated' })
  @ApiResponse({ status: 400, description: 'Invalid plan slug' })
  checkout(@CurrentUser('id') userId: string, @Body() dto: CheckoutDto) {
    return this.billingService.checkout(userId, dto.plan);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel current subscription (stays active until period end)' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  cancel(@CurrentUser('id') userId: string) {
    return this.billingService.cancel(userId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoice history' })
  @ApiResponse({ status: 200, description: 'List of past invoices' })
  getInvoices(@CurrentUser('id') userId: string) {
    return this.billingService.getInvoices(userId);
  }
}
