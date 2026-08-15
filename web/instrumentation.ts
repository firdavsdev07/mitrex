import * as Sentry from '@sentry/nextjs';
import { scrubUrl, scrubQueryString } from '@/lib/sentry-scrub';

const isProduction = process.env.NODE_ENV === 'production';

// Server va edge runtime uchun sozlama bir xil — takrorlamaslik uchun
// bitta obyektda yig'ilgan.
const sentryOptions = {
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: isProduction ? 0.1 : 0,
  sendDefaultPii: false,
  beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
    if (event.request?.url) {
      event.request.url = scrubUrl(event.request.url);
    }
    if (typeof event.request?.query_string === 'string') {
      event.request.query_string = scrubQueryString(event.request.query_string);
    }
    return event;
  },
};

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(sentryOptions);
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sentryOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
