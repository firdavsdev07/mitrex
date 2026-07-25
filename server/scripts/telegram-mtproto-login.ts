import 'dotenv/config';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import input from 'input';

// One-time interactive login for the shared Telegram user account used to
// read public channel/group post view counts via MTProto (the Bot API has
// no "get channel history" method, so account-level bot stats alone can't
// give per-post views). Run once with `pnpm mtproto:login`, then copy the
// printed session string into TELEGRAM_MTPROTO_SESSION in .env.
async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    console.error(
      'TELEGRAM_API_ID va TELEGRAM_API_HASH .env faylida sozlanishi kerak (my.telegram.org dan oling).',
    );
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Telefon raqamingiz (+998...): '),
    password: async () =>
      await input.text("2FA parol (agar yoqilgan bo'lsa, aks holda Enter): "),
    phoneCode: async () => await input.text('Telegramdan kelgan kod: '),
    onError: (err) => console.error(err),
  });

  console.log('\n✅ Muvaffaqiyatli login qilindi.');
  console.log(
    "Quyidagi session-stringni .env faylidagi TELEGRAM_MTPROTO_SESSION ga qo'ying:\n",
  );
  console.log(client.session.save());
  console.log(
    '\n⚠️  Bu qiymat login parolingiz kabi maxfiy — hech qachon commit qilmang yoki oshkor qilmang.',
  );

  await client.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Login xatosi:', err);
  process.exit(1);
});
