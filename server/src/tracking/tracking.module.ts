import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { RetentionService } from './retention.service';

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, RetentionService],
  exports: [TrackingService],
})
export class TrackingModule {}
