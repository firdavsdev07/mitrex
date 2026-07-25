import { Global, Module } from '@nestjs/common';
import { GeoIpService } from './services/geoip.service';
import { RedisCacheService } from './services/redis-cache.service';
import { PlanGuard } from './guards/plan.guard';

@Global()
@Module({
  providers: [GeoIpService, RedisCacheService, PlanGuard],
  exports: [GeoIpService, RedisCacheService, PlanGuard],
})
export class CommonModule {}
