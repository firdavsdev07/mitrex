import { Global, Module } from '@nestjs/common';
import { GeoIpService } from './services/geoip.service';
import { PlanGuard } from './guards/plan.guard';

@Global()
@Module({
  providers: [GeoIpService, PlanGuard],
  exports: [GeoIpService, PlanGuard],
})
export class CommonModule {}
