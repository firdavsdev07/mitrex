# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Mitrex (internal/API name **Metrix**) is a unified social-media & website analytics SaaS. Two independent apps, each with its own `package.json`/lockfile (no root workspace):

- `server/` — NestJS 11 + Prisma 7 (Postgres) + BullMQ (Redis). REST API, OAuth, platform sync, tracking ingestion.
- `web/` — Next.js 16 (App Router) + React 19 + Tailwind 4. Dashboard frontend.

Run commands from inside `server/` or `web/` respectively — there is no top-level script runner.

## Commands

### server/ (pnpm)
- `pnpm start:dev` — watch-mode dev server (default port 3000)
- `pnpm build` — `nest build`
- `pnpm lint` — eslint --fix over src/apps/libs/test
- `pnpm test` — jest unit tests (`*.spec.ts`, colocated with source, rootDir `src`)
- `pnpm test -- <pattern>` — run a single spec, e.g. `pnpm test -- plan.util`
- `pnpm test:e2e` — e2e tests (`test/jest-e2e.json` config)
- `pnpm test:cov` — coverage
- `pnpm seed` — runs `prisma/seed.ts` (needs `ADMIN_EMAIL`/`ADMIN_PASSWORD` in env)
- `pnpm mtproto:login` — one-time interactive login to generate `TELEGRAM_MTPROTO_SESSION`
- Prisma: schema at `prisma/schema.prisma`; client generates to `generated/prisma/client` and is imported as `@metrix/prisma-client` (a `file:` dependency), **not** `@prisma/client`. Standard `npx prisma migrate dev` / `npx prisma generate` apply.
- Required env vars checked at boot (`main.ts`): `JWT_SECRET`, `DATABASE_URL`, `ENCRYPTION_KEY`. See `.env.example` for the full list (OAuth client IDs per provider, `REDIS_URL`, AI provider keys, etc.).
- Swagger UI at `/docs` in non-production.

### web/ (pnpm)
- `pnpm dev` — Next dev server (default port 3000; convention in this repo runs it on 3001 alongside the API on 3000 — set `PORT=3001` or pass `-p 3001`)
- `pnpm build` / `pnpm start` — production build/serve
- `pnpm lint` — eslint
- No test suite currently configured.
- API base URL comes from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000`).

## Architecture (server)

**Module layout**: one NestJS module per bounded concern, registered in `src/app.module.ts`. Social platform integrations (`youtube`, `telegram`, `discord`, `bluesky`, `instagram`, `reddit`) each expose a `PlatformService` with a consistent shape consumed by `sync/sync.service.ts` and `connections/`.

**Auth** (`auth/`):
- Access tokens are short-lived JWTs returned to the client and kept in memory only (never in a JS-readable cookie); refresh tokens are rotating, stored server-side, and delivered via an httpOnly cookie. The cookie's `path` is `/` (not scoped to `/auth`) **on purpose** — the Next.js frontend (a different port/domain) checks cookie presence client-side in its middleware as a fast "is there a session?" signal before the real check happens server-side via `/auth/me`; scoping to `/auth` would hide the cookie from that middleware. See `common/utils/refresh-token.util.ts` and `auth.controller.ts`'s `setRefreshCookie`/`clearRefreshCookie`. See `COOKIE_DOMAIN` handling for cross-subdomain setups.
- OAuth strategies under `auth/strategies/` (Google, GitHub, Discord, Facebook, Apple) via Passport — these are for *login*; platform modules (`youtube/`, `discord/`, `instagram/`, etc.) do their *own* separate OAuth for data-source connections, which is why e.g. Discord has both a login strategy and a platform connection flow.
- TOTP-based 2FA in `auth/two-factor.service.ts`.
- Secrets/OAuth tokens at rest are AES-256-GCM encrypted with `ENCRYPTION_KEY` (`common/utils/crypto.util.ts`) — rotating this key invalidates all stored platform tokens and 2FA secrets.

**Authorization guards** (`common/guards/`, `auth/guards/`, `api-keys/api-key.guard.ts`):
- `JwtGuard` — standard bearer-token auth for the dashboard SPA.
- `ApiKeyGuard` — alternate auth for the public API via `X-API-Key: mk_live_...` header, resolved through `ApiKeysService`.
- `AdminGuard` — restricts to `UserRole.ADMIN`.
- `DeletedUserGuard` — blocks soft-deleted accounts.
- `PlanGuard` + `@PlanLimit('websites' | 'platforms')` decorator — enforces per-plan resource caps (`getEffectivePlan` in `common/utils/plan.util.ts`) by counting existing `Website`/`Connection` rows before allowing creation.
- Global `ThrottlerGuard` (short/medium/long tiers) applied via `APP_GUARD` in `app.module.ts`.

**Sync pipeline**: `sync/sync.service.ts` runs a `@Cron(EVERY_6_HOURS)` job that fans out one job per active `Connection` through BullMQ (`queue/` module, `QUEUE_SYNC`/`QUEUE_TRACKING` queues, processors in `queue/processors/`). If the queue/Redis is unavailable (`@Optional() queue`), it falls back to direct sequential sync — keep this fallback working when touching `SyncService`. Manual "refresh now" from the UI (`connections.service.ts#syncOne`) intentionally bypasses the queue and syncs inline so the UI can show an immediate result.

**Tracking ingestion** (`tracking/`): public, unauthenticated endpoints (`/track`, `/track/event`, `/track.js`) hit by the tracking snippet embedded on *customers'* external websites — identified by a per-`Website` `trackingKey`, not auth. `main.ts` special-cases CORS for these routes (always allow origin) while the rest of the API uses a strict origin whitelist from `FRONTEND_URL`.

**Multi-tenancy**: `workspaces/` implements team accounts (`WorkspaceMember` + `WorkspaceRole`) layered on top of the primarily user-owned data model (most resources — `Website`, `Connection`, etc. — still key off `userId`).

**AI insights** (`ai/`): pluggable providers (`AiProvider` enum — Groq via `groq-sdk`, Gemini via `@google/generative-ai`), producing `AiInsight` records.

**Error handling / logging**: global `AllExceptionsFilter` (`common/filters/http-exception.filter.ts`) and `LoggingInterceptor` are wired in `main.ts` for every request.

## Architecture (web)

- App Router with route groups: `(auth)` (login/register/reset), `(dashboard)` (main app: dashboard/websites/connections/posts/insights/alerts/settings), `(admin)`.
- `lib/api/client.ts` — shared axios instance. Access token lives in a module-level variable (memory only); a response interceptor catches `401`s, de-dupes concurrent refreshes via a shared `refreshPromise` (important: refresh tokens are single-use/rotating, so parallel naive refresh calls would trigger reuse-detection and kill the session), and retries the original request once. `bootstrapSession()` is called on app load to restore a session from the httpOnly refresh cookie.
- `lib/api/*.ts` — one file per API resource (auth, connections, dashboard, posts, websites, admin, notifications) wrapping `apiClient`.
- `store/auth.ts` — Zustand store for auth/user state.

## Conventions

- Many existing inline comments are written in Uzbek and explain *why* (a past bug, a non-obvious constraint) rather than *what* — read them before changing the surrounding logic, since they often encode a fix for a real incident (e.g. the CORS carve-out for `/track`, or the single-flight refresh logic above).
- Prettier is enforced through eslint (`eslint-plugin-prettier`, `endOfLine: auto`) in `server/`; run `pnpm lint` rather than prettier directly.
