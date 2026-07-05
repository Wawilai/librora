# Deploying Librora to Railway

Four Railway services from this monorepo: `api`, `worker`, `frontend`, plus Railway's
managed **Redis** plugin. Qdrant runs on **Qdrant Cloud** (Railway has no managed Qdrant).
Postgres stays on **Supabase** (already in use — no change).

## 1. Service: `api`

- **Root Directory:** `backend`
- **Dockerfile Path:** `apps/api/Dockerfile`
- **Healthcheck path:** `/api/v1/health`
- **Public networking:** enabled (this is the one the frontend calls)

Environment variables (Railway → service → Variables):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `API_PORT` | optional — Railway sets `PORT` automatically and the app now falls back to it. Only set `API_PORT` if you intentionally want to override Railway's port. |
| `WEB_BASE_URL` | your frontend's Railway public URL, e.g. `https://librora-frontend.up.railway.app` — used for CORS allow-list |
| `DATABASE_URL_API` | Supabase pooled connection string (port 6543, `pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=10`) |
| `DATABASE_URL` | same as above — CLI/fallback |
| `DATABASE_URL_DIRECT` | Supabase **direct** connection string (port 5432) — only needed if running migrations from this service; otherwise run migrations locally/CI against the same DB |
| `REDIS_URL` | Railway Redis plugin's connection string (`${{Redis.REDIS_URL}}` if using Railway's variable reference syntax) |
| `QDRANT_URL` | your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Qdrant Cloud API key |
| `QDRANT_COLLECTION` | `librora_items` |
| `JWT_ACCESS_SECRET` | generate: `openssl rand -base64 48` |
| `JWT_ACCESS_TTL` | `900` |
| `JWT_REFRESH_SECRET` | generate a **different** secret than access |
| `JWT_REFRESH_TTL` | `2592000` |
| `OPENAI_API_KEY` | real key |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |
| `OPENAI_EMBEDDING_DIMENSION` | `1536` |
| `ACCOUNT_DELETION_GRACE_DAYS` | `30` |
| `RESEND_API_KEY` | real key (needs a verified sending domain) |
| `EMAIL_FROM` | `noreply@yourdomain.com` |
| `PASSWORD_RESET_TOKEN_TTL` | `1800` |
| `EMAIL_VERIFICATION_TOKEN_TTL` | `86400` |
| `STRIPE_SECRET_KEY` | **live** key (not test) once ready to charge real users |
| `STRIPE_PUBLISHABLE_KEY` | live key |
| `STRIPE_WEBHOOK_SECRET` | from the Stripe webhook endpoint you'll configure to point at `https://<api-domain>/api/v1/billing/webhook` |
| `STRIPE_PREMIUM_PRICE_ID_MONTHLY` | live monthly Price ID — starts with `price_`, **not** `prod_` (that's the Product ID; pasting it here causes `checkout-session` to 500) |
| `STRIPE_PREMIUM_PRICE_ID_YEARLY` | live yearly Price ID, same `price_` caveat |
| `EXTENSION_ORIGIN` | `chrome-extension://<production-extension-id>` — only known after the extension is published; leave blank until then, CORS just won't allow-list the extension's popup calls until set |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key — leave unset and registration skips CAPTCHA verification (not recommended for production) |

## 2. Service: `worker`

- **Root Directory:** `backend`
- **Dockerfile Path:** `apps/worker/Dockerfile`
- **No healthcheck** (not an HTTP service — BullMQ consumer only)
- **Public networking:** disabled (nothing should reach this from outside)

Same environment variables as `api` **except**:
- Use `DATABASE_URL_WORKER` instead of `DATABASE_URL_API` (separate pooled connection budget)
- No `WEB_BASE_URL`/CORS-related vars needed (worker has no HTTP surface)
- Add: `WORKER_CONCURRENCY=3`, `WORKER_MAX_ATTEMPTS=3`, `FETCH_TIMEOUT_MS=15000`,
  `FETCH_MAX_RESPONSE_BYTES=5242880` (confirmed read by both `api` and `worker` configs)
- `SEMANTIC_MIN_SCORE`/`SEMANTIC_DEFAULT_LIMIT`/`SEMANTIC_MAX_LIMIT` are **api-only**
  (search runs in the API, not the worker) — no need to set these on `worker`

## 3. Service: `frontend`

- **Root Directory:** `frontend`
- **Dockerfile Path:** `Dockerfile`
- **Public networking:** enabled

**Critical build-time variable** (this is the part that's easy to get wrong):

| Key | Value | When |
|---|---|---|
| `VITE_API_URL` | the **public** URL of the `api` service, e.g. `https://librora-api.up.railway.app` | Must be set as a **Build Variable** (Railway distinguishes Build vs. Deploy variables), not just a runtime env var — Vite inlines `import.meta.env.VITE_API_URL` statically into the client JS bundle during `bun run build`. If it's only set as a runtime/deploy variable, the client bundle silently falls back to `http://localhost:3001` (see `frontend/src/lib/api/fetch-adapter.ts`) and every browser request will fail. |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile **site key** (public by design, safe in the client bundle) | Same build-time constraint as `VITE_API_URL` — must be a **Build Variable**. Left unset, the register page's CAPTCHA widget doesn't render at all (dev-friendly default, but means production registration has no CAPTCHA until this is set). |

The Dockerfile now accepts both as build ARGs (see `frontend/Dockerfile`'s `ARG VITE_API_URL` /
`ARG VITE_TURNSTILE_SITE_KEY` lines) — Railway needs these same keys added under the
service's **Build** variables section so they're passed as `--build-arg` during the Docker
build step. Runtime-only variables are NOT visible during `docker build`.

Runtime variables (deploy-time, safe to set as normal env vars):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Railway sets this automatically; the Dockerfile's `ENV PORT=4173` is a fallback default only used if Railway doesn't override it |

## 4. Add-on: Redis

Add the Railway **Redis** plugin to the project. Reference its connection string in
`api`/`worker`'s `REDIS_URL` variable using Railway's variable reference syntax
(`${{Redis.REDIS_URL}}`) so it stays in sync if Railway rotates credentials.

## 5. Qdrant Cloud (external)

Railway has no managed Qdrant offering. Create a free-tier cluster at
[cloud.qdrant.io](https://cloud.qdrant.io), then set `QDRANT_URL`/`QDRANT_API_KEY` on both
`api` and `worker` to that cluster's values.

## Deploy order (matters)

1. Provision Redis plugin + Qdrant Cloud cluster first — `api`/`worker` will crash-loop on
   startup without them.
2. Run `prisma migrate deploy` against the Supabase DB **before** first deploying `api`/
   `worker` — see the CLAUDE.md section on the P3005/P3018 migrate-resolve workaround if the
   `_prisma_migrations` tracking table doesn't match the live schema (this bit us repeatedly
   in local dev — check it early rather than assuming a fresh DB "just works").
3. Deploy `api`, confirm `/api/v1/health` returns `200` before moving on.
4. Deploy `worker` — check its logs for `Worker started — listening for BullMQ jobs` with no
   Redis/Qdrant/DB connection errors.
5. **Set `VITE_API_URL` as a Build variable on `frontend` pointing at `api`'s now-known
   public URL**, then deploy `frontend` last (its build depends on `api`'s URL being final).
6. Point Stripe's webhook endpoint at the live `api` URL and update `STRIPE_WEBHOOK_SECRET`
   to match, if not already done in step 1's env var setup.

## Known follow-up (not blocking initial deploy, but needed before real users install the extension)

The checked-in `frontend/public/librora-clipper.zip` may be a localhost-only dev build. Once
`frontend`'s production URL and `api`'s production URL are final, rebuild and repackage from
`project/extension`:

```bash
cd extension
VITE_WEB_ORIGIN=https://<frontend-domain> VITE_API_ORIGIN=https://<api-domain> bun run build
bun run package
```

This overwrites `frontend/public/librora-clipper.zip` with a build whose manifest
`host_permissions`/`externally_connectable` point at production origins instead of
`localhost`. The package script intentionally refuses to create a downloadable zip with
localhost origins unless `ALLOW_LOCAL_EXTENSION_ZIP=1` is set for local testing. Redeploy
`frontend` afterward so the updated zip is served.
