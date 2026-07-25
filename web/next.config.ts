import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const isDev = process.env.NODE_ENV !== "production";

// Next dev (Turbopack) needs 'unsafe-eval' for React's dev-mode debugging
// and a ws:// connect-src for HMR — neither is needed (or included) in prod.
const scriptSrc = isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";
// *.sentry.io — Sentry brauzer SDK xato hisobotlarini yuborishi uchun (DSN
// bo'sh bo'lsa hech qanday so'rov yubormaydi, lekin CSP oldindan tayyor).
const connectSrc = isDev
  ? `connect-src 'self' ${apiUrl} ws: https://*.sentry.io`
  : `connect-src 'self' ${apiUrl} https://*.sentry.io`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry org/project hali sozlanmagan (SENTRY_DSN bo'sh) — source map
  // yuklash shunchaki o'tkazib yuboriladi, build buzilmaydi.
  silent: true,
});
