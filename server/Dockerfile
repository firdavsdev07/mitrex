FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

# ─── deps: install with native build tools (bcrypt, prisma engines) ──────────
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# @metrix/prisma-client is a `file:./generated/prisma/client` dependency —
# that directory is gitignored (build output), so it doesn't exist yet in a
# fresh checkout. A stub package.json lets pnpm resolve it on the first
# install so `prisma` (devDependency) gets installed; `prisma generate` then
# fills in the real client, and a second install refreshes pnpm's virtual
# store copy of the file: dependency (pnpm doesn't do this automatically —
# see server/CLAUDE.md notes on regenerating the client).
RUN mkdir -p generated/prisma/client && \
    echo '{"name":"prisma-client-stub","version":"0.0.0","main":"index.js"}' > generated/prisma/client/package.json && \
    echo 'module.exports = {};' > generated/prisma/client/index.js
RUN pnpm install --frozen-lockfile
# prisma.config.ts requires DATABASE_URL to be set to load (dotenv/config),
# even though `generate` itself never connects to a database — the real
# value is supplied at container runtime via docker-compose/.env.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN pnpm install --frozen-lockfile

# ─── build: compile TypeScript ────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm build

# ─── runtime: prod deps only + compiled output ────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/generated ./generated
# --prod bo'lmasdan: prisma.config.ts runtime'da (migrate deploy uchun)
# `dotenv`ni import qiladi, lekin u devDependencies'da — shu sabab to'liq
# install qilinadi (image biroz kattaroq, lekin ishonchli).
RUN pnpm install --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
