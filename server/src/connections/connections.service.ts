import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.connection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        createdAt: true,
        stats: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { followers: true, views: true, date: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async syncOne(userId: string, platform: Platform) {
    const conn = await this.prisma.connection.findUnique({
      where: { userId_platform: { userId, platform } },
      select: { id: true },
    });
    if (!conn) throw new NotFoundException('Connected platform not found');
    return { message: 'Sync navbatga qo\'yildi', connectionId: conn.id };
  }

  async disconnect(userId: string, platform: Platform) {
    const conn = await this.prisma.connection.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!conn) throw new NotFoundException('Connected platform not found');

    await this.prisma.connection.delete({
      where: { userId_platform: { userId, platform } },
    });
    return { disconnected: true, platform };
  }
}
