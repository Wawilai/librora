# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Librora — a web app for saving, processing, and reading web articles into a personal library
(personal library, smart bookshelves, auto tags, reading list, semantic search, Premium gating,
bulk bookshelf rules, Markdown/EPUB export, weekly email digest). Backend and auth are real
(NestJS + Prisma/PostgreSQL + BullMQ/Redis + Qdrant) — there is no mock data or simulated pipeline.

**Structure:**
- `frontend/` — TanStack Start v1 web app (Bun, Vite, React 19, Zustand, shadcn/ui), bilingual (EN/TH)
- `backend/` — NestJS API + worker (pnpm workspace, Fastify, Prisma, PostgreSQL on Supabase,
  BullMQ/Redis, Qdrant, Resend for email, Stripe for billing)
- `extension/` — Chrome/Edge/Brave Manifest V3 browser extension ("Library Clipper")
- `docs/` — Architecture specs, HANDOFF.md, BACKEND_PLAN.md
- `docker-compose.yml` (root) — full-stack local/staging deployment

## Frontend Commands

Uses **Bun** (`frontend/bun.lock`) — not npm/pnpm.

```bash
cd frontend
bun install
bun run dev        # vite dev server (picks a free port, e.g. 8081 if 5173/8080 are taken)
bun run build      # production build
bun run lint       # eslint (exit 0 — zero errors; run with `-- --fix` to auto-fix prettier issues)
bun run typecheck  # tsc --noEmit
bun run format     # prettier --write .
```

## Backend Commands

Uses **pnpm** (`backend/pnpm-workspace.yaml`), two apps: `api` (HTTP) and `worker` (BullMQ processors).

```bash
cd backend

# Setup (first time)
pnpm install
cp .env.example .env          # fill in DATABASE_URL(_API/_WORKER/_DIRECT) from Supabase, RESEND_API_KEY, STRIPE_*, etc.
pnpm db:generate               # prisma generate
pnpm db:migrate                # run migrations (needs real DATABASE_URL_DIRECT)
docker compose up -d redis qdrant   # or run the full stack, see Docker section below

# Development
pnpm dev:api                   # NestJS API on :3001 (watch mode)
pnpm dev:worker                # BullMQ worker (watch mode) — separate process from api
pnpm --filter api build        # production build
pnpm --filter worker build     # production build

# Database
pnpm db:studio                 # Prisma Studio
pnpm db:seed                   # seed data
```

There is no test runner configured in either workspace yet.

### Prisma migrations — non-interactive shell workaround
`prisma migrate dev` requires interactive confirmation and fails in non-interactive shells. Use this
sequence instead: generate the SQL diff with `prisma migrate diff --from-migrations prisma/migrations
--to-schema-datamodel prisma/schema.prisma --shadow-database-url <DATABASE_URL_DIRECT> --script`, write
it into a new timestamped `prisma/migrations/<ts>_<name>/migration.sql` folder by hand, then
`prisma migrate deploy`. If `migrate deploy` fails with **P3005** ("database schema is not empty") or
**P3018**, the `_prisma_migrations` tracking table has drifted from the live schema — resolve by running
`prisma migrate resolve --applied <migration_name>` for every already-applied migration (oldest first),
then `migrate deploy` again for the new one.

### Bun supply-chain guard
`bunfig.toml` sets `minimumReleaseAge = 86400` — packages published <24h ago are blocked in `frontend/`.
Confirm with the user before adding any package to `minimumReleaseAgeExcludes`. This does not apply to
`backend/` or `extension/` (separate package managers/workspaces).

## Docker (full local/staging stack)

Root `docker-compose.yml` runs the whole app: `api` (:3001), `worker` (no exposed port, BullMQ
consumer only), `frontend` (:4173, production build), `redis` (:6379), `qdrant` (:6333/:6334).
`env_file: ./backend/.env` is shared across `api` and `worker`.

