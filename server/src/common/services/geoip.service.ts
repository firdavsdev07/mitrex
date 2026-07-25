import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface GeoResult {
  country: string | null;
  countryCode: string | null;
  city: string | null;
}

interface IpApiResponse {
  status: string;
  country?: string;
  countryCode?: string;
  city?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat
const CACHE_MAX_ENTRIES = 10_000;

@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);
  private readonly cache = new Map<
    string,
    { result: GeoResult; expiresAt: number }
  >();

  async lookup(ip: string): Promise<GeoResult> {
    const empty: GeoResult = { country: null, countryCode: null, city: null };

    if (
      !ip ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168') ||
      ip.startsWith('10.')
    ) {
      return empty;
    }

    const cached = this.cache.get(ip);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    try {
      // ip-api.com — free, 45 req/min, no key needed
      const res = await axios.get<IpApiResponse>(
        `http://ip-api.com/json/${ip}?fields=country,countryCode,city,status`,
        {
          timeout: 2000,
        },
      );

      if (res.data.status !== 'success') return empty;

      const result: GeoResult = {
        country: res.data.country || null,
        countryCode: res.data.countryCode || null,
        city: res.data.city || null,
      };

      // Cheksiz o'sishning oldini olish: limitga yetganda eng eski yozuvlarni tashlaymiz
      if (this.cache.size >= CACHE_MAX_ENTRIES) {
        const excess = this.cache.size - CACHE_MAX_ENTRIES + 1;
        let i = 0;
        for (const key of this.cache.keys()) {
          this.cache.delete(key);
          if (++i >= excess) break;
        }
      }
      this.cache.set(ip, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    } catch {
      return empty;
    }
  }
}
