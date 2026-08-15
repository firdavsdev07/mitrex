import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('connections')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected platforms' })
  @ApiResponse({
    status: 200,
    description: 'Array of connections with latest stats',
  })
  findAll(@CurrentUser('id') userId: string) {
    return this.connectionsService.findAll(userId);
  }

  @Post(':connectionId/sync')
  @ApiOperation({ summary: 'Manually trigger sync for one connection' })
  @ApiParam({ name: 'connectionId', description: 'Connection UUID' })
  @ApiResponse({ status: 201, description: 'Sync triggered' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  syncOne(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
  ) {
    return this.connectionsService.syncOne(userId, connectionId);
  }

  @Delete(':connectionId')
  @ApiOperation({ summary: 'Disconnect a connection and revoke tokens' })
  @ApiParam({ name: 'connectionId', description: 'Connection UUID' })
  @ApiResponse({ status: 200, description: 'Connection removed' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  disconnect(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
  ) {
    return this.connectionsService.disconnect(userId, connectionId);
  }

  @Patch(':connectionId/workspace')
  @ApiOperation({ summary: 'Link/unlink connection to/from workspace' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          nullable: true,
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
    },
  })
  updateWorkspace(
    @CurrentUser('id') userId: string,
    @Param('connectionId') connectionId: string,
    @Body('workspaceId') workspaceId?: string | null,
  ) {
    return this.connectionsService.updateWorkspace(
      userId,
      connectionId,
      workspaceId || null,
    );
  }
}