```bash
docker compose up --build -d api worker frontend   # rebuild + restart app containers
docker compose logs -f api          # or worker/frontend
docker exec librora_api node -e "..."   # ad-hoc Prisma/debug scripts against the live container
```

`frontend`'s `VITE_API_URL` env var only affects **SSR** fetch calls inside the container network
(`http://api:3001`) — the **client-side** bundle bakes in whatever `VITE_API_URL` was set at `docker
build` time (falls back to `http://localhost:3001` if unset), since Vite inlines `import.meta.env.*`
statically. Rebuild the frontend image with the real public API origin before deploying anywhere
other than localhost.

## Browser Extension (Library Clipper)

`extension/` — Manifest V3, built with Vite + `@crxjs/vite-plugin`. Has a **fixed manifest `key`**
(`extension/dev-key.pem`, gitignored) so the extension ID stays stable across rebuilds.

```bash
cd extension
bun install
bun run build      # outputs extension/dist/
bun run package     # zips dist/ into frontend/public/librora-clipper.zip (downloadable from /extension)
```

`VITE_WEB_ORIGIN` / `VITE_API_ORIGIN` env vars (both default to `localhost`) are baked into the
manifest's `host_permissions`/`externally_connectable` at build time — **must rebuild + repackage
with real production origins** before shipping the download to real users; the checked-in zip today
is a localhost/dev build only. The extension is not yet published to the Chrome Web Store; the
`/extension` page offers a direct zip download + "Load unpacked" instructions instead.

## Architecture

### Stack
TanStack Start v1 (React 19, SSR-ready) · Vite · Tailwind CSS v4 · shadcn/ui (new-york style) +
Radix · Zustand (state) · lucide-react · `sonner` (toasts). Path alias `@/` → `src/`.

### Vite config — do not add plugins manually
[frontend/vite.config.ts](frontend/vite.config.ts) wraps `@lovable.dev/vite-tanstack-config`, which
**already includes** tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro, the `@` alias, and
dev tooling. Adding any of these manually causes duplicate-plugin breakage.

### Routing — file-based, TanStack (not Next/Remix)
Routes are `.tsx` files in [frontend/src/routes/](frontend/src/routes/). Conventions: dynamic segment
is bare `$id.tsx` (no curly braces), splat is `$.tsx` (read via `_splat`, never `*`). Do **not** create
`src/pages/` or `app/layout.tsx`. Layout chain: `__root.tsx` (HTML shell) → `_app.tsx` (Sidebar +
TopHeader) → `_app.*.tsx` pages. `index.tsx` is the public marketing/landing page (signed-out only —
redirects to `/inbox` if already signed in). **`routeTree.gen.ts` is auto-generated — never edit it
by hand.**

### i18n — every user-facing string goes through `t()`
[frontend/src/lib/i18n.tsx](frontend/src/lib/i18n.tsx) provides `useT()` (returns the `t(key, vars?)`
translate function) and `useI18n()` (returns `{ lang, setLang, t }`). Dictionaries live in
[frontend/src/lib/locales/en.ts](frontend/src/lib/locales/en.ts) and `th.ts`, nested by namespace
(`common`, `nav`, `settings`, `landing`, etc.) — `th.ts`'s `Dict` type is enforced identical to
`en.ts`'s, so a missing Thai translation is a TypeScript error. `t()` only ever returns a `string`;
for array/object content (bullet lists, step arrays, plan feature lists) read directly off the
exported `DICTS[lang]` dictionary object instead of through `t()`. Do not hardcode user-facing copy
directly in JSX — every new string needs an entry in both `en.ts` and `th.ts`.

### State — single Zustand store
[frontend/src/lib/store.ts](frontend/src/lib/store.ts) is the source of truth for `user`, `items`,
and UI state. Persisted to `localStorage`.

