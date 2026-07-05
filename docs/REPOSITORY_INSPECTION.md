# Librora — Repository Inspection Report

> **Scope:** Inspection only. No files were modified, no code/UI/stack/deps changed, no mock data removed.
> **Date:** 2026-06-30 · **Inspector:** Claude Code
> **Reference docs read:** 04 System Design, 05 UX/UI Brief, 06 Prototype Screen List, 07 Lovable Prompt Pack, 09 API Design, 11 Security Design, 12 Development Backlog, 13 Prompt Engineering Playbook.
> **Subject:** `frontend/` — Lovable-generated TanStack Start prototype.

---

## 1. Repository Summary

### 1.1 Technology Stack (as built)

| Layer | Actual |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR-ready), Vite 8, Nitro build |
| Package manager | **Bun** (`bun.lock`, `bunfig.toml`) — note: `12 Backlog` assumes a monorepo; this is a single `frontend/` app |
| Styling | Tailwind CSS v4 via `src/styles.css` (CSS variable design tokens) |
| UI primitives | shadcn/ui (new-york) + Radix — 46 components in `components/ui/` |
| State | Zustand + `persist` middleware → `localStorage` key `librora-prototype-v1` |
| Routing | File-based (`src/routes/`), `routeTree.gen.ts` auto-generated |
| Forms / validation | react-hook-form + zod (deps present) |
| i18n | **Custom `lib/i18n.tsx` (TH/EN) + `language-switcher`** — present in repo, *not* documented in HANDOFF.md |
| Icons / toasts | lucide-react / sonner |

### 1.2 Structure

```
frontend/
  src/
    routes/                 18 route files + README
    components/
      librora/              18 app components (incl. legacy states.tsx)
      ui/                   46 shadcn primitives
    mocks/                  items.ts (37 items), bookshelves.ts, types.ts
    lib/                    store.ts, i18n.tsx, locales/, utils.ts, error-* (Lovable)
    hooks/                  use-mobile.tsx
    styles.css              tokens + Tailwind v4
  docs (repo root)/         spec .docx files + HANDOFF.md
```

### 1.3 Architectural Reality vs. Target

- **No backend, no API client, no auth.** Confirmed by grep: zero `fetch`/`axios`/`Bearer`/`/api/` calls anywhere. All "API"-shaped behavior is synchronous Zustand mutation.
- **The Zustand store is the entire data + business layer** (`lib/store.ts`). It owns mock items, the simulated processing pipeline, and the "user".
- This matches a Lovable high-fidelity prototype; the entire `12 Backlog` (EP-00…EP-16 backend/worker/AI/search/security) is unbuilt by design.

---

## 2. Route Inventory

| Route file | URL | Screen List ID | Notes |
|---|---|---|---|
| `index.tsx` | `/` | SCR-PUB-001 | Landing |
| `login.tsx` | `/login` | SCR-AUTH-001 | Mock, no real auth |
| `register.tsx` | `/register` | SCR-AUTH-002 | Mock, no real auth |
| `__root.tsx` | — | APP-SHELL-001 | HTML shell |
| `_app.tsx` | — | APP-SHELL-001 | Sidebar + TopHeader layout |
| `_app.library.tsx` | `/library` | SCR-LIB-001/002 | Populated + empty |
| `_app.inbox.tsx` | `/inbox` | SCR-LIB-005 | Library Inbox |
| `_app.bookshelves.tsx` | `/bookshelves` | SCR-ORG-001 | Smart Bookshelves list |
| `_app.bookshelves.$slug.tsx` | `/bookshelves/$slug` | SCR-ORG-002 | Detail |
| `_app.topics.tsx` | `/topics` | SCR-ORG-003 | Tags overview |
| `_app.topics.$slug.tsx` | `/topics/$slug` | SCR-ORG-004 | Topic detail |
| `_app.reading-list.tsx` | `/reading-list` | SCR-ORG-005 | Reading List |
| `_app.archive.tsx` | `/archive` | SCR-ORG-006 | Archive |
| `_app.read.$itemId.tsx` | `/read/$itemId` | SCR-READ-001/002/003 | Reading Room (all states in one file) |
| `_app.search.tsx` | `/search` | SCR-SEARCH-001…004 | Keyword + Semantic + Premium-locked |
| `_app.plan.tsx` | `/plan` | SCR-PLAN-001 | Plan & Usage + scenario toggle |
| `_app.settings.tsx` | `/settings` | SCR-SET-001 | Settings |
| `extension.tsx` | `/extension` | SCR-EXT-001…010 | Popup preview, all 10 states |
| `design-system.tsx` | `/design-system` | — | **Internal token reference (not an MVP screen)** |

