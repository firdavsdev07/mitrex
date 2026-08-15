import 'dotenv/config';
import './instrument';

// PlatformStat/PostStat.views @db.BigInt (yirik kanallar/virusli postlar
// 2^31'dan oshadi) — lekin Node'ning JSON.stringify BigInt'ni "Do not know
// how to serialize a BigInt" deb qulab tushiradi, bu esa BigInt maydon
// qaytaradigan HAR QANDAY endpoint'ni butunlay 500'ga chiqarib yuboradi.
// Bizning haqiqiy qiymatlarimiz Number.MAX_SAFE_INTEGER'dan (~9 kvadrilion)
// ancha kichik, shuning uchun Number'ga aylantirish xavfsiz.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (
  this: bigint,
) {
  return Number(this);
};

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type {
  CorsOptionsDelegate,
  CorsOptionsCallback,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Express, Request } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL', 'ENCRYPTION_KEY'];

function assertRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  assertRequiredEnvVars();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Refresh-token cookie'ni o'qish uchun (AuthController)
  app.use(cookieParser());

  // Reverse proxy (nginx, Cloudflare, ...) ortida req.ip va rate-limit to'g'ri
  // ishlashi uchun. Proxy'siz to'g'ridan-to'g'ri internetga ochiq bo'lsa
  // YOQMANG — aks holda X-Forwarded-For orqali IP soxtalashtirish mumkin.
  if (process.env.TRUST_PROXY) {
    (app.getHttpAdapter().getInstance() as Express).set(
      'trust proxy',
      Number(process.env.TRUST_PROXY) || 1,
    );
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // /track, /track/event va /track.js — mijozning o'z saytiga o'rnatiladigan
  // kuzatuv skripti tomonidan chaqiriladi, ya'ni Origin har doim NOMA'LUM va
  // ixtiyoriy tashqi domen bo'lishi mumkin (masalan mycompany.com). Qolgan
  // API'ning qattiq origin whitelist'i shu marshrutlarga tatbiq etilsa,
  // brauzer CORS preflight'ni rad etadi va kuzatuv so'rovi hech qachon
  // serverga yetib bormaydi — bu saytlar statistikasi umuman
  // ko'rinmasligining aynan shu sababi edi. Shu uchun kuzatuv marshrutlari
  // uchun Origin har doim ruxsat etiladi (cookie kerak emas — sayt
  // trackingKey orqali aniqlanadi), qolgan hammasida whitelist saqlanadi.
  const ALLOWED_ORIGINS = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:3000']
    : ['http://localhost:3000'];
  const TRACKING_PATH_RE = /^\/track(\/event)?$|^\/track\.js$/;

  const corsDelegate: CorsOptionsDelegate<Request> = (
    req: Request,
    callback: CorsOptionsCallback,
  ) => {
    if (TRACKING_PATH_RE.test(req.url.split('?')[0])) {
      callback(null, { origin: true, credentials: false });
    } else {
      callback(null, { origin: ALLOWED_ORIGINS, credentials: true });
    }
  };
  app.enableCors(corsDelegate);

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Metrix API')
      .setDescription('Unified analytics dashboard API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt',
      )
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addTag('auth', 'Authentication — register, login, OAuth, password reset')
      .addTag('users', 'User profile & settings')
      .addTag('billing', 'Subscription checkout & invoices')
      .addTag('plans', 'Available subscription plans')
      .addTag('websites', 'Website management & analytics')
      .addTag(
        'tracking',
        'Public page-view & event tracking endpoints (used by track.js)',
      )
      .addTag('connections', 'Platform connections — list, sync, disconnect')
      .addTag('youtube', 'YouTube OAuth connection')
      .addTag('telegram', 'Telegram Bot connection')
      .addTag('discord', 'Discord OAuth connection')
      .addTag('bluesky', 'Bluesky App Password connection')
      .addTag('instagram', 'Instagram / Meta OAuth connection')
      .addTag('reddit', 'Reddit subreddit tracking (no OAuth needed)')
      .addTag('posts', 'Social media post stats per platform')
      .addTag('dashboard', 'Aggregated overview & history')
      .addTag('ai', 'AI-generated insights')
      .addTag('alerts', 'Alert rules for traffic/follower spikes and drops')
      .addTag('notifications', 'In-app notifications')
      .addTag('api-keys', 'Public API key management')
      .addTag('workspaces', 'Team workspaces — members & invites')
      .addTag('export', 'CSV / JSON data export')
      .addTag('platforms', 'Platform registry (available integrations)')
      .addTag('admin', 'Admin panel — users, plans, platform toggles')
      .addTag('health', 'Service health check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
      customSiteTitle: 'Metrix API Docs',
    });
  }

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Server: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

void bootstrap();
