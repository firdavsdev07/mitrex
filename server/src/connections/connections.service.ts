import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { Platform } from '@metrix/prisma-client';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly queue: QueueService,
  ) {}

  async findAll(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        isActive: true,
        tokenExpiresAt: true,
        createdAt: true,
        stats: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { followers: true, views: true, likes: true, comments: true, engagement: true, date: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Token holati
    const now = new Date();
    const threeDays = 3 * 24 * 60 * 60 * 1000;

    return connections.map((c) => {
      let tokenStatus: 'ok' | 'expiring_soon' | 'expired' = 'ok';
      if (c.tokenExpiresAt) {
        if (c.tokenExpiresAt < now) tokenStatus = 'expired';
        else if (c.tokenExpiresAt.getTime() - now.getTime() < threeDays) tokenStatus = 'expiring_soon';
      }
      return { ...c, tokenStatus };
    });
  }

  async syncOne(userId: string, platform: Platform) {
    const conn = await this.prisma.connection.findUnique({
      where: { userId_platform: { userId, platform } },
      select: { id: true },
    });
    if (!conn) throw new NotFoundException('Connected platform not found');

    if (this.queue) {
      await this.queue.addConnectionSync(conn.id, platform);
      return { queued: true, message: 'Sync started', platform };
    }

    return { queued: false, message: 'Queue unavailable — sync will run on next scheduled cycle', platform };
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
