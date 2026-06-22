import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { TelegramModule } from '../telegram/telegram.module';
import { DiscordModule } from '../discord/discord.module';
import { BlueskyModule } from '../bluesky/bluesky.module';
import { InstagramModule } from '../instagram/instagram.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [YoutubeModule, TelegramModule, DiscordModule, BlueskyModule, InstagramModule, PostsModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
