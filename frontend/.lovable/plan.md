# Librora — Personal AI Library: Interactive Prototype Plan

Build a high-fidelity, fully clickable prototype following the Master Prompt exactly. No backend — all data is mocked in-memory (with localStorage persistence for user edits so the prototype feels real across reloads).

---

## 1. Visual Direction & Design System

A calm personal library — neutral, quiet, focused. Not a dashboard, not a chatbot.

**Palette (oklch tokens in `src/styles.css`)**

- Background: warm off-white (`oklch(0.985 0.005 95)`) / deep ink in dark
- Surface: pure white with subtle elevation
- Primary accent: deep indigo (`oklch(0.42 0.14 270)`) — used sparingly for CTAs, active nav, focus rings
- Secondary accent: muted teal for AI-generated content separation
- Borders: hairline (`oklch(0.92 0.005 95)`)
- Status colors: amber (Processing), green (Ready), orange (Partial), red (Failed), neutral (Pending)
- Premium badge: warm gold

**Typography**

- Display/Headings: **Fraunces** (literary serif, evokes "library" without being decorative)
- Body/UI: **Inter Tight** (clean, refined)
- Reading Room body: **Source Serif 4** (long-form reading)
- Loaded via `<link>` in `__root.tsx` head (per Tailwind v4 rules), registered as `--font-display`, `--font-sans`, `--font-reading` in `@theme`

**Spacing & motion**

- Generous whitespace, soft shadows (no neon, no heavy gradients)
- Thin 1px borders
- Subtle 150ms transitions; one calm hero animation on landing only

---

## 2. Routes (TanStack Start file-based)

```
src/routes/
  __root.tsx                 → shell, head, fonts, Toaster, QueryClient
  index.tsx                  → Landing page (marketing) — public
  login.tsx                  → Login (mock)
  register.tsx               → Register (mock)
  _app.tsx                   → Authenticated layout (Sidebar + TopHeader + <Outlet />)
  _app.library.tsx           → My Library (default after login)
  _app.inbox.tsx             → Library Inbox (recently added / processing)
  _app.bookshelves.tsx       → Smart Bookshelves grid
  _app.bookshelves.$slug.tsx → Single bookshelf detail
  _app.topics.tsx            → Topics / Tags
  _app.topics.$slug.tsx      → Items for one tag
  _app.reading-list.tsx      → Reading List
  _app.archive.tsx           → Archive (with restore/delete)
  _app.plan.tsx              → Plan & Usage
  _app.settings.tsx          → Settings (profile, account, extension help)
  _app.search.tsx            → Search results (keyword + semantic toggle)
  _app.read.$itemId.tsx      → Reading Room
  extension.tsx              → Standalone Chrome Extension Popup preview (fixed 380×560)
```

`_app.tsx` mock-gates on a stored "session" flag; unauthenticated → redirect to `/login`.

---

## 3. Application Shell

- **Sidebar** (`collapsible="icon"` shadcn sidebar): My Library, Library Inbox, Smart Bookshelves, Topics, Reading List, Archive, Plan & Usage, Settings. Active route highlighted. Footer: current plan badge + usage mini-bar.
- **TopHeader**: SidebarTrigger, **Global Search** (⌘K-style input that routes to `/search`), **Add to Library** primary button (opens dialog), User Menu (avatar dropdown: Settings, Logout).
- Responsive: sidebar collapses to icon strip on tablet, becomes offcanvas sheet on mobile; header search collapses to icon.

---

## 4. Core Reusable Components (`src/components/librora/`)

ApplicationShell, AppSidebar, TopHeader, GlobalSearch, LibraryItemCard, StatusBadge (Pending/Processing/Ready/Partial/Failed — no fake %), TagChip, BookshelfCard, FilterBar (with Clear All), EmptyState, ErrorState, LoadingSkeleton, PremiumLockState, UsageCard, AddToLibraryDialog, ConfirmationDialog, PersonalNoteEditor (saving/saved states), TableOfContents, SearchResultCard, AiAbstractPanel (visually distinct teal-bordered card with "AI Generated" label, separated from extracted content), ProcessingIndicator, QuotaExceededBanner, OfflineBanner.

