import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { getErrorMessage } from '../common/utils/error.util';

// Stripe to'g'ridan-to'g'ri chaqiradi — JWT emas, imzo (signature) orqali
// tekshiriladi, shuning uchun alohida (himoyalanmagan) controller'da.
@ApiExcludeController()
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing Stripe signature or body');
    }

    let event: Stripe.Event;
    try {
      event = this.billingService.constructEvent(req.rawBody, signature);
    } catch (err: unknown) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${getErrorMessage(err)}`,
      );
    }

    await this.billingService.handleWebhookEvent(event);
    return { received: true };
  }
}
