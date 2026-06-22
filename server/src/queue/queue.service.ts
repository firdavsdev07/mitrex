import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_TRACKING,
  QUEUE_SYNC,
  JOB_TRACK_PAGEVIEW,
  JOB_TRACK_EXIT,
  JOB_TRACK_EVENT,
  JOB_SYNC_CONNECTION,
  JOB_SYNC_USER,
} from './queue.constants';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_TRACKING) private readonly trackingQueue: Queue,
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue,
  ) {}

  // ─── Tracking jobs ────────────────────────────────────────────────────────

  async addPageview(data: Record<string, any>) {
    await this.trackingQueue.add(JOB_TRACK_PAGEVIEW, data, {
      removeOnComplete: 500,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async addExitEvent(data: Record<string, any>) {
    await this.trackingQueue.add(JOB_TRACK_EXIT, data, {
      removeOnComplete: 200,
      removeOnFail: 50,
      attempts: 2,
    });
  }

  async addCustomEvent(data: Record<string, any>) {
    await this.trackingQueue.add(JOB_TRACK_EVENT, data, {
      removeOnComplete: 500,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  // ─── Sync jobs ────────────────────────────────────────────────────────────

  async addConnectionSync(connectionId: string, platform: string) {
    await this.syncQueue.add(
      JOB_SYNC_CONNECTION,
      { connectionId, platform },
      {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        // Delay 1 second between connection syncs to avoid API rate limits
        delay: 1000,
      },
    );
  }

  async addUserSync(userId: string) {
    await this.syncQueue.add(
      JOB_SYNC_USER,
      { userId },
      {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 2,
        // Deduplicate: same user can't have 2 pending sync jobs
        jobId: `sync-user-${userId}`,
      },
    );
  }

  // ─── Queue stats ─────────────────────────────────────────────────────────

  async getStats() {
    const [trackingCounts, syncCounts] = await Promise.all([
      this.trackingQueue.getJobCounts(),
      this.syncQueue.getJobCounts(),
    ]);
    return {
      tracking: trackingCounts,
      sync: syncCounts,
    };
  }
}