**Add/Duplicate dialogs** (SCR-LIB-003/004) are not routes — implemented as `add-to-library-dialog.tsx`. Shared states (SCR-STATE-001…008) live in `shared-states.tsx`.

---

## 3. Component Inventory

### 3.1 Reusable (keep & wire to API)

| Component | Reuse (per Screen List §19) | Status |
|---|---|---|
| `app-sidebar.tsx` / `top-header.tsx` | App Shell — all protected pages | Reusable |
| `library-item-card.tsx` | Library, Search, Shelf, Topic, Reading List, Archive | **Core reusable card** |
| `add-to-library-dialog.tsx` | Library, Empty, Header | Has `setTimeout` sim + dup detection |
| `edit-item-dialog.tsx` | Card / Reading Room | Manual tag/bookshelf/title |
| `filter-bar.tsx` | Library, Search, Shelf, Reading List, Archive | Reusable |
| `search-input.tsx` / `segmented-control.tsx` | Search, Library | Keyword/Semantic switch |
| `status-badge.tsx` | Library, Inbox, Reading Room | 5 statuses |
| `tag-chip.tsx` | Topics, cards | auto/manual indicator |
| `premium-badge.tsx` / `premium-lock.tsx` | Semantic + AI gating | **UX-only gate** |
| `usage-card.tsx` | Plan & Usage | quota display |
| `page-header.tsx` | every list page | title + count + actions |
| `shared-states.tsx` | all list/error/processing/quota/confirm states | Canonical |
| `language-switcher.tsx` | shell | i18n (undocumented add) |

### 3.2 Cleanup flags

- **`states.tsx` is legacy** and should be merged into `shared-states.tsx` (already noted in HANDOFF.md §3). Duplicated state surface = future drift risk.

---

## 4. Mock Data & Temporary Logic

### 4.1 Mock data (`src/mocks/`, do not delete)

- **`items.ts`** — 37 items. Status coverage: ready ×19, processing ×2, partial ×2, failed ×2, pending ×1. `archived` ×1, `inReadingList` ×2.
  - **Gap:** `bookshelfSource: "manual"` appears **0 times** — Screen List §16.2 requires a "Manual Bookshelf" mock item; manual-override state is therefore not demonstrable from seed.
  - **Gap:** Screen List §16.1 requires four user scenarios (Free, Premium, Premium near-quota, Premium quota-exceeded). Only one `defaultUser` (free) exists; the other three are simulated via `/plan?scenario=` toggles + `setPlan`, not seed users.
- **`bookshelves.ts`** — 14 shelves; matches the 13 default + Other from SCR-ORG-001.
- **`types.ts`** — local prototype types. **Diverge from API contract** (see §8).

### 4.2 Temporary logic to replace at integration (`lib/store.ts`)

| Location | Simulation | Replace with |
|---|---|---|
| `addItem` | `setTimeout` 1.5s→processing, 5.5s→ready; fabricates abstract/tags/bookshelf | `POST /items` (202, async pipeline) |
| `reprocess` / `retry` | `setTimeout` 2.5s→ready | `POST /items/{id}/reprocess` |
| `pickBookshelf()` / `pickTags()` | URL substring heuristics | AI classification (worker) |
| `_app.search.tsx` semantic | `score += 0.4 - Math.random()*0.15` | `POST /search/semantic` (vector) |
| `domainOf`, `uid` | client-side URL parse + random id | server normalization + UUID |

---

## 5. State Management & API Placeholder

