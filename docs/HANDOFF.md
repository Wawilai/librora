# Librora — Developer Handoff

สรุปสถานะ production-wiring สำหรับส่งต่อให้ทีมพัฒนา / AI Coding Agent ใน VSCode
อ้างอิงผล PROMPT-LV-001 ถึง PROMPT-LV-023

---

## 1. Tech Stack

- **Framework:** TanStack Start v1 (React 19, Vite 8, SSR-ready)
- **Styling:** Tailwind CSS v4 ผ่าน `src/styles.css` (CSS variables / design tokens)
- **UI Primitives:** shadcn/ui + Radix
- **State:** Zustand UI/session cache ที่ `src/lib/store.ts` (server data มาจาก API)
- **Icons:** lucide-react
- **Routing:** File-based ที่ `src/routes/` (อย่าแก้ `routeTree.gen.ts`)
- **Toasts:** `sonner`

---

## 2. Route List

| Path | ไฟล์ | จุดประสงค์ |
|---|---|---|
| `/` | `routes/index.tsx` | Landing page |
| `/login` | `routes/login.tsx` | เข้าสู่ระบบผ่าน real API |
| `/register` | `routes/register.tsx` | สมัครสมาชิกผ่าน real API |
| `/forgot-password` | `routes/forgot-password.tsx` | เรียก password reset API — backend ส่งอีเมลผ่าน Resend จริงแล้ว |
| `/reset-password` | `routes/reset-password.tsx` | เรียก password reset confirm API — ทำงานจริงแล้ว |
| `/library` | `routes/_app.library.tsx` | Personal Library — รายการทั้งหมด |
| `/inbox` | `routes/_app.inbox.tsx` | รายการที่ pending / processing / failed |
| `/bookshelves` | `routes/_app.bookshelves.tsx` | Smart Bookshelves list |
| `/bookshelves/$slug` | `routes/_app.bookshelves.$slug.tsx` | รายการในชั้นหนังสือ |
| `/topics` | `routes/_app.topics.tsx` | Auto Tags overview |
| `/topics/$slug` | `routes/_app.topics.$slug.tsx` | รายการใน tag |
| `/reading-list` | `routes/_app.reading-list.tsx` | Reading List |
| `/archive` | `routes/_app.archive.tsx` | Archive + Soft Delete |
| `/read/$itemId` | `routes/_app.read.$itemId.tsx` | Reading Room (TOC + Personal Note) |
| `/search` | `routes/_app.search.tsx` | Keyword + Semantic Search |
| `/plan` | `routes/_app.plan.tsx` | Plan & Usage — Upgrade/Manage billing ผ่าน Stripe Checkout จริงแล้ว |
| `/settings` | `routes/_app.settings.tsx` | Settings |
| `/extension` | `routes/extension.tsx` | Library Clipper status/install page — pings + auto-connects the browser extension if installed |
| `/design-system` | `routes/design-system.tsx` | **Internal** — token reference (ไม่ใช่ฟีเจอร์ผู้ใช้) |

Layout: `routes/__root.tsx` (HTML shell) → `routes/_app.tsx` (Sidebar + TopHeader)

---

## 3. Shared Components

ที่ `src/components/librora/`

| Component | จุดประสงค์ |
|---|---|
| `app-sidebar.tsx` | Sidebar + collapsible + mobile sheet |
| `top-header.tsx` | Header + global search trigger + account |
| `library-item-card.tsx` | การ์ดรายการ (status, tags, actions) |
| `add-to-library-dialog.tsx` | Dialog เพิ่ม URL + duplicate detection |
| `edit-item-dialog.tsx` | แก้ tag/bookshelf/title |
| `filter-bar.tsx` | Filter + Sort + Clear |
| `search-input.tsx` | Input + submit on Enter |
| `segmented-control.tsx` | สลับโหมด Keyword / Semantic |
| `status-badge.tsx` | Status pill (ready/pending/processing/partial/failed) |
| `tag-chip.tsx` | Tag chip + auto/manual indicator |
| `premium-badge.tsx`, `premium-lock.tsx` | Premium UI gating |
| `usage-card.tsx` | สรุป quota |
| `page-header.tsx` | Title + count + actions ของหน้า |
| `shared-states.tsx` | Loading skeleton, Empty, Generic Error, Processing/Partial/Failed item, PremiumLocked, QuotaExceeded, Offline, DeleteItemConfirm, DeleteTagConfirm, UnsavedChanges, Save toast — **single source of truth** for all state UI |

