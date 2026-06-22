import { Module } from '@nestjs/common';
import { AlertsController, NotificationsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController, NotificationsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
