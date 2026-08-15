/**
 * Prod uchun kriptografik sirlarni generatsiya qiladi.
 *
 *   pnpm gen:secrets
 *
 * JWT_SECRET va ENCRYPTION_KEY ni qo'lda "o'ylab topish" xavfli — ular
 * yetarlicha tasodifiy bo'lishi shart. ENCRYPTION_KEY barcha saqlangan
 * OAuth tokenlari va 2FA sirlarini ochadigan kalit: uni almashtirsangiz
 * foydalanuvchilar platformalarni qaytadan ulashga majbur bo'ladi.
 */
import { randomBytes } from 'crypto';

const secrets = {
  // 64 hex belgi = 32 bayt entropiya
  JWT_SECRET: randomBytes(32).toString('hex'),
  // AES-256-GCM kaliti scrypt bilan shu qiymatdan chiqariladi
  ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  // Meta webhook'ini tasdiqlash uchun ixtiyoriy qiymat
  META_WEBHOOK_VERIFY_TOKEN: randomBytes(16).toString('hex'),
};

console.log('# Quyidagilarni server/.env fayliga ko\'chiring.');
console.log('# DIQQAT: bu qiymatlarni git\'ga qo\'shmang.\n');
for (const [key, value] of Object.entries(secrets)) {
  console.log(`${key}=${value}`);
}
console.log(
  '\n# ENCRYPTION_KEY almashtirilsa saqlangan OAuth tokenlar va 2FA',
);
console.log('# sirlari o\'qib bo\'lmas holga keladi — uni saqlab qo\'ying.');
