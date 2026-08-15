import * as Sentry from '@sentry/nestjs';
import { scrubUrl, scrubQueryString } from './common/utils/sentry-scrub.util';

// main.ts'ning ENG BIRINCHI import'i bo'lishi shart — Sentry boshqa
// modullar (http, prisma va h.k.) require qilinishidan oldin ularni
// instrumentatsiya qilishi kerak. SENTRY_DSN bo'sh bo'lsa SDK hech narsa
// yubormaydi (no-op) — productionda to'ldiriladi.
//
// Eslatma: bu fayl atayin faqat sof (tashqi bog'liqliksiz) yordamchini
// import qiladi — bu yerdan Nest modullarini tortish Sentry patch'idan
// oldin ularni yuklab, instrumentatsiyani buzib qo'yardi.

const isProduction = process.env.NODE_ENV === 'production';

// Prod'da tracing default 10% — bu qiymat trafik o'sganda Sentry kvotasini
// tez yeb qo'yadi, shuning uchun env orqali sozlanadigan qilingan.
function tracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw !== undefined && raw !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return isProduction ? 0.1 : 0;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  // Deploy'dan keyin xato qaysi versiyada paydo bo'lganini ajratish uchun.
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: tracesSampleRate(),
  // Foydalanuvchi IP'si, cookie va header'lari yuborilmasin. Bizda cookie'da
  // refresh token, header'da Bearer token bor — ular xato hisobotiga
  // tushmasligi shart.
  sendDefaultPii: false,
  beforeSend(event) {
    // sendDefaultPii: false header/cookie'ni to'sadi, lekin URL query'sini
    // emas — OAuth `code`/`state` aynan shu yerdan sizib chiqishi mumkin.
    if (event.request?.url) {
      event.request.url = scrubUrl(event.request.url);
    }
    if (typeof event.request?.query_string === 'string') {
      event.request.query_string = scrubQueryString(event.request.query_string);
    }
    return event;
  },
});
