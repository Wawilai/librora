# Build context: frontend/
# docker build -t librora-frontend .

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install deps (respects bun.lock)
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Vite inlines import.meta.env.* statically at build time — must be passed as
# a build ARG (Railway/docker build --build-arg), not a runtime env var, or
# the client bundle falls back to the localhost default baked into
# src/lib/api/fetch-adapter.ts.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# Same constraint — see src/components/librora/turnstile-widget.tsx. Left
# unset, the Turnstile widget just doesn't render (no CAPTCHA in local dev).
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

# Build with Node-compatible Nitro server preset
ENV NITRO_PRESET=node-server
RUN bun run build

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Only the Nitro output is needed at runtime
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
# PORT is read by Nitro/srvx at startup
ENV PORT=4173

EXPOSE 4173

CMD ["node", ".output/server/index.mjs"]
