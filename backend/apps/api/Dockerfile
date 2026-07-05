# Build context: backend/
# docker build -f apps/api/Dockerfile -t librora-api .

# ── Stage 1: build (Alpine — fast, small) ────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/

RUN pnpm install --frozen-lockfile

COPY prisma/ ./prisma/
COPY apps/api/ ./apps/api/

RUN pnpm db:generate
RUN pnpm build:api

# Flatten production deps
RUN pnpm --filter api deploy --prod --legacy /deploy
RUN cp -r apps/api/dist /deploy/dist
RUN mkdir -p /deploy/prisma && cp prisma/schema.prisma /deploy/prisma/

# ── Stage 2: production (Debian — has libssl compatible with Prisma 5) ────────
FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g prisma@5.22.0

WORKDIR /app

COPY --from=builder /deploy ./

# Generate Prisma client using the correct binary for linux-debian
RUN prisma generate --schema=prisma/schema.prisma

ENV NODE_ENV=production
ENV API_PORT=3001
EXPOSE 3001

CMD ["node", "dist/main"]
