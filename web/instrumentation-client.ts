import * as Sentry from '@sentry/nextjs';
import { scrubUrl, scrubQueryString } from '@/lib/sentry-scrub';

// NEXT_PUBLIC_SENTRY_DSN o'rnatilmagan bo'lsa SDK hech narsa yubormaydi
// (no-op) — lokal devda shart emas. Brauzerga chiqadigan bo'lgani uchun
// NEXT_PUBLIC_ prefiksi bilan.
const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: isProduction ? 0.1 : 0,
  sendDefaultPii: false,
  beforeSend(event) {
    // Parol tiklash va workspace taklifi havolalari query'da maxfiy token
    // olib yuradi — ular xato hisobotiga tushmasligi kerak.
    if (event.request?.url) {
      event.request.url = scrubUrl(event.request.url);
    }
    if (typeof event.request?.query_string === 'string') {
      event.request.query_string = scrubQueryString(event.request.query_string);
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
