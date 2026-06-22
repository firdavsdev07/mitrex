import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface GeoResult {
  country: string | null;
  countryCode: string | null;
  city: string | null;
}

@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);
  private readonly cache = new Map<string, GeoResult>();

  async lookup(ip: string): Promise<GeoResult> {
    const empty: GeoResult = { country: null, countryCode: null, city: null };

    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
      return empty;
    }

    if (this.cache.has(ip)) return this.cache.get(ip)!;

    try {
      // ip-api.com — free, 45 req/min, no key needed
      const res = await axios.get(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,status`, {
        timeout: 2000,
      });

      if (res.data.status !== 'success') return empty;

      const result: GeoResult = {
        country: res.data.country || null,
        countryCode: res.data.countryCode || null,
        city: res.data.city || null,
      };

      // Cache for 24 hours (in-memory, resets on restart)
      this.cache.set(ip, result);
      return result;
    } catch {
      return empty;
    }
  }
}