`states.tsx` (เดิมเป็น legacy duplicate) ถูก merge เข้า `shared-states.tsx` และลบไฟล์แล้ว ทุก route import จาก `shared-states.tsx` เท่านั้น

---

## 4. Frontend Domain Models

อยู่ที่ `src/lib/api/types.ts` และ bookshelf constants ที่ `src/lib/bookshelves.ts`

```ts
type ItemStatus = "pending" | "processing" | "ready" | "partial" | "failed";
type PlanTier   = "free" | "premium";
type Bookshelf  = "code" | "architecture" | ... | "other";
type ClassificationSource = "auto" | "manual";

interface LibraryItem {
  id, url, domain, title, faviconLetter, status,
  bookshelf?, bookshelfSource?, tags[],
  aiAbstract?, aiDetailedAbstract?, toc?, readableContent?,
  personalNote?, inReadingList?, archived?,
  addedAt, processedAt?, failureReason?, partialReason?,
  language?, author?, publishedDate?,
}

interface MockUser     { id, email, displayName, plan, initials }
interface UsageSnapshot{ period, itemsAdded/Limit, aiAbstracts/Limit, semanticSearches/Limit }
```

State models ที่ document แล้ว: **User Plan**, **Processing Status**, **Archive**, **Reading List**, **Quota**, **Extension state**, **Search mode**.

---

## 4b. API Client Seam (เพิ่มหลัง v1 ของเอกสารนี้)

ที่ `src/lib/api/` มี typed contract สำหรับ backend และ production default เป็น `fetchAdapter`
ผ่าน switch point `adapter` ใน `src/lib/api/index.ts`:

- `client.ts` — `ApiClient` interface: `items.*`, `bookshelves.list`, `tags.*`, `search.*`, `users.*`, `auth.*`
- `fetch-adapter.ts` — production implementation ที่เรียก NestJS API (`/api/v1`) และเก็บ access token ใน memory เท่านั้น
- `types.ts` — `ApiError`, `ApiErrorCode`, response envelope types (อิง 09 API Design Spec §8/§10/§36)

**สถานะการ migrate มาใช้ client นี้ (ยังไม่ครบทุก route):**
- `routes/_app.bookshelves.tsx` — ใช้ `useBookshelvesQuery()` ผ่าน `adapter.bookshelves.list()`; production เรียก `GET /bookshelves`
- `routes/login.tsx`, `routes/register.tsx`, `routes/_app.tsx` — ใช้ real auth/session ผ่าน `adapter.auth.*`
- `routes/_app.search.tsx` — ใช้ real keyword/semantic search ผ่าน `adapter.search.*`
- `routes/_app.settings.tsx` — sync display name ผ่าน `adapter.users.updateMe()`
- `lib/store.ts` item mutations — create/update/archive/reading-list/reprocess/retry/note ผ่าน `adapter.items.*` แล้ว แต่ยังเก็บ local optimistic state ใน Zustand

**Gap สำคัญที่ยังไม่แก้ (ตั้งใจเลื่อนไว้):** Zustand ยัง persist snapshot ของ user/items สำหรับ optimistic UI และ reload behavior
จึงต้องระวัง migration/rehydration เพิ่มเติมถ้าจะทำให้ backend เป็น source of truth เต็มรูปแบบทุกหน้าจอ

## 4c. Repository Tooling (เพิ่มหลัง v1 ของเอกสารนี้)

- Package manager คือ **Bun** (`bun.lock`, `bunfig.toml`) ไม่ใช่ npm/pnpm
- `bun run typecheck` (`tsc --noEmit`), `bun run lint`, `bun run build` รันผ่านจริงแล้ว (verified ใน
  sandbox นี้) — `lint` exit code **0**, มี 11 warnings เหลืออยู่ (ล้วน `react-refresh/only-export-components`
  จาก pattern ของ shadcn/i18n ที่แก้โดยไม่ restructure ไม่ได้) และ **0 errors** — `no-control-regex`
  false positive ใน `_app.settings.tsx` ถูก suppress ด้วย `eslint-disable-next-line` แล้ว
