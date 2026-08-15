import 'dotenv/config';
import axios from 'axios';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@metrix/prisma-client/client';

interface VariantAttributes {
  name: string;
  description?: string;
}

interface LemonVariant {
  id: string;
  attributes: VariantAttributes;
}

// Lemon Squeezy variant'larini o'qib Plan.lemonVariantId ni to'ldiradi.
// Variant'larni avval Lemon Squeezy dashboard'ida yaratishingiz kerak.
// Ular nomi bo'yicha bog'lanadi (masalan: "Starter" yoki "Pro").
// Ishga tushirish: `pnpm lemon:provision-plans`.
async function main() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  if (!apiKey || !storeId) {
    console.error(
      'LEMONSQUEEZY_API_KEY va LEMONSQUEEZY_STORE_ID .env faylida sozlanishi kerak.',
    );
    process.exit(1);
  }

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

  console.log("Lemon Squeezy'dan variantlarni yuklab olish...");
  let variants: LemonVariant[] = [];
  try {
    const response = await axios.get<{ data: LemonVariant[] }>(
      `https://api.lemonsqueezy.com/v1/variants?filter[store_id]=${storeId}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    variants = response.data?.data || [];
  } catch (err: unknown) {
    const errorMsg = axios.isAxiosError(err)
      ? err.response?.data
      : (err as Error).message;
    console.error(
      "Lemon Squeezy'dan variantlarni olishda xatolik:",
      errorMsg,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!variants.length) {
    console.warn(
      `Diqqat: Do'kon (storeId=${storeId}) uchun hech qanday variant topilmadi. Avval Lemon Squeezy dashboard'ida variant yarating.`,
    );
    await prisma.$disconnect();
    return;
  }

  for (const plan of plans) {
    if (plan.lemonVariantId) {
      console.log(`⏭  ${plan.name}: allaqachon sozlangan (${plan.lemonVariantId})`);
      continue;
    }

    // Variant nomiga ko'ra qidiramiz (masalan plan.name="Starter" -> variant.attributes.name="Starter")
    const match = variants.find(
      (v) =>
        v.attributes?.name?.toLowerCase().includes(plan.name.toLowerCase()) ||
        v.attributes?.description?.toLowerCase().includes(plan.name.toLowerCase()),
    );

    if (match) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { lemonVariantId: String(match.id) },
      });
      console.log(`✅ ${plan.name} ulandi: Variant ID = ${match.id} (Nomi: "${match.attributes.name}")`);
    } else {
      console.warn(
        `❌ ${plan.name} uchun mos keluvchi variant topilmadi (nomida "${plan.name}" qatnashgan variant qidirildi).`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Xato:', err);
  process.exit(1);
});