- **Single global store** `useStore` (`lib/store.ts`) with `persist`. Holds `signedIn`, `user`, `items`, plus prototype sim flags `offline`, `quotaExceeded`.
- Selectors/hooks: `useVisibleItems()`, `useArchive()` (preferred); `selectVisibleItems`/`selectArchive` legacy back-compat.
- **No API placeholder layer exists** — there is no typed client, no error envelope mapping, no refresh logic. `TS-10-013 Frontend API Client and State Layer` is entirely unstarted; today components call store mutations directly.
- **Implication:** integration requires inserting a data-access seam (React Query is already a dependency — `@tanstack/react-query`) between components and a new API client, then retiring store mutations to client cache.

---

## 6. Authentication Placeholder

- `signIn(email?, displayName?)` / `signOut()` flip a boolean and mutate the mock user. No password, no token, no session, no protected-route guard.
- `/login` and `/register` are presentational; any submit "succeeds".
- **No route is actually protected** — `_app.tsx` does not gate on `signedIn`. Direct navigation to `/library` works logged-out.
- Plan changes via `setPlan()` / `/plan?scenario=` — **client-trusted**, exactly what `11 Security` §3.3 and §38 forbid for the real system (acceptable in prototype, must move server-side).

---

## 7. Gap vs. Prototype Screen List (Coverage)

Screen coverage is **essentially complete** (42 screens). Remaining gaps are behavioral, carried from HANDOFF.md "G-xx" and confirmed in code:

| Gap | Screen ref | Confirmed in code |
|---|---|---|
| Pending→Ready auto-promotion not wired for seed items (only newly-added) | SCR-LIB-005 | `addItem` simulates; seed pending item is static |
| Reading Room does not guard non-ready / cross-item / missing id (no 404) | SCR-READ-002/003 | `_app.read.$itemId.tsx` renders any id; no `notFound()` |
| AI Abstract / Auto-Tag gating is display-only, not enforced | SCR-LIB-001 | gating = `user.plan === "free"` render branch |
| Quota Exceeded does not block Add | SCR-STATE-007 | `quotaExceeded` flag drives display only |
| Manual-bookshelf state not in seed | SCR-ORG-002 / §16.2 | `bookshelfSource: "manual"` ×0 |
| Forgot/reset password missing | (auth) | no route |
| Touch targets (28px icon btns < 44px) | §10 responsive | library-item-card |

---

## 8. Gap vs. API Design Specification

The prototype's mock model **predates and diverges from** `09 API`. Key contract gaps to reconcile when building the client:

| API contract | Prototype today | Action |
|---|---|---|
| Envelope `{ data, meta:{requestId,…} }` | raw objects | add client mapping layer |
| Status enums UPPERCASE (`READY`,`PENDING`,`PARTIAL`,`FAILED`,`PROCESSING`) | lowercase (`ready`…) | map at boundary |
| Tags/Bookshelf are `{id,name,source}` objects | `tags: string[]`, `bookshelf` = enum slug | model change |
| `source: "AI" \| "MANUAL"` | `"auto" \| "manual"` | map |
| Item ids = UUID | `itm_` + `Math.random` | server-issued |
| Duplicate = `200 {status:"duplicate"}` | dialog via in-store scan | wire to `POST /items` |
| `customTitle=null` ⇒ fallback title | `title` overloaded | split custom vs extracted |
| Pagination `page/limit/total` | full client array | server pagination |
| Reading Room = `GET /items/{id}/reading-room` w/ availability flags | derived from item fields | endpoint shape differs |
| Idempotency-Key on add/reprocess/semantic | none | add to mutations |
| Endpoints absent entirely | items CRUD, tags, bookshelves, search, plan-usage, inbox, reprocess, extension-auth | all unbuilt (expected) |

No frontend code references any of these endpoints yet, so there is **no contract drift to fix in code** — only model/enum mapping to design when `TS-10-013` starts.

---

## 9. Features Beyond MVP Scope

Screen List §3 forbids out-of-scope features. Repo is clean, with two notes:

- **`/design-system`** — internal token reference, not an MVP user screen. Keep internal / exclude from prod nav (already flagged).
- **i18n (TH/EN) + `language-switcher`** — present but **not requested** by the Screen List (which specifies Thai/English *content*, not a runtime language toggle). Not forbidden, but it is scope the backlog does not track. Flag for product decision; do not expand without sign-off.

No AI Chat, Team, Sharing, Comments, Knowledge Graph, Folders, Rich Text, Payment checkout, etc. — all correctly absent.

