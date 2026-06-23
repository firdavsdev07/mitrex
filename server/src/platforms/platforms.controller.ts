import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('platforms')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @ApiOperation({ summary: 'List all platforms with enabled/comingSoon status and user connection state' })
  @ApiResponse({ status: 200, description: 'Array of platform configs enriched with connection status' })
  findAll(@CurrentUser('id') userId: string) {
    return this.platformsService.findAll(userId);
  }
}
