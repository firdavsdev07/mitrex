import * as Sentry from '@sentry/nestjs';

// main.ts'ning ENG BIRINCHI import'i bo'lishi shart — Sentry boshqa
// modullar (http, prisma va h.k.) require qilinishidan oldin ularni
// instrumentatsiya qilishi kerak. SENTRY_DSN bo'sh bo'lsa SDK hech narsa
// yubormaydi (no-op) — productionda to'ldiriladi.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
});
