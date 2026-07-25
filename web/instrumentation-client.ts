import * as Sentry from '@sentry/nextjs';

// SENTRY_DSN o'rnatilmagan bo'lsa SDK hech narsa yubormaydi (no-op) —
// lokal devda shart emas. Brauzerga chiqadigan bo'lgani uchun
// NEXT_PUBLIC_ prefiksi bilan.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
