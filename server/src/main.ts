import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3001']
      : ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Metrix API')
      .setDescription('Unified analytics dashboard API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addTag('auth', 'Authentication — register, login, OAuth, password reset')
      .addTag('users', 'User profile & settings')
      .addTag('billing', 'Subscription checkout & invoices')
      .addTag('plans', 'Available subscription plans')
      .addTag('websites', 'Website management & analytics')
      .addTag('tracking', 'Public page-view & event tracking endpoints (used by track.js)')
      .addTag('connections', 'Platform connections — list, sync, disconnect')
      .addTag('youtube', 'YouTube OAuth connection')
      .addTag('telegram', 'Telegram Bot connection')
      .addTag('discord', 'Discord OAuth connection')
      .addTag('bluesky', 'Bluesky App Password connection')
      .addTag('instagram', 'Instagram / Meta OAuth connection')
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server: http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

bootstrap();
