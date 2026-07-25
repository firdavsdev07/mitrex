import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Bir nechta server nusxasi ishlaganda in-process (xotiradagi) kesh har biri
// alohida hisoblaydi — masalan TrackingService'ning oylik view-limit keshi
// har bir nusxada mustaqil bo'lib, umumiy limitni noto'g'ri hisoblab qo'yishi
// mumkin edi. Bu servis shared Redis'ga asoslangan kesh beradi; REDIS_URL
// sozlanmagan yoki Redis vaqtincha ishlamasa jimgina no-op qiladi (get() null
// qaytaradi, set() hech narsa qilmaydi) — kesh yo'qligi funksiyani buzmaydi,
// faqat har safar qayta hisoblashga majbur qiladi.
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.client = null;
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err: Error) => {
      this.logger.warn(`Redis kesh xatosi: ${err.message}`);
    });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // Redis vaqtincha ishlamasa ham chaqiruvchi funksiya to'xtamasligi kerak
    }
  }

  async onModuleDestroy() {
    if (!this.client) return;
    await this.client.quit().catch(() => {});
  }
}
