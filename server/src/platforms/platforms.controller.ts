import { Controller, Get, UseGuards } from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtGuard)
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.platformsService.findAll(userId);
  }
}