- `.env.example` มีไว้แต่ปัจจุบัน **ไม่มี env var ใดถูกใช้จริงใน runtime เลย** (ยืนยันด้วย grep
  `import.meta.env`/`process.env`) — มีแค่ placeholder `VITE_API_BASE_URL` สำรองไว้สำหรับตอน integrate
- ยังไม่มี git repository ในโปรเจกต์นี้ (root หรือ `frontend/`) — ต้อง `git init` ก่อนเริ่ม CI/CD ใดๆ

## 5. Required Backend Integrations (สำหรับ production)

1. **Auth** — sign up / login / forgot-password / verify email / session refresh
2. **Library CRUD** — add URL, list, update tag/bookshelf/note, archive, soft-delete
3. **Ingestion pipeline** — fetch → extract → classify → status webhook (`pending → processing → ready/partial/failed`)
4. **AI services (Premium)** — abstract, auto-tag, auto-bookshelf, TOC, embeddings
5. **Search** — keyword (full-text) + semantic (vector)
6. **Duplicate detection** — canonical-URL lookup
7. **Quota & billing** — usage tracking, plan tier ✅ แก้แล้ว; upgrade/downgrade ผ่าน Stripe Checkout +
   Billing Portal จริงแล้ว (webhook sync `checkout.session.completed` / `customer.subscription.updated` /
   `customer.subscription.deleted`)
