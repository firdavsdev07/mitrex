import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ApiKeyGuard } from './api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('api-keys')
@ApiBearerAuth('jwt')
@UseGuards(JwtGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'My Dashboard Script' },
        expiresInDays: { type: 'number', example: 365, description: 'Days until expiry (omit for no expiry)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'API key created — key value shown only once' })
  create(
    @CurrentUser('id') userId: string,
    @Body('name') name: string,
    @Body('expiresInDays') expiresInDays?: number,
  ) {
    return this.apiKeysService.create(userId, name, expiresInDays);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys (key values hidden)' })
  @ApiResponse({ status: 200, description: 'Array of API keys' })
  findAll(@CurrentUser('id') userId: string) {
    return this.apiKeysService.findAll(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'Key revoked' })
  revoke(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.apiKeysService.revoke(userId, id);
  }
}

@ApiTags('api-keys')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('api/v1')
export class PublicApiController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get website stats via API key (programmatic access)' })
  @ApiQuery({ name: 'domain', type: 'string', description: 'Website domain e.g. myblog.com' })
  @ApiQuery({ name: 'period', type: 'string', description: 'today | week | month' })
  @ApiResponse({ status: 200, description: 'Aggregated website stats' })
  @ApiResponse({ status: 401, description: 'Invalid or missing X-API-Key header' })
  getStats(
    @CurrentUser('id') userId: string,
    @Query('domain') domain: string,
    @Query('period') period: string,
  ) {
    return this.apiKeysService.getWebsiteStats(userId, domain, period);
  }
}
