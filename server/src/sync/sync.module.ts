import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DiscordModule } from '../discord/discord.module';
import { BlueskyModule } from '../bluesky/bluesky.module';
import { InstagramModule } from '../instagram/instagram.module';
import { PostsModule } from '../posts/posts.module';
import { SyncProcessor } from '../queue/sync.processor';

@Module({
  imports: [YoutubeModule, TelegramModule, DiscordModule, BlueskyModule, InstagramModule, PostsModule],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