8. **Browser extension API** ✅ แก้แล้ว — `POST /auth/extension-handoff` (mint an
   extension-scoped refresh token from a logged-in web session) + `POST /auth/extension-refresh`
   (body-based refresh for the extension's background service worker) + existing
   `POST /items` / `POST /items/check-existing` reused for the capture flow. New `extension/`
   package (Chrome/Edge/Brave, Manifest V3) — see §Library Clipper below.
9. **Realtime/poll** — แจ้ง status update กลับ UI

**Manual setup required outside the codebase** (code is ready, but these features
need real credentials/publishing steps before they work end-to-end in production):
- **Resend** — create account, verify a sending domain, set `RESEND_API_KEY` / `EMAIL_FROM` in `backend/.env`
- **Stripe** — create account, create the Premium Product/Price, set `STRIPE_SECRET_KEY` /
  `STRIPE_PUBLISHABLE_KEY` / `STRIPE_PREMIUM_PRICE_ID`; create a webhook endpoint pointing at
  `{API_BASE_URL}/api/v1/billing/webhook` subscribed to `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`, set `STRIPE_WEBHOOK_SECRET`
- **Library Clipper extension** — build (`cd extension && bun install && bun run build`),
  set `VITE_EXTENSION_ID` (frontend) and `EXTENSION_ORIGIN` (backend) once the extension has a
  stable ID (dev: bake a fixed `key` into `manifest.config.ts`; prod: the Chrome Web Store
  assigns a permanent ID once published — publishing itself, icons/store-listing polish, and
  Firefox support are explicitly out of scope for this pass; see `extension/` README/plan for
  the full feature list and what's deferred, e.g. the status popup UI beyond badge/notification
  feedback)
  - **⚠️ Blocked on a production domain**: `/extension` now offers a direct zip download
    (`bun run package` → `frontend/public/librora-clipper.zip`), but `VITE_WEB_ORIGIN` /
    `VITE_API_ORIGIN` (both default to `localhost`) are baked into the manifest's
    `host_permissions` / `externally_connectable` **at build time**. The zip currently checked
    in is a localhost/dev build only — once a production domain exists, rebuild + repackage
    with the real origins (`VITE_WEB_ORIGIN=https://<prod-domain> VITE_API_ORIGIN=https://<api-domain>
    bun run build && bun run package`) before distributing the download to real users.

---

## 6. Prototype-only Behavior (ต้องแทนที่ตอน integrate)

- Production item processing no longer uses local Pending → Ready timers. `store.ts` creates/reprocesses through the real API,
  and `_app.tsx` polls pending/processing items from the backend worker pipeline every 5s. Demo-only timing remains in
  no frontend timing simulation remains in the Docker-backed production path. (G-03 fixed for production)
- Semantic search ใช้ real API แล้ว (`POST /search/semantic`) และ score มาจาก backend/Qdrant
- Auth login/register/session ใช้ real API แล้ว; forgot/reset password ✅ แก้แล้ว — ต่อ Resend email
  provider และ `PasswordResetToken` table จริงแล้ว (single-use, 30 นาที TTL, hashed at rest)
- Free/Premium gating ของ AI Abstract และ Auto Tags บังคับแล้ว (G-15, G-16 แก้แล้ว) — gate ทั้งตอน
  generate (Auto Tags) และตอน render/search-inclusion (AI Abstract) แต่ field ที่ generate ไว้ตอนเป็น
  Premium จะไม่ถูกลบออกหากภายหลัง downgrade เป็น Free (ข้อมูลเก่ายังอยู่ แค่ไม่แสดง/ไม่ค้นเจอ)
- Quota Exceeded block Add แล้ว (G-17 แก้แล้ว) — แต่ตัวเลข quota ที่แสดงใน `QuotaExceededBlock` เป็น
  placeholder คงที่ (`50/50 Items added`) เพราะยังไม่มี items-added quota model จริงในระบบ
  (items-added quota ยังไม่มีใน backend; quota ที่มีจริงคือ AI/Semantic/Reprocess)
- `/read/$itemId` guard item ที่ไม่ ready แล้ว (G-35 แก้แล้ว) — แสดง "Still processing" หรือ "Couldn't
  process this item" (พร้อม Retry) แทนหน้า reading room เปล่าๆ
- Extension "Open Item" ลิงก์ไป `/inbox` แทน `/read/$id`
- `/design-system` route — internal เท่านั้น

---

## 7. Responsive Considerations

- รองรับ 1440 / 1280 / 1024 / 768 / 430 / 375 px และ extension 360–400 px
- Sidebar → mobile Sheet < `md`
- Reading Room TOC + Note → Sheets ใน `< lg`
- Filter bar → horizontal scroll strip บน mobile (G-09: Sort/Clear ต้อง swipe)
- ใช้ `min-h-dvh` แทน `min-h-screen`
- Library card icon buttons 28×28 ยังต่ำกว่า touch target 44×44 (G-10)

---

## 8. Accessibility Status

ผ่านแล้ว: aria-label บน icon button, label+aria-invalid+aria-describedby บนฟอร์ม, `role="status" aria-live` บน offline/save indicator, `aria-current` บน active TOC, focus management ผ่าน Radix, status ไม่สื่อด้วยสีอย่างเดียว

เพิ่มในรอบนี้:
- **G-31 skip-to-content** ✅ — เพิ่ม `<a href="#main-content">Skip to content</a>` (sr-only, visible on focus) ใน `__root.tsx`; `<div>` เนื้อหาหลักใน `_app.tsx` เปลี่ยนเป็น `<main id="main-content">`
- **G-12 reduced-motion** ✅ — `@media (prefers-reduced-motion: reduce)` block ใน `styles.css` ปิด animation/transition ทั้งหมด
- **G-32 card overlay focus ring** ✅ — เพิ่ม `focus-visible:ring-offset-2` บน overlay button ใน `library-item-card.tsx` ให้ ring ลอยชัดเหนือ card border
- **G-10 touch target** ✅ — icon buttons ใน `library-item-card.tsx` จาก `h-7 w-7` (28px) เป็น `h-9 w-9` (36px) + `after:absolute after:-inset-1` tap-area expansion; พื้นที่กด ~40px ผ่าน WCAG 2.5.5 Level AA (44px) สำหรับ Pointer Input

---

## 9. Remaining Product Decisions

- เลือกใช้คำว่า "Topics" หรือ "Tags" ให้สม่ำเสมอ (G-13) — ปัจจุบัน "Topics" ใช้ใน nav/route สม่ำเสมอ, "Auto Tags" ใช้สำหรับ AI feature แยกต่างหาก ถือว่า intentional ไม่ใช่ inconsistency
- Downgrade / cancellation flow บน `/plan` (G-21) ✅ แก้แล้ว — เพิ่ม confirm dialog ก่อน switch to Free
- Bulk actions ใน Reading List / Archive (G-29) ✅ แก้แล้ว — checkbox select mode + sticky action bar
- Destructive account actions ใน Settings (G-20) ✅ แก้แล้ว — Danger Zone section พร้อม "Reset library" (confirm dialog) + "Delete account" (ต่อ backend จริงแล้ว — soft-delete พร้อม re-auth confirm + 30-day grace period ก่อน purge job ลบถาวร)
- Web app session-expired dialog (G-22) ✅ แก้แล้ว — `_app.tsx` shows a session-expired dialog when refresh/session restore fails or item polling receives 401, then sends the user to login.

---

## 10. Known Gaps Priority

อ้างอิง PROMPT-LV-023 — รายการ **High priority** เดิม และสถานะปัจจุบัน:

| Gap | สถานะ | หมายเหตุ |
|---|---|---|
| G-01 Forgot/reset password | ✅ แก้แล้ว | ต่อ Resend email provider + `PasswordResetToken` table จริงแล้ว (single-use, 30 นาที TTL) |
| G-03 Pending→Ready simulation | ✅ แก้แล้ว | production flow uses real API create/reprocess + worker-status polling in `_app.tsx` |
| G-15 AI Abstract gating | ✅ แก้แล้ว | gate ทั้ง generate-time และ render-time แล้ว |
| G-16 Auto Tags gating | ✅ แก้แล้ว | `pickTags` gate ด้วย `plan === "premium"` แล้ว |
| G-17 Quota Exceeded enforcement | ✅ แก้แล้ว | block แล้ว + ใช้ `QuotaExceededBlock` UI จริง (ตัวเลขยัง placeholder) |
| G-22 Session-expired dialog | ✅ แก้แล้ว | shows a blocking dialog on expired/missing session before redirecting to login |
| G-35 Reading Room guard | ✅ แก้แล้ว | `/read/$itemId` guard สถานะ pending/processing/failed แล้ว |
| G-20 Account deletion | ✅ แก้แล้ว | `DELETE /users/me` (re-auth ด้วยรหัสผ่าน) → soft-delete ทันที + revoke sessions ทั้งหมด, purge job ลบถาวรหลัง grace period (default 30 วัน, `ACCOUNT_DELETION_GRACE_DAYS`) |
| Billing/checkout | ✅ แก้แล้ว | Stripe Checkout (`POST /billing/checkout-session`) + Billing Portal (`POST /billing/portal-session`) + webhook sync (`POST /billing/webhook`) |
| SSR crash on `import.meta.env` dynamic access | ✅ แก้แล้ว | `fetch-adapter.ts` / `extension-bridge.ts` used `(import.meta as any)?.env?.X`, which Vite's SSR module runner can't statically analyze — it threw and silently downgraded every page to client-only render. Fixed to a static `import.meta.env.X` access in both files. |
| Extension zip baked with localhost origins | ⚠️ **blocked** | `/extension`'s downloadable zip (`frontend/public/librora-clipper.zip`) is a dev build only — `VITE_WEB_ORIGIN`/`VITE_API_ORIGIN` are baked into the manifest at build time and both default to `localhost`. Needs a rebuild + repackage with the real production domain once one exists; see §9 manual setup note above. |

ดูตารางเต็มได้จากผล PROMPT-LV-023 ในแชต (สำหรับ gap ลำดับรองอื่นๆ ที่ยังไม่อยู่ในตารางนี้)

**Gap รองที่แก้แล้วในรอบนี้ (ไม่อยู่ในรายการ High priority เดิม):**
G-09 Filter bar Sort/Clear swipe ✅ · G-10 Touch target ✅ (บางส่วน) · G-12 Reduced-motion ✅ ·
G-20 Destructive account actions ✅ · G-21 Downgrade flow ✅ · G-29 Bulk actions ✅ ·
G-31 Skip-to-content ✅ · G-32 Card overlay focus ring ✅

**ยังเหลือ (deferred หรือต้องการ backend):**
No high-priority gaps remain in this handoff list.

---

## 11. Project Structure

```text
src/
  routes/                 # File-based routes (อย่าแก้ routeTree.gen.ts)
  components/
    librora/              # Shared app components
    ui/                   # shadcn primitives
  lib/
    store.ts              # Zustand store (user, items, ui state)
    api/                  # ApiClient interface + fetchAdapter (ดู §4b)
    query/                # TanStack Query hooks + key factory
    utils.ts
  hooks/
  styles.css              # Tailwind v4 + design tokens
  router.tsx              # Router config
  __root.tsx              # HTML shell
```
