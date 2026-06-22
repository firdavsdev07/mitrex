import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Platform } from '@metrix/prisma-client';

@UseGuards(JwtGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.connectionsService.findAll(userId);
  }

  @Post(':platform/sync')
  syncOne(@CurrentUser('id') userId: string, @Param('platform') platform: Platform) {
    return this.connectionsService.syncOne(userId, platform);
  }

  @Delete(':platform')
  disconnect(@CurrentUser('id') userId: string, @Param('platform') platform: Platform) {
    return this.connectionsService.disconnect(userId, platform);
  }
}
