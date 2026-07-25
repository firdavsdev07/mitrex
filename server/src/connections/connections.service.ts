import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
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
        lastSyncAt: true,
        lastSyncError: true,
        stats: {
          orderBy: { date: 'desc' },
          take: 1,
          select: {
            followers: true,
            views: true,
            likes: true,
            comments: true,
            engagement: true,
            date: true,
            updatedAt: true,
          },
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
        else if (c.tokenExpiresAt.getTime() - now.getTime() < threeDays)
          tokenStatus = 'expiring_soon';
      }
      return { ...c, tokenStatus };
    });
  }

  // Har bir platforma bo'yicha bir nechta ulanish (masalan 2 ta Telegram
  // kanal) bo'lishi mumkin bo'lgani uchun aniq qaysi ulanish ekanini faqat
  // connectionId bilan ajratib bo'ladi — platform enum yetarli emas.
  //
  // Har doim sinxron (navbatga qo'ymasdan) bajaramiz: foydalanuvchi
  // "Yangilash" tugmasini bosganda darhol natija kutadi. Navbat orqali
  // yuborilsa (addConnectionSync 1s kechikish + fon ishchisi bilan), API
  // {queued:true} deb darhol qaytardi va frontend ma'lumotni HALI
  // yangilanmagan holda qayta yuklardi — tugma bosilgani sezilmasdi.
  async syncOne(userId: string, connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, userId: true, platform: true },
    });
    if (!conn || conn.userId !== userId) {
      throw new NotFoundException('Connection not found');
    }

    await this.syncService.syncOne(conn.id, conn.platform);
    return {
      queued: false,
      synced: true,
      message: 'Sync completed',
      platform: conn.platform,
    };
  }

  async disconnect(userId: string, connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, userId: true, platform: true },
    });
    if (!conn || conn.userId !== userId) {
      throw new NotFoundException('Connection not found');
    }

    await this.prisma.connection.delete({ where: { id: connectionId } });
    return { disconnected: true, platform: conn.platform };
  }
}
