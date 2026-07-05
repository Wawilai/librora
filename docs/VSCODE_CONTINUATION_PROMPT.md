# Librora — VSCode Continuation Prompt

ใช้ prompt นี้กับ AI Coding Agent (Cursor / Copilot / Claude Code / Cline) ใน VSCode
เพื่อพัฒนาต่อจาก prototype Lovable ที่ส่งมอบใน `docs/HANDOFF.md`

---

## System Prompt (วางในช่อง "Rules" หรือ "System")

```
You are continuing development on Librora, a "personal AI library" web app
that lets users save URLs, auto-classify them into bookshelves and tags,
read them in a distraction-free Reading Room, and (for Premium) get AI
abstracts and semantic search.

Source of truth:
- docs/HANDOFF.md — routes, components, mock data, gaps, decisions
- src/mocks/types.ts — canonical TypeScript interfaces
- src/styles.css — design tokens (do not hardcode colors)

Stack: TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 + shadcn/ui +
Zustand (mock) + sonner. Routing is file-based under src/routes/; never
edit src/routeTree.gen.ts.

Rules:
1. Preserve the approved MVP scope. Prohibited: AI Chat, Team Workspace,
   Public Sharing, Comments, Knowledge Graph, Recommendation Feed,
   Native Mobile, Nested Folders, Rich Text Editor, Import Wizard,
   real payment checkout, Notification Center, Calendar, Task Mgmt,
   Social, Public Profile.
2. Use semantic design tokens from styles.css. No hex literals,
   no `text-white`/`bg-black` in components.
3. Reuse shared components from src/components/librora/shared-states.tsx
   (Loading / Empty / Error / Premium / Quota / Offline / Delete /
   UnsavedChanges). Don't duplicate them.
4. Use Thai copy that already exists in the prototype as the canonical
   wording. Don't translate or rephrase without reason.
5. All icon-only buttons need aria-label. Forms need <Label> +
   aria-invalid + aria-describedby for errors.
6. Responsive baseline: 1440 / 1280 / 1024 / 768 / 430 / 375 px and
   extension popup 360–400 px. Use min-h-dvh, not min-h-screen.
7. Free vs Premium gating must be enforced before rendering AI Abstract,
   Auto Tags, Semantic Search, and quota-limited Add actions.
8. Replace prototype timers/randomness with real API calls — but only
   when wiring the corresponding backend. Until then, keep mocks behind
   a single seam (src/lib/store.ts or a dedicated service module).

When given a task:
- Read docs/HANDOFF.md first.
- Plan briefly (3–6 bullets) before editing.
- Edit minimal files; prefer search/replace over rewrites.
- After changes: run `bun run build` (or `pnpm build`) and fix type errors.
- Verify the relevant route(s) render and the interaction works.
```

---

## Backlog Prompts (ทำตามลำดับนี้ก่อน)

### TASK-01 — Pending → Ready simulation (G-03)
```
In src/lib/store.ts, when addItem(url) is called, schedule a mock status
transition: pending (immediately) → processing (after ~1.5s) →
ready (after ~3s). Use setTimeout, mark items with a synthetic processedAt
when ready, and populate aiAbstract/tags ONLY when user.plan === 'premium'.
Make this controllable via a `simulateProcessing` boolean so tests can
disable it. Do not touch UI files.
```

### TASK-02 — Free/Premium gating (G-15, G-16)
```
Add a helper `usePlanFeatures()` in src/lib/use-plan-features.ts that
returns { canSeeAbstract, canSeeAutoTags, canUseSemanticSearch,
canAddMore }. Wire it into:
- components/librora/library-item-card.tsx (hide abstract + auto tags
  on free; show inline upgrade hint via PremiumLocked when user opens
  detail)
- routes/_app.read.$itemId.tsx (gate aiDetailedAbstract block)
- routes/_app.search.tsx (already gates semantic; verify it uses the hook)
Keep manual tags visible on Free.
```

### TASK-03 — Quota enforcement on Add (G-17)
```
In components/librora/add-to-library-dialog.tsx, before submission read
usage from the store. If itemsAdded >= itemsLimit, render
<QuotaExceededState /> inside the dialog with the existing copy and
disable the confirm button. Provide an "ดูแพ็กเกจ" link to /plan.
```

### TASK-04 — Reading Room guard (G-35)
```
In routes/_app.read.$itemId.tsx, in the loader (or component top-level),
if the item is not found → throw notFound(); if status is not 'ready' or
'partial' → redirect to /inbox. Render PartialItem state when 'partial'.
```

### TASK-05 — Auth recovery screens (G-01, G-02)
```
Add routes/forgot-password.tsx and routes/reset-password.tsx. Reuse the
auth visual treatment from routes/login.tsx. Mock submit shows a
"ตรวจสอบอีเมลของคุณ" success state. Add a "ลืมรหัสผ่าน?" link on
routes/login.tsx. Add an unverified-email landing after register.
```

### TASK-06 — Consolidate duplicate states module (G-24)
```
Audit imports of src/components/librora/states.tsx. Move any unique
exports into shared-states.tsx (no duplication of identical components),
update imports, then delete states.tsx.
```

### TASK-07 — Terminology cleanup (G-13)
```
Pick one user-facing label between "Topics" and "Tags" (default: "Tags").
Update sidebar label, page headers, and any copy that mixes both. Keep
the URL path /topics if changing it would break references; document the
decision in docs/HANDOFF.md.
```

### TASK-08 — Accessibility polish (G-10, G-31, G-12, G-32)
```
- Add a skip-to-content link as the first focusable element in
  routes/_app.tsx that jumps to <main id="main">.
- Enlarge tap area on library-item-card.tsx secondary buttons to 36×36
  below sm: without changing visual size on lg+.
- Gate animate-spin and non-essential transitions behind motion-safe:.
- Ensure card focus-visible ring is not clipped by overflow-hidden.
```

### TASK-09 — Replace random semantic scores (G-05)
```
Replace Math.random() in routes/_app.search.tsx with a deterministic
hash-based score (e.g. xmur3(query + item.id) % 30 + 70) so results
are stable across re-renders. Sort descending.
```

### TASK-10 — Backend integration seam
```
Create src/services/ with one module per domain (auth.ts, items.ts,
search.ts, usage.ts). Each exports async functions that today proxy to
the Zustand store. UI must import from src/services/*, not directly
from src/lib/store.ts. This is the seam where real fetch() calls will
replace mocks later.
```

---

## When wiring a real backend

อ่าน `docs/HANDOFF.md` §5 "Required Backend Integrations" แล้วทำทีละ domain:
implement service module → swap mock → keep types ใน `src/mocks/types.ts`
เป็น single source of truth (อาจ rename เป็น `src/types/`)

---

## Verification checklist (ก่อน merge ทุก PR)

- [ ] `bun run build` ผ่าน (ไม่มี TS error)
- [ ] ไม่มี hex literal ใน component ใหม่ (ใช้ token เท่านั้น)
- [ ] ไม่มี hardcoded `text-white` / `bg-black`
- [ ] icon-only button มี `aria-label`
- [ ] ไม่ใช้ `min-h-screen` (ใช้ `min-h-dvh`)
- [ ] ทดสอบ 375px และ desktop
- [ ] ไม่มี feature นอก MVP scope
- [ ] ไม่ได้แก้ `src/routeTree.gen.ts`
