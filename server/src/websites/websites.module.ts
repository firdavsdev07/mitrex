import { Module } from '@nestjs/common';
import { WebsitesController } from './websites.controller';
import { PublicWebsiteController } from './public-website.controller';
import { RealtimeStreamController } from './realtime-stream.controller';
import { WebsitesService } from './websites.service';
import { TrackingModule } from '../tracking/tracking.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TrackingModule, AuthModule],
  controllers: [
    WebsitesController,
    PublicWebsiteController,
    RealtimeStreamController,
  ],
  providers: [WebsitesService],
  exports: [WebsitesService],
})
export class WebsitesModule {}
