import 'dotenv/config';
import Stripe from 'stripe';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@metrix/prisma-client/client';

// Mavjud (bazadagi) pullik Plan'lar uchun Stripe Product + recurring Price
// yaratadi va qaytgan priceId'ni Plan.stripePriceId'ga yozadi. Idempotent —
// stripePriceId allaqachon bor Plan'lar o'tkazib yuboriladi. Bir marta
// ishga tushiriladi: `pnpm stripe:provision-plans`.
async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error(
      'STRIPE_SECRET_KEY .env faylida sozlanishi kerak (test-mode kalit: https://dashboard.stripe.com/test/apikeys).',
    );
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const plans = await prisma.plan.findMany({
    where: { isActive: true, price: { gt: 0 } },
  });

  if (!plans.length) {
    console.log("Pullik (price > 0) faol plan topilmadi — hech narsa qilinmadi.");
    await prisma.$disconnect();
    return;
  }

  for (const plan of plans) {
    if (plan.stripePriceId) {
      console.log(`⏭  ${plan.name}: allaqachon sozlangan (${plan.stripePriceId})`);
      continue;
    }

    const product = await stripe.products.create({
      name: `Metrix ${plan.name}`,
      metadata: { planSlug: plan.slug },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: plan.currency.toLowerCase(),
      unit_amount: Math.round(Number(plan.price) * 100),
      recurring: { interval: 'month' },
      metadata: { planSlug: plan.slug },
    });

    await prisma.plan.update({
      where: { id: plan.id },
      data: { stripePriceId: price.id },
    });

    console.log(`✅ ${plan.name}: ${price.id} (${plan.price} ${plan.currency}/oy)`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Xato:', err);
  process.exit(1);
});
