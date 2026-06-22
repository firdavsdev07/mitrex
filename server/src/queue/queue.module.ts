import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_TRACKING, QUEUE_SYNC } from './queue.constants';
import { QueueService } from './queue.service';
import { TrackingProcessor } from './tracking.processor';

const redisConnection = {
  connection: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

@Global()
@Module({
  imports: [
    BullModule.forRoot(redisConnection),
    BullModule.registerQueue(
      { name: QUEUE_TRACKING },
      { name: QUEUE_SYNC },
    ),
  ],
  providers: [QueueService, TrackingProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
