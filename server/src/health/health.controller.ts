import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check server and database health' })
  @ApiResponse({ status: 200, description: 'Service is healthy', schema: { example: { status: 'ok', uptime: 3600, db: 'connected', timestamp: '2025-01-01T00:00:00.000Z', version: '1.0.0' } } })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        db: 'connected',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch {
      return {
        status: 'error',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        db: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