### API client
[frontend/src/lib/api/client.ts](frontend/src/lib/api/client.ts) defines the `ApiClient` interface;
[frontend/src/lib/api/fetch-adapter.ts](frontend/src/lib/api/fetch-adapter.ts) is the only
implementation, talking to the real NestJS API. Access token kept in module memory (not
localStorage); refresh token lives in an HttpOnly cookie.

### Components
[frontend/src/components/librora/](frontend/src/components/librora/) — app-specific components.
[frontend/src/components/ui/](frontend/src/components/ui/) — shadcn primitives.
`shared-states.tsx` holds loading/empty/error/processing/premium-locked/quota/offline/confirm states.

### Backend structure (`backend/apps/api/src/`)
`auth/` (JWT + refresh cookie, password reset via Resend), `users/` (profile, soft-delete with grace
period), `library-items/` (CRUD, search, reprocess), `bookshelves/`, `tags/`, `bookshelf-rules/`
(Premium: auto-archive/auto-tag rules), `export/` (Premium: Markdown/EPUB/zip export), `subscriptions/`
+ `billing/` (Stripe Checkout, plan gating), `search/` (keyword + Qdrant semantic), `queue/`
(BullMQ producers + all repeatable-job scheduling), `email/` (Resend wrapper), `feature-gate/`,
`processing-jobs/`, `vector/` (Qdrant client), `common/` (guards, decorators, pipes, filters).

### Backend structure (`backend/apps/worker/src/`)
`processors/` — one `@Processor()` class per BullMQ queue: `item-processing` (fetch → extract →
AI abstract/tags/TOC → embed/upsert → mark ready, gated by plan), `dispatcher` (recovers stuck
transactional-outbox rows), `bookshelf-rules` (daily sweep + on-demand), `email-digest` (weekly
Premium digest), `account-purge` (hard-deletes soft-deleted accounts past grace period).
`pipeline/` — the item-processing steps (fetch, extract-content via Readability, ai-features,
embed-upsert, openai-retry for 429 backoff). `email/templates/` — plain inline-HTML email templates
(mirrors `api`'s own `EmailService` — the two apps don't share code, by design).

### Data model (`backend/prisma/schema.prisma`)
Key models: `User` (soft-delete, `digestEnabled`), `Subscription` (`FREE`/`PREMIUM`, Stripe fields),
`LibraryItem` (`status: PENDING|PROCESSING|READY|PARTIAL|FAILED`, `readableContent` (plain text) +
`readableContentHtml` (for export), `bookshelf`/`bookshelfSource: AUTO|MANUAL`), `ItemTag`, `TocEntry`,
`BookshelfRule` (`AUTO_ARCHIVE_AFTER_DAYS` | `AUTO_TAG_BY_DOMAIN`), `ProcessingJob` (transactional
outbox: `dispatchStatus` + `executionStatus`), `UsagePeriod` (monthly AI/search/reprocess quotas).

### Premium feature gating pattern
Every Premium-only feature follows the same shape: a `PLAN_FEATURES`/`PLAN_LIMITS` map in the owning
service (e.g. `subscriptions.service.ts`, `bookshelf-rules.service.ts`, `export.service.ts`), a
`ForbiddenException({ code: "PREMIUM_REQUIRED", ... })` thrown from an `assertPremium()`-style guard
method, and a matching `PremiumLockState` component on the frontend for the Free-plan UI. `GET
/plan-usage` returns the full feature flag set consumed by the frontend.

### Docs
[docs/HANDOFF.md](docs/HANDOFF.md) and [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md) — architecture
specs and integration history; check before assuming something is still a known gap (G-xx), several
have been closed since those docs were last read closely.

## Lovable sync (important)
This project is connected to [Lovable](https://lovable.dev). Commits pushed to the connected branch
sync back into the Lovable editor, so **keep the branch in a working state**. **Do not rewrite published
git history** (no force-push, rebase, amend, or squash of already-pushed commits) — it corrupts the
user's Lovable project history.