All components accept predictable props; presentation is pure — no data fetching inside.

---

## 5. Mock Data Layer (`src/mocks/`)

- `items.ts` — ~25 realistic library items spanning bookshelves (Architecture, Software Development, Business, Management, Design, Research, Philosophy, AI, Productivity, Learning), various states (1 Pending, 2 Processing, 18 Ready, 2 Partial, 2 Failed)
- `bookshelves.ts`, `tags.ts`, `user.ts` (Free vs Premium toggleable in Settings for demo), `usage.ts`
- `store.ts` — small Zustand store with localStorage persistence for: items, archive, reading list, notes, plan tier, session
- All async ops simulated with `await sleep(300)` so loading skeletons are real

---

## 6. Key Screen Behaviors

- **My Library**: grid/list toggle, filter bar (status, bookshelf, tag, date), sort, clicking card body → Reading Room, secondary actions (open source, reading list, archive, delete) via card menu
- **Library Inbox**: groups "Processing", "Needs Attention" (Partial/Failed with Retry), "Recently Added"
- **Add to Library Dialog**: URL required, optional Custom Title / Note / Manual Tags; on submit creates Pending item, simulates Pending → Processing → Ready over ~6 seconds with toast progression
- **Reading Room**: left column TOC (sticky), center column extracted content (Source Serif), right column AI Abstract panel + Tags + Bookshelf + Personal Note editor. Free users see AI panel locked with PremiumLockState. Open Original Source is a separate button.
- **Search**: tabs for Keyword / Semantic; Semantic on Free shows PremiumLockState with CTA "Continue with keyword search". Submit on Enter. Empty/no-result states.
- **Archive**: list with Restore + Delete (confirm dialog). Archive action elsewhere triggers Undo toast (5s).
- **Plan & Usage**: comparison table Free vs Premium, current usage cards, "Switch to Premium (demo)" toggle that flips the mock user for testing locked states.
- **Settings**: profile (editable display name with saving/saved), Library Clipper install instructions, plan link.
- **Extension Popup** (`/extension`): fixed 380×560 frame, states: Loading, Ready to Save, Saving, Saved, Already in Library, Unsupported Page, Token Expired, Error. Buttons: Add to Library, Open Librora.

---

## 7. Shared States Coverage

Each list/detail screen renders Loading skeleton, Empty (with primary CTA), Error (with retry), and where relevant: Processing, Partial, Failed, Premium Locked, Quota Exceeded, Offline (simulated via toggle in Settings → Debug for the prototype).

---

## 8. Out of Scope (will NOT build)

AI Chat, Team, Org, Public Sharing, Comments, Collab editing, Knowledge Graph, Social Feed, Native mobile, Nested folders, Rich text editor, Import wizard, Payment checkout, Admin portal, Calendar, Tasks, Notification center, Recommendations.

---

## 9. Build Order (single delivery, prioritized)

1. Design tokens in `src/styles.css` + fonts in `__root.tsx`
2. Mock data + Zustand store
3. Landing + Login/Register (mock auth)
4. App shell (sidebar, header, global search, add dialog)
5. My Library + LibraryItemCard + all shared state components
6. Library Inbox + status simulation
7. Smart Bookshelves + Topics
8. Reading Room + TOC + AI Abstract + Personal Note
9. Search (keyword + semantic with premium lock)
10. Reading List + Archive (with Undo)
11. Plan & Usage + Settings (plan tier toggle)
12. Extension Popup preview route
13. Pass: empty/error/loading states across all routes, responsive review on desktop/tablet/mobile

---

## 10. Open questions before I start (please confirm or override)

1. **Fonts**: Fraunces + Inter Tight + Source Serif 4 — OK, or do you want a different pairing?
2. **Plan tier demo toggle**: include a visible "Switch to Premium (demo)" in Settings so reviewers can experience both Free and Premium views? (Recommended.)
3. **Persistence**: persist user edits (notes, tags, archive, plan toggle) in localStorage so the prototype survives reload? (Recommended.)
4. **Default landing after login**: `My Library` (default) — confirm.

I'll proceed with the recommended defaults on all four unless you say otherwise.
