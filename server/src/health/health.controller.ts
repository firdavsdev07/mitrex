import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
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
