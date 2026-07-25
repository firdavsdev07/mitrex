import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { PlatformsModule } from './platforms/platforms.module';
import { AdminModule } from './admin/admin.module';
import { WebsitesModule } from './websites/websites.module';
import { TrackingModule } from './tracking/tracking.module';
import { YoutubeModule } from './youtube/youtube.module';
import { TelegramModule } from './telegram/telegram.module';
import { DiscordModule } from './discord/discord.module';
import { BlueskyModule } from './bluesky/bluesky.module';
import { InstagramModule } from './instagram/instagram.module';
import { RedditModule } from './reddit/reddit.module';
import { ConnectionsModule } from './connections/connections.module';
import { SyncModule } from './sync/sync.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PostsModule } from './posts/posts.module';
import { AiModule } from './ai/ai.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { AlertsModule } from './alerts/alerts.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ExportModule } from './export/export.module';
import { QueueModule } from './queue/queue.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    PrismaModule,
    EmailModule,
    CommonModule,
    AuthModule,
    UsersModule,
    PlansModule,
    PlatformsModule,
    AdminModule,
    WebsitesModule,
    TrackingModule,
    YoutubeModule,
    TelegramModule,
    DiscordModule,
    BlueskyModule,
    InstagramModule,
    RedditModule,
    ConnectionsModule,
    SyncModule,
    DashboardModule,
    PostsModule,
    AiModule,
    BillingModule,
    HealthModule,
    AlertsModule,
    ApiKeysModule,
    ExportModule,
    WorkspacesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
