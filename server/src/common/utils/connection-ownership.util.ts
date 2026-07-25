import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

// connectionId bo'yicha topilgan Connection haqiqatan shu userId'ga
// tegishli ekanini tekshiradi — export/ai/posts kabi bir nechta servis
// bir xil (findUnique + userId solishtirish + NotFoundException) mantiqni
// takrorlar edi.
export async function findOwnedConnection(
  prisma: PrismaService,
  userId: string,
  connectionId: string,
  notFoundMessage = 'Platform connection not found',
) {
  const conn = await prisma.connection.findUnique({
    where: { id: connectionId },
  });
  if (!conn || conn.userId !== userId) {
    throw new NotFoundException(notFoundMessage);
  }
  return conn;
}
