import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramMtprotoService } from './telegram-mtproto.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramMtprotoService],
  exports: [TelegramService, TelegramMtprotoService],
})
export class TelegramModule {}
