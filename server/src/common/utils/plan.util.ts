import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

// `PrismaService`ning ham, `$transaction` callback'iga keladigan
// tranzaksiya client'ining ham umumiy qismi — shu orqali quyidagi
// funksiyalar tranzaksiya ichida ham, tashqarisida ham ishlatilishi mumkin.
type PlanQueryClient = Pick<PrismaService, 'userSubscription' | 'plan'>;

// Userning amaldagi planini qaytaradi. Faqat haqiqatan kuchda bo'lgan obuna
// pullik plan beradi: CANCELED obuna to'langan davr oxirigacha amal qiladi,
// davri tugagan yoki EXPIRED obuna free planga qaytadi.
// PlanGuard va TrackingService (oylik ko'rishlar limiti) shu mantiqni bo'lishadi.
export async function getEffectivePlan(
  prisma: PlanQueryClient,
  userId: string,
) {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  const now = new Date();
  const periodOk = !sub?.currentPeriodEnd || sub.currentPeriodEnd >= now;
  const subIsActive =
    sub &&
    periodOk &&
    (sub.status === 'ACTIVE' ||
      sub.status === 'TRIALING' ||
      (sub.status === 'CANCELED' && !!sub.currentPeriodEnd));

  if (subIsActive) return sub.plan;
  return prisma.plan.findUnique({ where: { slug: 'free' } });
}

// PlanGuard so'rov boshida tezkor (lekin race-condition'ga ochiq) tekshiruv
// qiladi. Bu funksiya esa haqiqiy yozuv paytida — bitta tranzaksiya ichida,
// Postgres advisory lock bilan shu user+resource uchun serializatsiya
// qilingan holda — limitni QAYTA tekshiradi. Shunda ikkita parallel so'rov
// (masalan ikki tab'da bir vaqtda "Connect") ikkalasi ham eski hisobni
// ko'rib limitdan oshib keta olmaydi.
export async function assertWithinPlanLimitTx(
  tx: Pick<
    PrismaService,
    'userSubscription' | 'plan' | 'website' | 'connection' | '$executeRaw'
  >,
  userId: string,
  resource: 'websites' | 'platforms',
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${resource}`}))`;

  const plan = await getEffectivePlan(tx, userId);
  if (!plan) return;

  if (resource === 'websites') {
    if (plan.maxWebsites === -1) return;
    const count = await tx.website.count({ where: { userId } });
    if (count >= plan.maxWebsites) {
      throw new ForbiddenException(
        `Your "${plan.name}" plan website limit reached (${plan.maxWebsites}). Please upgrade your plan.`,
      );
    }
  } else {
    if (plan.maxPlatforms === -1) return;
    const count = await tx.connection.count({
      where: { userId, isActive: true },
    });
    if (count >= plan.maxPlatforms) {
      throw new ForbiddenException(
        `Your "${plan.name}" plan platform limit reached (${plan.maxPlatforms}). Please upgrade your plan.`,
      );
    }
  }
}
