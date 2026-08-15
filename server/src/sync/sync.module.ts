import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncService } from './sync.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DiscordModule } from '../discord/discord.module';
import { BlueskyModule } from '../bluesky/bluesky.module';
import { InstagramModule } from '../instagram/instagram.module';
import { ThreadsModule } from '../threads/threads.module';
import { RedditModule } from '../reddit/reddit.module';
import { PinterestModule } from '../pinterest/pinterest.module';
import { PostsModule } from '../posts/posts.module';
import { SyncProcessor } from '../queue/processors/sync.processor';
import { QUEUE_SYNC } from '../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_SYNC }),
    YoutubeModule,
    TelegramModule,
    DiscordModule,
    BlueskyModule,
    InstagramModule,
    ThreadsModule,
    RedditModule,
    PinterestModule,
    PostsModule,
  ],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
