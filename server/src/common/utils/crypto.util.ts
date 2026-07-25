import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

// ─── Bir tomonlama hash (API kalitlar) ─────────────────────────────────────
// API kalitlar parol emas — bcrypt kabi qimmat KDF shart emas, tez SHA-256
// yetarli (kalit o'zi 20 baytlik kriptografik tasodifiy qiymat, brute-force
// qilib bo'lmaydi). Xom kalit hech qachon saqlanmaydi — faqat shu hash.
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ─── Ikki tomonlama shifrlash (OAuth access/refresh tokenlar, 2FA sirlari) ──
// AES-256-GCM: ENCRYPTION_KEY'dan scrypt bilan 32 baytli kalit chiqariladi,
// har shifrlashda yangi tasodifiy IV ishlatiladi. Natija: iv:authTag:ciphertext
// (barchasi hex, ':' bilan ajratilgan) — bitta ustunga sig'adi.
const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY is not set — required to encrypt OAuth tokens / 2FA secrets',
    );
  }
  // Sobit salt: kalit maydonining o'zi allaqachon maxfiy va tasodifiy emas
  // (env var), rainbow-table xavfi yo'q — bir xil secret har doim bir xil
  // AES kalitini berishi kerak (mavjud shifrlangan qatorlarni deshifrlash uchun).
  return scryptSync(secret, 'metrix-encryption-salt', 32);
}

export function encrypt(plainText: string): string {
  const key = deriveKey();
  const iv = randomBytes(12); // GCM uchun tavsiya etilgan 96 bit
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, cipherHex] = payload.split(':');
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error('Invalid encrypted payload format');
  }
  const key = deriveKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

// Shifrlangan qiymatni undan farqlash uchun — migratsiyadan oldingi ochiq
// tokenlar bilan orqaga moslik davrida ishlatiladi (ikkalasi ham "iv:tag:ct"
// formatida bo'lmasa, hali shifrlanmagan deb hisoblanadi).
export function looksEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p));
}
