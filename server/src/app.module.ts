import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule } from '@sentry/nestjs/setup';
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
import { ThreadsModule } from './threads/threads.module';
import { RedditModule } from './reddit/reddit.module';
import { PinterestModule } from './pinterest/pinterest.module';
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
import { RedisThrottlerStorage } from './common/services/redis-throttler.storage';

// Rate-limit chegaralari prod'da trafikka qarab sozlanishi kerak — buning
// uchun kodni qayta deploy qilish shart bo'lmasin. Noto'g'ri qiymat
// (harf, manfiy son) berilsa default'ga qaytadi.
function envLimit(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// ThrottlerModule storage'ni tayyor nusxa sifatida kutadi, shuning uchun u
// DI'dan tashqarida yaratiladi. Shu bilan birga provider sifatida ham
// ro'yxatdan o'tkaziladi — aks holda Nest o'chayotganda onModuleDestroy
// chaqirilmay, Redis ulanishi yopilmay qolardi.
const throttlerStorage = new RedisThrottlerStorage();

@Module({
  imports: [
    // Sentry'ning Nest integratsiyasi: har bir so'rovga alohida scope va
    // tracing spanlarini bog'laydi. Sentry.init() esa instrument.ts'da,
    // main.ts'ning eng birinchi import'ida bajariladi.
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    QueueModule,
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1000, limit: envLimit('RATE_LIMIT_SHORT', 10) },
        {
          name: 'medium',
          ttl: 10000,
          limit: envLimit('RATE_LIMIT_MEDIUM', 50),
        },
        { name: 'long', ttl: 60000, limit: envLimit('RATE_LIMIT_LONG', 200) },
      ],
      // Hisoblagich umumiy Redis'da — aks holda har bir protsess o'zicha
      // sanab, ko'p nusxali deploy'da limit amalda N barobar yumshab ketardi.
      storage: throttlerStorage,
    }),
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
    ThreadsModule,
    RedditModule,
    PinterestModule,
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
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: RedisThrottlerStorage, useValue: throttlerStorage },
  ],
})
export class AppModule {}
