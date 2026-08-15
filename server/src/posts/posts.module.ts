import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { TelegramModule } from '../telegram/telegram.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { ThreadsModule } from '../threads/threads.module';

@Module({
  imports: [TelegramModule, YoutubeModule, ThreadsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
