import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3001']
      : ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });

  // Swagger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Metrix API')
      .setDescription('Unified analytics dashboard API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & OAuth')
      .addTag('users', 'User profile & settings')
      .addTag('billing', 'Plans & subscriptions')
      .addTag('websites', 'Web analytics')
      .addTag('connections', 'Platform connections')
      .addTag('posts', 'Social media post stats')
      .addTag('dashboard', 'Aggregated dashboard')
      .addTag('ai', 'AI insights')
      .addTag('plans', 'Available plans')
      .addTag('platforms', 'Platform registry')
      .addTag('admin', 'Admin panel')
      .addTag('api-keys', 'Public API keys')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📚 Swagger docs: http://localhost:${process.env.PORT || 3000}/docs`);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Metrix server running at http://localhost:${port}`);
}

bootstrap();
