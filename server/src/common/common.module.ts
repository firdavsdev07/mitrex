import { Global, Module } from '@nestjs/common';
import { GeoIpService } from './services/geoip.service';

@Global()
@Module({
  providers: [GeoIpService],
  exports: [GeoIpService],
})
export class CommonModule {}
