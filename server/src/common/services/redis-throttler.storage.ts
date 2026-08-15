import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

// @nestjs/throttler'ning standart xotirasi HAR BIR PROTSESSDA alohida
// hisoblaydi. Prod'da server pm2 cluster yoki bir nechta nusxada ishlasa,
// N ta nusxa = N barobar yumshoq limit: 200 so'rov/daqiqa deb yozilgani
// amalda 800 bo'lib ketadi va rate-limit himoya sifatida ishonchsiz bo'ladi.
//
// Bu storage hisoblagichni umumiy Redis'ga ko'chiradi. REDIS_URL bo'lmasa
// yoki Redis vaqtincha yiqilsa — xotiradagi standart storage'ga qaytadi
// (fail-open): rate-limit bir oz yumshaydi, lekin butun API to'xtab
// qolgandan ko'ra yaxshiroq.

// Chaqiruvchi (ThrottlerGuard) ttl va blockDuration'ni MILLISEKUNDDA
// beradi, javobdagi timeToExpire/timeToBlockExpire esa SEKUNDDA kutiladi —
// standart ThrottlerStorageService aynan shunday qiladi.
const INCREMENT_SCRIPT = `
local hitKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local blockedHits = tonumber(redis.call('GET', hitKey)) or (limit + 1)
  return {blockedHits, blockTtl, 1, blockTtl}
end

local hits = redis.call('INCR', hitKey)
if hits == 1 then
  redis.call('PEXPIRE', hitKey, ttl)
end

local timeToExpire = redis.call('PTTL', hitKey)
if timeToExpire < 0 then
  redis.call('PEXPIRE', hitKey, ttl)
  timeToExpire = ttl
end

if hits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  return {hits, timeToExpire, 1, blockDuration}
end

return {hits, timeToExpire, 0, 0}
`;

// Millisekundni sekundga — nolga yaxlitlanmasligi uchun yuqoriga qarab
// (0 sekund "muddati tugagan" degani bo'lib qolardi).
function msToSec(ms: number): number {
  return Math.ceil(ms / 1000);
}

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly client: Redis | null;
  // Redis bo'lmaganda ham throttling butunlay o'chib qolmasligi uchun.
  private readonly fallback = new ThrottlerStorageService();
  private warned = false;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.client = null;
      this.logger.warn(
        "REDIS_URL yo'q — rate-limit xotirada hisoblanadi (bir nechta nusxada aniq ishlamaydi)",
      );
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err: Error) => {
      // Har bir so'rovda log yozib ketmaslik uchun faqat birinchisi.
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(`Redis rate-limit xatosi: ${err.message}`);
      }
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    if (!this.client) {
      return this.fallback.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }

    try {
      const result = (await this.client.eval(
        INCREMENT_SCRIPT,
        2,
        `throttle:${key}`,
        `throttle:${key}:blocked`,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as [number, number, number, number];

      const [totalHits, timeToExpireMs, isBlocked, timeToBlockExpireMs] =
        result;

      return {
        totalHits,
        timeToExpire: msToSec(timeToExpireMs),
        isBlocked: isBlocked === 1,
        timeToBlockExpire: msToSec(timeToBlockExpireMs),
      };
    } catch {
      // Redis yiqildi — so'rovni rad etmaymiz, xotiradagi hisobga o'tamiz.
      return this.fallback.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => {});
  }
}
