-- ─── Data migration 1: duplicate sessionlarni birlashtirish ───────────────────
-- (websiteId, fingerprint) bo'yicha eng eski sessiya qoladi, page_views unga
-- ko'chiriladi, qolganlari o'chiriladi — keyin unique constraint xavfsiz qo'shiladi.
WITH ranked AS (
    SELECT id,
           first_value(id) OVER (
               PARTITION BY "websiteId", fingerprint ORDER BY "startedAt" ASC
           ) AS keep_id
    FROM "sessions"
)
UPDATE "page_views" pv
SET "sessionId" = r.keep_id
FROM ranked r
WHERE pv."sessionId" = r.id
  AND r.id <> r.keep_id;

WITH ranked AS (
    SELECT id,
           first_value(id) OVER (
               PARTITION BY "websiteId", fingerprint ORDER BY "startedAt" ASC
           ) AS keep_id
    FROM "sessions"
)
DELETE FROM "sessions" s
USING ranked r
WHERE s.id = r.id
  AND r.id <> r.keep_id;

-- DropIndex
DROP INDEX "sessions_websiteId_fingerprint_idx";

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "keyPrefix" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "weeklyDigest" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "websites" ADD COLUMN     "shareId" TEXT;

-- CreateTable
CREATE TABLE "login_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "provider" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_events_userId_createdAt_idx" ON "login_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_websiteId_fingerprint_key" ON "sessions"("websiteId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "websites_shareId_key" ON "websites"("shareId");

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Data migration 2: mavjud API kalitlarni hash'lash ────────────────────────
-- Xom kalitlar endi DBda saqlanmaydi: keyPrefix ko'rsatish uchun, key esa SHA-256.
-- Faqat hali hash'lanmagan (mk_ bilan boshlanadigan) qatorlarga tegiladi.
UPDATE "api_keys"
SET "keyPrefix" = left(key, 12),
    key         = encode(sha256(key::bytea), 'hex')
WHERE key LIKE 'mk_%';