---

## 10. Responsive & Accessibility Gaps

Carried from HANDOFF.md §7–8, all UI-only (out of scope to fix this round, listed for backlog):

- **Responsive:** filter bar horizontal-scroll hides Sort/Clear on mobile (G-09); library card icon buttons 28×28 below 44×44 touch target (G-10). Breakpoints 1440/1280/1024/768/430/375 + ext 360–400 covered otherwise.
- **A11y done:** aria-labels on icon buttons, form label+aria-invalid+aria-describedby, `role="status" aria-live` on offline/save, `aria-current` on active TOC, status not by colour alone, Radix focus management.
- **A11y remaining:** skip-to-content link (G-31), `prefers-reduced-motion` (G-12), card overlay focus ring (G-32), touch target (G-10).

---

## 11. Risk List (Security)

Per `11 Security`, frontend gates are **UX only**; every item below is *expected* for a prototype but must be enforced server-side. Listed as forward risks so they are not lost.

| ID | Risk | Where | Severity | Required real control (doc ref) |
|---|---|---|---|---|
| R-1 | **Client-trusted plan/feature lock** — `setPlan`, `?scenario=`, free/premium render branches | `store.ts`, `_app.plan.tsx`, search/read routes | High | Backend entitlement + quota; never trust client (Sec §3.3, §38; TS-03-001/02) |
| R-2 | **No real auth / no token handling** — boolean `signedIn`, no protected routes | `store.ts`, `_app.tsx` | High (for prod) | JWT access + rotating refresh in HttpOnly cookie (Sec §9–13; EP-02) |
| R-3 | **No route guard** — logged-out users reach `/library`, any `/read/{id}` | `_app.tsx`, read route | Medium | Auth guard + ownership 404 (Sec §16; US-04-005) |
| R-4 | **Raw HTML / readable content** — when real extraction lands, `readableContent` is a plain string today; must never be `dangerouslySetInnerHTML` | `_app.read.$itemId.tsx` | High (future) | Structured blocks / allowlist sanitizer, no script/iframe/form (Sec §26–29; TS-06-006, TS-12-005) |
| R-5 | **Extension token** — `/extension` mocks `token-expired`; real handoff absent | `extension.tsx` | High (future) | One-time code + PKCE, token hashed, never in UI/URL/log (Sec §14; TS-11-002) |
| R-6 | **Semantic search isolation** — `Math.random()` placeholder; real path needs user_id filter + PG recheck | `_app.search.tsx` | Critical (future) | 4-layer isolation, leakage=0 test (Sec §19; TS-08-005, TS-12-006) |
| R-7 | **Persisted PII in localStorage** — full items + user in `librora-prototype-v1` | `store.ts` persist | Low (proto) | Don't persist sensitive server data client-side post-integration |
| R-8 | **No SSRF boundary** — add-URL accepts anything client-side | `add-to-library-dialog.tsx`, `store.ts` | High (future) | Server fetcher: DNS/IP/redirect/metadata blocks (Sec §20–25; TS-06-004) |

---

## 12. Files Likely to Change (next round)

Ordered by integration sequence. **None changed in this inspection.**

1. **`src/lib/store.ts`** — split into (a) UI-only store and (b) server data via React Query; remove `setTimeout`/`Math.random`/`pickBookshelf`/`pickTags`/`uid` sims.
2. **`src/mocks/types.ts`** — reconcile to API model (UPPERCASE status, `{id,name,source}` tags/bookshelf, UUID) or add a mapping layer.
3. **New `src/lib/api/` (client) + `src/lib/auth/`** — typed client, envelope/error mapping, token+refresh, idempotency keys (`TS-10-013`).
4. **`src/routes/_app.tsx`** — add auth guard / protected-route redirect.
5. **`src/routes/login.tsx`, `register.tsx`** — wire real auth, preserve input on error.
6. **`src/components/librora/add-to-library-dialog.tsx`** — `POST /items`, real duplicate (`200 duplicate`), idempotency.
7. **`src/routes/_app.read.$itemId.tsx`** — `reading-room` endpoint, ownership 404, non-ready guards, **sanitization seam for content**.
8. **`src/routes/_app.search.tsx`** — real keyword + semantic endpoints; remove random scoring; enforce premium server-side.
9. **`src/routes/_app.plan.tsx`** — `GET /plan-usage`; remove client `setPlan` as entitlement source.
10. **`src/components/librora/shared-states.tsx`** + retire **`states.tsx`** — single state surface.
11. **`src/mocks/items.ts`** — (without deleting) add a manual-bookshelf sample + the missing user scenarios *only if* product wants seed parity; otherwise keep behind a mock flag.

