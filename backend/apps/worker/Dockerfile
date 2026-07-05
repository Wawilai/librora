# Build context: backend/
# docker build -f apps/worker/Dockerfile -t librora-worker .

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --frozen-lockfile

COPY prisma/ ./prisma/
COPY apps/worker/ ./apps/worker/

RUN pnpm db:generate
RUN pnpm build:worker

# Flatten production deps
RUN pnpm --filter worker deploy --prod --legacy /deploy
RUN cp -r apps/worker/dist /deploy/dist
RUN mkdir -p /deploy/prisma && cp prisma/schema.prisma /deploy/prisma/

# ── Stage 2: production (Debian — libssl compatible with Prisma 5) ─────────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm install -g prisma@5.22.0

WORKDIR /app

COPY --from=builder /deploy ./

RUN prisma generate --schema=prisma/schema.prisma

# Chromium + its native libs for the Cloudflare-challenge fetch fallback
# (fetch-url-browser.ts) — must run in this Debian stage, not the alpine
# builder, since Playwright's Chromium binary needs glibc, not musl.
RUN npx playwright install --with-deps chromium

ENV NODE_ENV=production

CMD ["node", "dist/main"]
