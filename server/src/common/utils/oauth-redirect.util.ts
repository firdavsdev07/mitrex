import { Response } from 'express';

// OAuth callback muvaffaqiyatsiz bo'lganda (foydalanuvchi rad etdi, provider
// xato qaytardi, token almashinuvi ishlamadi) frontendga tushunarli xato
// bilan qaytaradi — aks holda global AllExceptionsFilter xom JSON javob
// yuborardi va foydalanuvchi Google/Meta/Discord'dan qaytgach ilovaga
// umuman kirmasdan, texnik xato sahifasida qolib ketardi.
export function redirectWithOAuthError(
  res: Response,
  platform: string,
  message: string,
): void {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const params = new URLSearchParams({ error: platform, message });
  res.redirect(`${frontendUrl}/connections?${params.toString()}`);
}

// Axios (Meta/Google/Discord API) va Nest HttpException xatolaridan
// foydalanuvchiga ko'rsatsa bo'ladigan qisqa matn ajratib oladi — token yoki
// boshqa maxfiy ma'lumot xato matniga tushib qolmasligi uchun faqat
// provider'ning o'z xato tavsifidan foydalaniladi.
const FALLBACK_MESSAGE = "Ulanishda noma'lum xatolik yuz berdi";

// Duck-typed emas (isAxiosError) tekshiruv qasddan — chaqiruvchilar haqiqiy
// AxiosError'lar bilan bir qatorda, kelib chiqishi shu shakldagi oddiy
// obyektlar (masalan testlarda) bilan ham chaqirishi mumkin.
export function describeOAuthError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: unknown }).response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response
    ) {
      const data = (response as { data?: unknown }).data;
      if (typeof data === 'object' && data !== null) {
        const d = data as {
          error?: { message?: string };
          error_description?: string;
        };
        if (d.error?.message) return d.error.message;
        if (d.error_description) return d.error_description;
      }
    }
  }
  if (err instanceof Error) return err.message;
  return FALLBACK_MESSAGE;
}
