import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Platform } from '@metrix/prisma-client';

@ApiTags('connections')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected platforms' })
  @ApiResponse({ status: 200, description: 'Array of connections with latest stats' })
  findAll(@CurrentUser('id') userId: string) {
    return this.connectionsService.findAll(userId);
  }

  @Post(':platform/sync')
  @ApiOperation({ summary: 'Manually trigger sync for one platform' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Platform slug' })
  @ApiResponse({ status: 201, description: 'Sync triggered' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  syncOne(@CurrentUser('id') userId: string, @Param('platform') platform: Platform) {
    return this.connectionsService.syncOne(userId, platform);
  }

  @Delete(':platform')
  @ApiOperation({ summary: 'Disconnect a platform and revoke tokens' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Platform slug' })
  @ApiResponse({ status: 200, description: 'Connection removed' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  disconnect(@CurrentUser('id') userId: string, @Param('platform') platform: Platform) {
    return this.connectionsService.disconnect(userId, platform);
  }
}
