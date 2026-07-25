import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Platform } from '@metrix/prisma-client';
import { SyncService } from '../../sync/sync.service';
import { QUEUE_SYNC, JOB_SYNC_CONNECTION } from '../queue.constants';

@Processor(QUEUE_SYNC, { concurrency: 3 })
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {
    super();
  }

  async process(job: Job<{ connectionId: string; platform: Platform }>) {
    switch (job.name) {
      case JOB_SYNC_CONNECTION:
        await this.syncService.syncOne(
          job.data.connectionId,
          job.data.platform,
        );
        break;
      default:
        this.logger.warn(`Unknown sync job: ${job.name}`);
    }
  }
}
