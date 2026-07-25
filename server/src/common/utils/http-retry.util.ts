// Ayrim tarmoq muhitlarida tashqi platforma API'lariga (Telegram, YouTube,
// Meta, Bluesky, Reddit, Discord) ulanish vaqti-vaqti bilan uziladi
// (ETIMEDOUT/ECONNRESET/...) — bu doimiy xato emas, keyingi urinish odatda
// muvaffaqiyatli bo'ladi. Shu turdagi xatolarda avtomatik qayta urinamiz;
// provider'ning o'zi qaytargan haqiqiy xato javoblarini (4xx/5xx — err.response
// mavjud) qayta urinmasdan darhol yuqoriga uzatamiz.
const TRANSIENT_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  backoffMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const hasResponse =
        typeof err === 'object' && err !== null && 'response' in err;
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : undefined;
      const isTransient =
        !hasResponse && !!code && TRANSIENT_ERROR_CODES.has(code);
      if (!isTransient || i === attempts) throw err;
      await new Promise((r) => setTimeout(r, backoffMs * i));
    }
  }
  throw lastErr;
}