---

## 13. Recommended Story Sequence (Development Backlog IDs)

Frontend-integration-oriented ordering. Backend epics (EP-01/06/07/08 server side) are prerequisites but out of this repo's scope; listed where they unblock UI.

**Phase 0 — Seam (no backend needed)**
- `TS-10-013` Frontend API Client & State Layer — introduce typed client + React Query + **mock adapter separate from production client**. Highest-leverage; everything else depends on it.
- `TS-10-001` Design System / `TS-10-002` App Shell — already largely built; reconcile to spec, retire `states.tsx`.

**Phase 1 — Auth (EP-02)**
- `US-02-001` Register → `US-02-002` Login → `TS-02-003` Refresh rotation → `US-02-004` Logout → `TS-02-006` Guards.
- UI: `US-10-004` Login/Register UI (wire), add route guard in `_app.tsx`.

**Phase 2 — Library Core (EP-04)**
- `TS-04-001` URL validate/normalize → `US-04-002` Add URL → `US-04-003` Duplicate → `US-04-004` List → `US-04-005` Detail → `US-04-006` Title/Note → `US-04-007` Reading List → `US-04-008` Archive/Restore → `US-04-009` Soft Delete.
- UI: `US-10-005` My Library, `US-10-006` Add dialog, `US-10-010` Reading List/Archive.

**Phase 3 — Organization (EP-05)**
- `US-05-001/002/003` Tags, `US-05-004` assign/remove, `US-05-005/006` Bookshelves, `US-05-007` Manual override (→ seed the missing manual-bookshelf mock here), `US-05-008` reset to auto.
- UI: `US-10-008` Tags & Bookshelves.

**Phase 4 — Processing / Inbox (EP-06)**
- `US-04-010` Library Inbox + `US-10-007` Inbox UI; replace `addItem` sim with real status polling.

**Phase 5 — Reading Room (EP-09)**
- `US-09-001` API → `US-09-002` Ready UI → `US-09-003` Processing → `US-09-004` Content Unavailable → `US-09-005` Note editor → `US-09-006` TOC nav. **Add content sanitization here (TS-12-005).**

**Phase 6 — Search (EP-08)**
- `TS-08-001` Search doc → `US-08-002` Keyword → `TS-08-003` Query embedding → `US-08-004` Semantic → `TS-08-005` Isolation guard. UI: `US-10-009` (remove `Math.random`).

**Phase 7 — Plan/Settings (EP-03)**
- `TS-03-001` Feature gate, `TS-03-002` Usage reservation, `US-03-003` + `US-10-011` Plan UI, `US-10-012` Settings. Removes client-trusted gating (R-1).

**Phase 8 — Extension (EP-11)**
- `TS-11-001` Manifest → `TS-11-002` Auth handoff (PKCE) → `US-11-003/004/005` capture → `US-11-006` states → `TS-11-007` packaging.

**Cross-cutting — Security Hardening (EP-12, P0, start early, gate release)**
- `TS-12-001` Headers/CORS, `TS-12-002` CSRF, `TS-12-003` Log redaction, `TS-12-004` Rate limiting, `TS-12-005` Sanitization, `TS-12-006` Semantic isolation tests, `TS-12-007` Secret/dep scan. These map directly to risks R-1…R-8.

**Sequencing rule (Backlog §2):** core/Free-plan paths work before AI; AI failure must never break Library Core; every user-owned resource query carries `user_id`.

---

### Appendix — Inspection method
Specs are `.docx`; extracted to text via `python-docx` for reading (no repo files touched). Findings cross-checked against live source: `lib/store.ts`, `mocks/*`, all `routes/*`, `components/librora/*`. Grep confirmed **zero** real network/auth calls in the codebase.
