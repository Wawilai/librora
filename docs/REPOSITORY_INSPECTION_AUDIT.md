# Repository Inspection Report

> **Round:** Lovable Prototype Handoff Audit (18-section) · **Date:** 2026-06-30 · **Inspector:** Claude Code
> **Scope:** Inspection only. No files modified/created/deleted in the inspection round; no deps, stack, refactor, backend, or mock-data changes. (This report file was written in a later round at the user's explicit request.)
> **Subject:** `frontend/` — Lovable-generated TanStack Start prototype.
> **Companion doc:** an earlier 13-section pass exists at [REPOSITORY_INSPECTION.md](REPOSITORY_INSPECTION.md). This file is the deeper 18-section audit.
> **Reference docs (real filenames, `.docx` under `docs/`):** `04-System Design Specification.docx`, `05-UX-UI Design Brief for Librora.docx`, `06-Prototype Screen List.docx`, `07-Lovable Master and Page Prompt Pack.docx`, `09-API Design Specification - Librora.docx`, `11-Security Design Specification.docx`, `12-Librora Development Backlog.docx`, `13-Prompt Engineering Playbook.docx`.

---

## 1. Executive Summary

**Subject:** `frontend/` — a Lovable-generated **TanStack Start** high-fidelity interactive prototype for Librora.

**Verdict:** Screen coverage is near-complete (≈42 screens present and navigable), but the app is **100% client-side mock**. Verified by grep: **zero** `fetch`/`axios`/`/api/`/`Bearer` calls anywhere in `src/`. There is no backend, no API client, no real auth, no tests, and no typecheck script. The entire `12_Development_Backlog` server stack (EP-01/02/04/06/07/08, security) is unbuilt by design.

**Three findings that matter most for handoff:**
1. **Duplicate state-component layer is the dominant path.** `components/librora/states.tsx` (legacy) is imported by **9 routes**; the intended replacement `shared-states.tsx` by only **2**. Reconcile before integration, or fixes will drift.
2. **Loading/Error/Empty states are largely simulated via a URL param** (`/library?state=loading|error|empty`), not derived from real async states — visual only, no data-layer wiring.
3. **All Free/Premium gating, "auth", and plan/quota are client-trusted** (`store.ts`, `setPlan`, `?scenario=`) — acceptable for a prototype, but every one is a server-enforcement gap per `11_Security`.

**No repository changes were made during inspection. No repo-altering commands were run.**

---

## 2. Repository and Technology Inventory

*(All "found" — verified in cited files.)*

| Aspect | Finding | Source |
|---|---|---|
| Repo structure | Root has `docs/` + `frontend/`. Not a monorepo. Root is **not** a git repo. | `ls` |
| Package manager | **Bun** | `frontend/bun.lock`, `bunfig.toml` |
| Framework | TanStack Start v1, React 19.2 | `package.json` |
| Build tool | Vite 8 + Nitro (via `@lovable.dev/vite-tanstack-config`) | `vite.config.ts` |
| TypeScript | 5.8, **`strict: true`**, `noEmit`, Bundler resolution, `@/*`→`./src/*`. `noUnusedLocals/Parameters: false`. | `tsconfig.json` |
| Styling | Tailwind CSS v4 via `src/styles.css` (CSS-var tokens) | `package.json`, `styles.css` |
| UI library | shadcn/ui (new-york) + Radix; **46** primitives | `components.json`, `components/ui/` |
| State | Zustand 5 + `persist` → `localStorage` key `librora-prototype-v1` | `lib/store.ts` |
| Form/validation | react-hook-form 7 + zod 3 + `@hookform/resolvers` (deps present; zod used for route search params) | `package.json`, `_app.library.tsx:20` |
| **Testing** | **Not Found** — no vitest/jest/playwright dep, no config, no `test` script | `package.json`, `ls` |
| Env config | **Not Found** — no `.env`/`.env.example`; `.dev.vars` gitignored only | `ls`, `.gitignore` |
| Routing | File-based `src/routes/`; `routeTree.gen.ts` generated | `routes/README.md` |
| i18n | **Custom `lib/i18n.tsx` (TH/EN) + `locales/` + `language-switcher`** — present, undocumented in HANDOFF | `lib/i18n.tsx`, `lib/locales/` |
| Lovable infra | `lib/error-capture.ts`, `lib/lovable-error-reporting.ts`, `lib/error-page.ts`, `server.ts`, `start.ts` | source |

**Conflict (doc vs code):** `12_Backlog` TS-00-001 specifies a **monorepo** (`apps/web|api|worker|extension`, `packages/`). The repo is a **single `frontend/` app**. Flag for alignment.

---

## 3. Build and Script Inventory

**Found scripts** (`package.json`):

| Purpose | Command | Note |
|---|---|---|
| Install | `bun install` | Bun lockfile |
| Development | `bun run dev` (`vite dev`) | |
| Lint | `bun run lint` (`eslint .`) | flat config, `eslint.config.js` |
| Format | `bun run format` (`prettier --write .`) | **mutating** — avoid in inspection |
| Build | `bun run build` (`vite build`) / `bun run build:dev` | |
| Preview | `bun run preview` | |
| **Type Check** | **Not Found** — no script. Read-only equivalent: `bunx tsc --noEmit` (safe, `noEmit` already set) | gap |
| **Test** | **Not Found** — no framework configured | gap |

Read-only verification commands are in §18.

---

## 4. Route and Screen Inventory

*All routes verified to exist. State columns from per-file grep. "Sim" = state shown via URL override, not real async.*

| Route | File (`src/routes/`) | Screen ID | Status | Mock data | Loading | Empty | Error | Responsive |
|---|---|---|---|---|---|---|---|---|
| `/` | `index.tsx` | SCR-PUB-001 | Complete | static | n/a | n/a | n/a | Yes |
| `/login` | `login.tsx` | SCR-AUTH-001 | Partial (mock auth) | — | btn spinner | n/a | Yes (sim via `wrong@`/`offline@`) | Yes |
| `/register` | `register.tsx` | SCR-AUTH-002 | Partial (mock) | — | Partial | n/a | Partial | Yes |
| — | `__root.tsx` / `_app.tsx` | APP-SHELL-001 | Complete | store | — | — | root errorComponent | Yes |
| `/library` | `_app.library.tsx` | SCR-LIB-001/002 | Complete | Yes | **Sim** | Yes | **Sim** (`?state=`) | Yes |
| `/inbox` | `_app.inbox.tsx` | SCR-LIB-005 | Complete | Yes | No | Yes (per section) | No | Yes |
| `/bookshelves` | `_app.bookshelves.tsx` | SCR-ORG-001 | Partial | Yes | **No** | **No** | **No** | Yes |
| `/bookshelves/$slug` | `_app.bookshelves.$slug.tsx` | SCR-ORG-002 | Complete | Yes | No | Yes | No | Yes |
| `/topics` | `_app.topics.tsx` | SCR-ORG-003 | Complete | Yes | Sim | Yes | Sim | Yes |
| `/topics/$slug` | `_app.topics.$slug.tsx` | SCR-ORG-004 | Complete | Yes | Sim | Yes | Sim | Yes |
| `/reading-list` | `_app.reading-list.tsx` | SCR-ORG-005 | Complete | Yes | No | Yes | No | Yes |
| `/archive` | `_app.archive.tsx` | SCR-ORG-006 | Complete | Yes | No | Yes | No | Yes |
| `/read/$itemId` | `_app.read.$itemId.tsx` | SCR-READ-001/002/003 | Complete | Yes | inline (processing) | "Item not found" inline | inline (partial/failed) | Yes |
| `/search` | `_app.search.tsx` | SCR-SEARCH-001…004 | Complete | Yes | No | Yes | No | Yes |
| `/plan` | `_app.plan.tsx` | SCR-PLAN-001 | Complete | computed | No | n/a | No | Yes |
| `/settings` | `_app.settings.tsx` | SCR-SET-001 | Complete | store | No | n/a | No | Yes |
| `/extension` | `extension.tsx` | SCR-EXT-001…010 | Complete | static | Yes (state) | n/a | Yes (states) | Yes (360–400px) |
| `/design-system` | `design-system.tsx` | — | Internal (not MVP) | static | — | — | — | Yes |

**Dialogs (not routes):** Add `SCR-LIB-003` + Duplicate `SCR-LIB-004` → `add-to-library-dialog.tsx`. Edit `SCR-LIB-006` → `edit-item-dialog.tsx`. Shared states `SCR-STATE-001…008` → `shared-states.tsx` / `states.tsx`.

**No `Missing` screens detected.** Gaps are state-level (above) and behavioral (§9).

---

## 5. Shared Component Inventory

*Path = `src/components/librora/` unless noted. All "found".*

| Component | File | Role | Used by | Reusable | Duplicate? | Later improvement |
|---|---|---|---|---|---|---|
| Application Shell | `routes/_app.tsx` | Sidebar+Header layout | all `_app.*` | Yes | — | add auth guard |
| Sidebar | `app-sidebar.tsx` | nav, collapse, mobile sheet | shell | Yes | — | — |
| Header | `top-header.tsx` | search trigger, account, add | shell | Yes | — | — |
| Global Search | `search-input.tsx` + `segmented-control.tsx` | input + keyword/semantic | library, search | Yes | — | — |
| Library Item Card | `library-item-card.tsx` | item card + actions | library, search, shelf, topic, reading-list, archive | Yes (core) | — | touch target 28→44px (G-10) |
| Status Badge | `status-badge.tsx` | 5 statuses | library, inbox, read | Yes | — | — |
| Tag Chip | `tag-chip.tsx` | auto/manual tag | topics, cards | Yes | — | — |
| Bookshelf Card | *inline in* `_app.bookshelves.tsx` | shelf card | bookshelves | Partial | — | **not extracted** to a component |
| Filter Bar | `filter-bar.tsx` | filter/sort/clear | library, search, shelf, reading-list, archive | Yes | — | mobile sort/clear scroll (G-09) |
| Dialog | `add-to-library-dialog.tsx`, `edit-item-dialog.tsx` (+ ui/dialog) | add/edit | library, header, card | Yes | — | wire to API |
| Drawer | `components/ui/sheet.tsx`, `drawer.tsx` | mobile panels | shell, read | Yes | — | — |
| Toast | `sonner` + `components/ui/sonner.tsx` | feedback | many | Yes | — | — |
| Loading Skeleton | `shared-states.tsx` **and** `states.tsx` | skeletons | mixed | Yes | **DUPLICATE** | consolidate |
| Empty State | `shared-states.tsx` **and** `states.tsx` | empty | mixed | Yes | **DUPLICATE** | consolidate |
| Error State | `shared-states.tsx` **and** `states.tsx` | error | mixed | Yes | **DUPLICATE** | consolidate |
| Premium Lock State | `premium-lock.tsx` (+ `premium-badge.tsx`) | UX gate | search, read | Yes | — | UX-only (see §11) |
| Usage Card | `usage-card.tsx` | quota display | plan | Yes | — | — |
| Note Editor | *inline in* `_app.read.$itemId.tsx` + `edit-item-dialog.tsx` | note edit/save | read, edit | Partial | — | **not a standalone component** |
| Table of Contents | *inline in* `_app.read.$itemId.tsx` | TOC nav + drawer | read | Partial | — | extract for reuse/testing |

**Confirmed duplication (high priority):** `states.tsx` (legacy) is imported by **9 routes** — `design-system`, `_app.archive`, `_app.bookshelves.$slug`, `_app.inbox`, `_app.library`, `_app.reading-list`, `_app.search`, `_app.topics`, `_app.topics.$slug`. `shared-states.tsx` by only **2** (`_app.topics`, `_app.topics.$slug`). Two routes import **both**. HANDOFF.md §3 already flags `states.tsx` as "legacy — should merge."

---

## 6. Mock Data and Temporary Logic Inventory

| Item | Location | Impact |
|---|---|---|
| Mock items (37) | `mocks/items.ts` | Source of all list data; statuses ready×19/processing×2/partial×2/failed×2/pending×1; archived×1; readingList×2 |
| Mock bookshelves (14) | `mocks/bookshelves.ts` | Static shelf defs + labels |
| Prototype types | `mocks/types.ts` | **Diverge from API** (§8) |
| Hardcoded user | `lib/store.ts:51` `defaultUser` (free) | Single user; no Premium/near/exceeded **seed users** (spec §16.1 wants 4) |
| Hardcoded plan | `lib/store.ts` `setPlan` + `_app.plan.tsx` `?scenario=`, Switch | Client-trusted plan toggle |
| Hardcoded usage | `_app.plan.tsx:51` "Limits per plan", computed `used:` values | Quota numbers are literals, not `UsageSnapshot` |
| Fake processing | `lib/store.ts` `addItem` (`setTimeout` 1500→processing, 5500→ready), `reprocess`/`retry` (2500) | Simulated pipeline; fabricates abstract/tags/bookshelf |
| Fake search results | `_app.search.tsx:71` `score += 0.4 - Math.random()*0.15` | Semantic scores are random |
| Fake auth | `login.tsx` (`wrong@`/`offline@` triggers, `signIn` flips bool), `register.tsx` | No real credentials/session |
| LocalStorage | `lib/store.ts` persist (`librora-prototype-v1`: user+items), `lib/i18n.tsx:63/76` (locale) | Persists mock PII client-side |
| Temporary API service | **Not Found** (no API layer exists at all) | Must be built (`TS-10-013`) |
| Delay simulation | `setTimeout` in `store.ts` (pipeline) and `_app.read.$itemId.tsx:54` (note autosave) | Replace with real async |
| Placeholder button / dead link | **Not Found** — no `href="#"`, no empty `onClick`, no dead links | Clean |
| TODO/FIXME/HACK | **Not Found** in `src/` | Clean |
| State simulation override | `_app.library.tsx:20` `z.enum(["loading","error","empty"])` via `?state=` | Loading/Error are URL-driven, not data-driven |
| `pickBookshelf`/`pickTags`/`uid`/`domainOf` | `lib/store.ts:207–231,39–49` | URL-heuristic classification + client id |

---

## 7. Authentication Readiness

| Element | Found? | Detail / File |
|---|---|---|
| Login UI | Yes (prototype) | `login.tsx` — real client validation (`emailErr`/`pwErr`), simulated error via magic emails |
| Register UI | Yes (prototype) | `register.tsx` |
| Protected Route | **Not Found** | `_app.tsx` does **not** gate on `signedIn`; `/library` reachable logged-out |
| Auth Context | Partial | `store.ts` `signedIn` boolean + `user`; no token context |
| Token Handling | **Not Found** | no access/refresh token anywhere |
| Refresh Flow | **Not Found** | — |
| Logout Flow | Yes (prototype) | `store.ts` `signOut()` flips boolean |
| User Profile State | Yes (prototype) | `store.ts` `user`, `setDisplayName`; `_app.settings.tsx` |

**Ready to wire:** Login/Register/Settings UI, profile shape. **Must be built:** protected-route guard, token+session, refresh.
**Constraint honored:** Refresh token must go in an **HttpOnly Secure SameSite cookie** (`11_Security` §12) — **not** localStorage. (Current code stores no token at all, so no violation exists yet; just don't introduce one.)

---

## 8. API Integration Mapping

**Frontend API readiness — all Not Found:** API client, Base URL config, request/response types, error mapping, query cache (React Query is a *dependency* but **not used** — no `QueryClientProvider` found), mutation handling, auth interceptor, refresh handling, idempotency-key support. The data seam is direct Zustand calls.

| Screen/Feature | Current Data Source | Required Endpoint (`09_API`) | Integration Status | Gap |
|---|---|---|---|---|
| Register | `store.signIn` | `POST /auth/register` | Not started | no client/token |
| Login | `store.signIn` | `POST /auth/login` | Not started | no session |
| Session/refresh/logout | `signedIn` bool | `GET /auth/session`, `POST /auth/refresh`, `/logout` | Not started | — |
| My Library list | `useVisibleItems()` | `GET /items` (+page/filter/sort) | Not started | client array, no pagination |
| Add to Library | `store.addItem` (setTimeout) | `POST /items` (+Idempotency-Key) | Not started | sim pipeline |
| Duplicate | in-store URL scan | `POST /items` → `200 {status:"duplicate"}` / `check-existing` | Not started | — |
| Item detail | `items.find` | `GET /items/{id}` | Not started | no 404/ownership |
| Update title/note | `updateItem`/`setNote` | `PATCH /items/{id}` | Not started | — |
| Reading List | `toggleReadingList` | `PUT/DELETE /items/{id}/reading-list` | Not started | — |
| Archive/Restore | `archive`/`restore` | `PUT/DELETE /items/{id}/archive` | Not started | — |
| Delete | `remove` | `DELETE /items/{id}` (soft) | Not started | — |
| Inbox | status filter on items | `GET /library-inbox` | Not started | — |
| Reading Room | item fields | `GET /items/{id}/reading-room` | Not started | availability flags differ |
| Reprocess | `reprocess` (setTimeout) | `POST /items/{id}/reprocess` | Not started | — |
| Tags list/CRUD | derived from item tags | `GET/POST/PATCH/DELETE /tags`, item-tag | Not started | tags are `string[]` |
| Bookshelves | `BOOKSHELVES` + item field | `GET /bookshelves`, `PUT /items/{id}/bookshelf` | Not started | — |
| Keyword Search | client filter | `GET /search/keyword` | Not started | — |
| Semantic Search | `Math.random()` | `POST /search/semantic` (+Idempotency) | Not started | random scoring |
| Plan & Usage | computed literals | `GET /plan-usage`, `GET /plans` | Not started | client-trusted |
| Extension capture | mock states | `POST /items` + `extension-auth/*` | Not started | no real handoff |

**Model conflicts to map at the boundary:** status `ready`→`READY` (lowercase vs UPPERCASE); `tags: string[]` vs `{id,name,source}`; `bookshelf` enum slug vs object; `source "auto"/"manual"` vs `"AI"/"MANUAL"`; `itm_`+random vs UUID; no `{data,meta}` envelope.

---

## 9. UX/UI Gap Matrix

| Area | Missing screen | Missing state | Terminology / Interaction / Rule | Responsive / A11y |
|---|---|---|---|---|
| Navigation | none | — | OK | shell responsive |
| My Library | none | Loading/Error are **URL-sim only** | OK | card touch target <44px (G-10) |
| Add to Library | none | — | OK; dup via in-store scan | mobile OK |
| Duplicate | none (dialog) | — | OK | — |
| Library Inbox | none | **no Loading, no Error** | imports **legacy `states.tsx`** | OK |
| Keyword Search | none | no Loading/Error | OK | OK |
| Semantic Search | none | no Loading | random scores (proto) | OK |
| Premium Locked | none | — | Free-user lock = **UI only** | OK |
| Reading Room | none | states inline (ok) | **no real not-ready/ownership guard** (soft "not found" only) | OK; TOC drawer |
| Content Unavailable | none | — | OK | OK |
| Smart Bookshelves | none | **no Loading/Empty/Error**; Bookshelf card **not extracted** | OK | OK |
| Topics | none | — | uses both state modules | OK |
| Reading List | none | no Loading/Error | OK | OK |
| Archive | none | no Loading/Error | OK | OK |
| Plan & Usage | none | — | usage = literals; plan client-trusted | OK |
| Settings | none | no save Loading/Error verified | OK | OK |
| Extension states | all 10 present | — | OK | 360–400px |
| **Cross-cutting** | — | — | **"Topics" vs "Tags"** inconsistency (G-13, doc-noted) | skip-link (G-31), reduced-motion (G-12), focus ring (G-32) outstanding |
| **i18n** | — | — | TH/EN toggle present but **not in Screen List scope** | — |

---

## 10. Scope Compliance Findings

Searched for all out-of-scope features (`12_Backlog §3.2`, `06 §3`). **Result: clean.** No AI Chat, Team Workspace, Public Sharing, Collaboration, Comments, Nested Folder, Knowledge Graph, Recommendation Feed, **Payment Checkout** (Plan page has upgrade CTA but no checkout — compliant), Admin Portal, Notification Center, Calendar, Tasks, or native-mobile features found.

**Two items for product decision (not violations):**
- `/design-system` (`routes/design-system.tsx`) — internal token reference, not an MVP user screen. Keep out of prod nav.
- **i18n TH/EN + `language-switcher`** (`lib/i18n.tsx`, `lib/locales/`, `components/librora/language-switcher.tsx`) — present but **not requested** by Screen List (which asks for TH/EN *content*, not a runtime toggle). Out-of-tracked-scope, not out-of-MVP-scope. Don't expand without sign-off.

---

## 11. Security Findings *(prototype-level; all gates are UX-only as expected)*

| Check | Finding |
|---|---|
| Token storage | **No token stored** (no auth). Persisted in `localStorage`: mock user + items only. **Do not** introduce refresh-token-in-localStorage later. |
| Secrets in frontend | **None found.** No API keys, no `.env`. |
| Raw HTML rendering | Reading Room renders `readableContent` as **plain text paragraphs** (`_app.read.$itemId.tsx:64-67` via `.split("\n\n")`) — safe today. |
| `dangerouslySetInnerHTML` | **One** occurrence: `components/ui/chart.tsx:73` — shadcn boilerplate injecting chart CSS vars (not user content). Acceptable; not used by app screens. |
| Unvalidated external URL | `store.ts` `addItem` accepts any string; `domainOf` parses client-side. No SSRF boundary (expected — must be server-side per `11 §20-25`). External links: verify `rel="noopener noreferrer"` when wiring real source links. |
| Client-side feature lock as enforcement | **Yes — multiple:** `user.plan === "free"` branches in `_app.search.tsx`, `_app.read.$itemId.tsx`; `setPlan`/`?scenario=` in `_app.plan.tsx`. UX only; **must be enforced server-side** (`11 §3.3, §38`). |
| Hardcoded user ID / client-as-owner | `defaultUser.id = "usr_local"` (`store.ts:51`); single-user prototype. No owner-from-client pattern (no API). Real API must derive `user_id` from auth context (`09 §6.3`). |
| CORS / API config | **Not Found** (no API). N/A this round. |
| Sensitive data in console | `console.error` only in `server.ts`, `start.ts`, `__root.tsx`, Lovable error-reporting — **SSR/error infra, no secrets/PII**. No `console.log` in app code. |

---

## 12. Architecture Fit Assessment

| Target (`04`/`12`) | Current | Fit |
|---|---|---|
| React + TypeScript (strict) | React 19 + TS strict | ✅ Strong |
| Next.js | **TanStack Start** | ⚠️ Conflict — see below |
| Tailwind CSS | Tailwind v4 | ✅ |
| shadcn/ui-compatible | shadcn new-york, 46 prims | ✅ Strong |
| Typed API Client | none | ❌ Build (`TS-10-013`) |
| TanStack Query | **dependency present, unused** | ⚠️ Easy to adopt |
| React Hook Form | dep present (used lightly) | ✅ |
| Zod | dep present (route params) | ✅ |
| Modular page/feature structure | file-based routes, inline logic | ⚠️ feature folders not separated |
| Shared UI package | single app, no `packages/` | ⚠️ monorepo conflict |
| Mock data separate from UI | `mocks/` separated ✅ but **business logic lives in `store.ts`** mixed with UI state | ⚠️ partial |

**Primary conflict:** Docs say **Next.js + monorepo**; repo is **TanStack Start, single app**. Impact: API-client/auth/SSR patterns will follow TanStack Start conventions (route loaders, `*.server.ts`) rather than Next.js App Router. Per constraint, **stack is not to be changed** — adapt the integration plan to TanStack Start. The React/TS/Tailwind/shadcn/zod/RHF core is fully on-target.

---

## 13. Missing Prerequisites

*(Found absent — required before integration milestones.)*
- **No typecheck script** and **no test framework/config** (`TS-00-002/003/005`, EP-14).
- **No `.env.example`** / env config module (`TS-00-006`).
- **No API client / React Query provider / auth context** (`TS-10-013`).
- **No route guard** for protected pages.
- **No CI** (no `.github/`), no secret/dependency scan (`TS-12-007`).
- **Monorepo + backend** (`apps/api|worker`, PostgreSQL/Redis/Qdrant) entirely absent (`TS-00-001`, EP-01/06).
- **State-component consolidation** (`states.tsx` vs `shared-states.tsx`) — prerequisite to avoid divergent fixes.

---

## 14. Recommended Story Sequence

*Adapted to TanStack Start (single app today). Story IDs from `12_Backlog`. "FE files" = where work lands in this repo.*

| # | Phase | Story IDs | Reason | Dependency | FE files | Backend dep | Risk |
|---|---|---|---|---|---|---|---|
| 1 | **Frontend Stabilization** | (pre-`TS-10-001`/`-002`) | Consolidate `states.tsx`→`shared-states.tsx`; extract Bookshelf Card / Note Editor / TOC; replace `?state=` sim with real state slots | none | `components/librora/states.tsx`, `shared-states.tsx`, 9 route importers | none | Low; touches many imports |
| 2 | **Repository Foundation** | TS-00-002/003/005/006 | Add typecheck+test+CI+env; decide monorepo vs keep single-app | 1 | root config, new `apps/` (if adopted) | — | Med (stack/monorepo decision) |
| 3 | **Authentication Foundation** | US-02-001/002, TS-02-003, US-02-004, TS-02-006 | Real auth + guard | 2, EP-01 | `login.tsx`, `register.tsx`, `_app.tsx`, new auth ctx | API+DB | High (security) |
| 4 | **Typed API Client** | TS-10-013 | Seam everything depends on; adopt React Query | 2 | new `lib/api/`, providers | API contract | High leverage |
| 5 | **Library Core Integration** | US-04-001…010, US-10-005/006/010 | Replace store sims | 4 | `store.ts`, library/add/reading-list/archive | EP-04 | Med |
| 6 | **Processing & Inbox** | TS-06-* (BE), US-04-010, US-10-007 | Real status; inbox states | 5, EP-06 | `_app.inbox.tsx` | EP-06 | Med |
| 7 | **Tags & Bookshelves** | US-05-001…008, US-10-008 | Org + manual override; seed manual-bookshelf mock here | 5 | topics/bookshelves routes | EP-05 | Med |
| 8 | **Keyword Search** | TS-08-001, US-08-002, US-10-009 | Free-plan search | 5 | `_app.search.tsx` | EP-08 | Low |
| 9 | **Reading Room** | US-09-001…006 | Real content + **sanitization seam** | 5,6,7 | `_app.read.$itemId.tsx` | EP-06/07/09 | High (XSS) |
| 10 | **Plan & Usage** | TS-03-001/002, US-03-003, US-10-011 | Server entitlement removes R-1 | 3,4 | `_app.plan.tsx`, `usage-card.tsx` | EP-03 | Med |
| 11 | **AI Processing** | TS-07-* (BE) | Premium pipeline | 6,10 | (BE) | EP-07 | Med |
| 12 | **Semantic Search** | TS-08-003/004/005 | Remove `Math.random`; isolation | 8,10,11 | `_app.search.tsx` | EP-07/08 | Critical (leakage) |
| 13 | **Browser Extension** | TS-11-*, US-11-* | Real capture+handoff | 3,5 | `extension.tsx` (+ new ext app) | EP-11 | High (token) |
| 14 | **Security Hardening** | TS-12-001…008 | Gate release | 3-13 | headers/CORS/CSRF/sanitize/rate-limit | EP-12 | P0 |
| 15 | **Automated Testing** | EP-14 | DoD coverage | 2+ | new test suites | — | Med |

---

## 15. Files Likely to Change

*(Predictive — none changed during inspection.)*
1. `src/components/librora/states.tsx` → consolidate into `shared-states.tsx`; **update 9 route imports**.
2. `src/lib/store.ts` — split UI store vs server data (React Query); remove `setTimeout`/`Math.random`/`pickBookshelf`/`pickTags`/`uid`.
3. `src/mocks/types.ts` — reconcile to API model or add mapping layer.
4. **New** `src/lib/api/` (client, error map, idempotency) + auth context.
5. `src/routes/_app.tsx` — protected-route guard.
6. `src/routes/login.tsx`, `register.tsx` — real auth.
7. `src/routes/_app.library.tsx` — replace `?state=` sim with real loading/error.
8. `src/components/librora/add-to-library-dialog.tsx` — `POST /items`, real dup, idempotency.
9. `src/routes/_app.read.$itemId.tsx` — reading-room endpoint, guard, **content sanitization seam**.
10. `src/routes/_app.search.tsx` — real keyword/semantic; remove random scoring.
11. `src/routes/_app.plan.tsx` + `usage-card.tsx` — `GET /plan-usage`; drop client `setPlan` as entitlement.
12. `src/routes/_app.bookshelves.tsx` — extract Bookshelf Card; add states.
13. `src/routes/_app.inbox.tsx` — add loading/error.

---

## 16. Risks and Blockers

| ID | Risk / Blocker | Severity |
|---|---|---|
| B-1 | **Stack conflict**: docs assume Next.js + monorepo; repo is TanStack Start single-app. Blocks §14 phase 2 until decided. | High |
| B-2 | No backend / DB / API contract implemented — all integration phases blocked on EP-01/02/04. | High (expected) |
| R-1 | Client-trusted plan/feature lock (`store.ts`, `_app.plan.tsx`, search/read). | High |
| R-2 | No real auth / no protected routes (`_app.tsx`). | High |
| R-3 | Duplicate state modules; legacy path dominant (9 vs 2 imports). | Med (drift) |
| R-4 | Loading/Error states are URL-sim, not data-wired (`_app.library.tsx:20`). | Med |
| R-5 | Future raw-HTML in Reading Room must stay sanitized (today plain-text safe). | High (future) |
| R-6 | Semantic search needs 4-layer isolation when real (today random). | Critical (future) |
| R-7 | No tests / no typecheck script / no CI → no DoD gate. | Med |
| R-8 | Mock PII persisted in `localStorage`. | Low (proto) |
| C-1 | API model conflicts (case/shape/id) need a mapping layer. | Med |

---

## 17. Recommended First Implementation Story

**Frontend Stabilization — consolidate the duplicate state-component layer (`states.tsx` → `shared-states.tsx`).**

- **Why first:** It's the only high-impact task with **zero backend dependency**, fully inside the no-stack-change constraint, and it removes the dominant drift risk (R-3) before any integration multiplies it across 9 routes. It also right-sizes the component surface that `TS-10-001`/`TS-10-002` (Design System / Shell) formally cover.
- **Backlog anchor:** preparatory to **`TS-10-001` Implement Design System** (which lists Empty/Error/Status/Skeleton/Usage as canonical components).
- **Scope (future round):** pick `shared-states.tsx` as canonical, port any unique exports from `states.tsx`, update the 9 importing routes, delete `states.tsx`. Pair with extracting the inline **Bookshelf Card** and **Note Editor/TOC** so the shared inventory matches `06 §19`.
- **Dependency:** none. **Risk:** low (mechanical import updates; `lint` + `tsc --noEmit` verify).

---

## 18. Commands Recommended for the Next Step

**Read-only / verification (safe — do not alter repo):**
```bash
cd "d:/Own Projects/Librora/project/frontend"
bunx tsc --noEmit             # type check (noEmit already set; no files written)
bun run lint                  # eslint, read-only
```

**Mutating — only with explicit approval (NOT during inspection):**
```bash
bun install                   # writes node_modules
bun run dev                   # start dev server
bun run build                 # writes dist/.output
bun run format                # rewrites files (Prettier) — avoid until approved
```

> `bun run dev`/`build` don't modify source but produce artifacts and run the toolchain. `bun run format` **rewrites files** — exclude unless approved.

---

### Appendix — Method & Conventions

- Specs are `.docx`; extracted to text via `python-docx` for reading (no repo files touched during inspection).
- Cross-checked against live source: `lib/store.ts`, `mocks/*`, all `routes/*`, `components/librora/*`, configs. Grep confirmed **zero** real network/auth calls.
- "Found" facts (§2–13) separated from "recommendation" (§14–18). Absent items marked **Not Found**. Doc-vs-code conflicts flagged in §2, §12, §16.
