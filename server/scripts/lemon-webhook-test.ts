/**
 * Lemon Squeezy webhook'ini LOKAL sinash.
 *
 *   pnpm lemon:test-webhook <event> <userId> [planSlug]
 *
 * Masalan:
 *   pnpm lemon:test-webhook subscription_created 3f8a...-uuid starter
 *   pnpm lemon:test-webhook subscription_cancelled 3f8a...-uuid
 *
 * Nima uchun kerak: haqiqiy webhook'ni sinash uchun ngrok ochib, Lemon
 * Squeezy panelida URL sozlab, so'ng haqiqiy to'lov qilish kerak bo'lardi.
 * Bu skript esa xuddi LS kabi imzolangan (HMAC-SHA256) so'rovni to'g'ridan
 * to'g'ri lokal serverga yuboradi — obuna oqimini soniyalarda tekshirasiz.
 *
 * ESLATMA: bu faqat BIZNING tomonni sinaydi. Lemon Squeezy'ning haqiqiy
 * payload'i mos kelishini bir marta ngrok orqali tasdiqlab qo'yish kerak
 * (deploy/README.md, 4-bo'lim).
 */
import 'dotenv/config';
import { createHmac } from 'crypto';

const EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_expired',
  'subscription_payment_success',
] as const;

type EventName = (typeof EVENTS)[number];

function usage(message: string): never {
  console.error(`XATO: ${message}\n`);
  console.error('Ishlatish:');
  console.error('  pnpm lemon:test-webhook <event> <userId> [planSlug]\n');
  console.error(`Mavjud event'lar:\n  ${EVENTS.join('\n  ')}`);
  process.exit(1);
}

async function main() {
  const [eventName, userId, planSlug = 'starter'] = process.argv.slice(2);

  if (!eventName) usage("event nomi ko'rsatilmagan");
  if (!EVENTS.includes(eventName as EventName)) {
    usage(`noma'lum event: ${eventName}`);
  }
  if (!userId) usage("userId ko'rsatilmagan (DB'dagi haqiqiy User.id)");

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    usage('LEMONSQUEEZY_WEBHOOK_SECRET .env da sozlanmagan');
  }

  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const now = new Date();
  const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Lemon Squeezy payload'ining shakli: meta.custom_data'da checkout paytida
  // yuborgan qiymatlarimiz qaytadi (qarang billing.service.ts#checkout).
  const payload = {
    meta: {
      event_name: eventName,
      custom_data: { userId, planSlug },
    },
    data: {
      id: 'sub_test_local',
      type: 'subscriptions',
      attributes: {
        customer_id: 'cus_test_local',
        status:
          eventName === 'subscription_cancelled'
            ? 'cancelled'
            : eventName === 'subscription_expired'
              ? 'expired'
              : 'active',
        renews_at: renewsAt.toISOString(),
        ends_at:
          eventName === 'subscription_cancelled'
            ? renewsAt.toISOString()
            : null,
        created_at: now.toISOString(),
      },
    },
  };

  // MUHIM: imzo aynan yuboriladigan BAYTLAR ustidan hisoblanishi kerak.
  // Obyektni qayta JSON.stringify qilish (masalan fetch'ga obyekt berish)
  // boshqa matn hosil qilishi mumkin va imzo mos kelmay qolardi.
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  const url = `${baseUrl}/billing/webhook`;
  console.log(`→ POST ${url}`);
  console.log(`  event:  ${eventName}`);
  console.log(`  userId: ${userId}`);
  console.log(`  plan:   ${planSlug}\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Event-Name': eventName,
    },
    body,
  });

  const text = await res.text();
  console.log(`← ${res.status} ${res.statusText}`);
  console.log(`  ${text}`);

  if (!res.ok) {
    console.error(
      '\nMaslahat: 400 "Invalid webhook signature" bo\'lsa — skript va server' +
        '\nturli .env fayllarni o\'qiyapti yoki secret bir xil emas.',
    );
    process.exit(1);
  }

  console.log(
    '\n✓ Qabul qilindi. Endi DB\'da tekshiring: UserSubscription qatori' +
      '\n  status/lemonSubscriptionId/currentPeriodEnd bilan yangilanganmi.',
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
