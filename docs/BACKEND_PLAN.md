# Librora — Backend Architecture Plan

สถานะ: Draft · วันที่: 2026-07-01
อ้างอิง: `docs/04 System Design Specification.docx`, `docs/09 API Design Specification.docx`

---

## 1. สถานะปัจจุบัน

Frontend prototype (TanStack Start) อยู่ที่ `project/frontend/` — ทำงานได้สมบูรณ์เป็น
frontend-only mock พร้อม `ApiClient` interface ที่ backend จะต้อง implement ให้ตรง
(ดู `frontend/src/lib/api/client.ts`)

**Backend: ยังไม่มีอะไรเลย** — เอกสารนี้เป็นแผนสร้างจากศูนย์

---

## 2. Tech Stack

| Layer | Technology | หมายเหตุ |
|---|---|---|
| **API** | NestJS v10+ · TypeScript strict | |
| **ORM** | Prisma v5 | |
| **Database** | **Supabase PostgreSQL** | Managed PostgreSQL — ไม่ run local, ใช้ `DATABASE_URL` จาก Supabase dashboard |
| **Queue** | BullMQ + **Upstash Redis** | Upstash = serverless Redis, ไม่ต้อง self-host; local dev ใช้ Docker Redis |
| **Vector DB** | Qdrant Cloud (prod) / Docker (dev) | |
| **Auth** | JWT (Access 15m in-memory · Refresh 30d HttpOnly cookie) | **ไม่ใช้ Supabase Auth** — สร้างเองตาม spec |
| **Password** | Argon2id | |
| **Monorepo** | pnpm workspace | |
| **Dev Infra** | Docker Compose (Redis + Qdrant only) | Postgres อยู่บน Supabase แม้ตอน dev |
| **AI** | OpenAI API (Abstract, Tagging, TOC, Embedding) | |
| **Content Extraction** | Mozilla Readability + Cheerio | |

### เหตุผลที่ไม่ใช้ Supabase Auth
System Design Spec กำหนด Refresh Token rotation + Extension token handoff + Argon2id hashing เอง
Supabase Auth ใช้ session model แตกต่างกัน (cookie-based, magic link) — integrate เข้ากันยาก
→ ใช้ Supabase เป็น **PostgreSQL provider เท่านั้น**, NestJS จัดการ auth ทั้งหมดเอง

---

## 3. Directory Structure (ปัจจุบัน — สร้างแล้ว)

```
project/                           ← workspace root
├── backend/                       ← pnpm workspace (backend ทั้งหมด)
│   ├── apps/
│   │   ├── api/                   ← NestJS Backend API  ✅ สร้างแล้ว
│   │   └── worker/                ← Background Worker   (Phase 2)
│   ├── packages/
│   │   ├── shared-types/          ← TypeScript types ร่วม (Phase 1 ต่อ)
│   │   └── shared-validation/     ← Zod schemas ร่วม   (Phase 1 ต่อ)
│   ├── prisma/
│   │   ├── schema.prisma          ✅ สร้างแล้ว
│   │   ├── migrations/            ← สร้างตอน pnpm db:migrate
│   │   └── seed.ts                ✅ สร้างแล้ว
│   ├── docker-compose.yml         ✅ Redis + Qdrant
│   ├── pnpm-workspace.yaml        ✅
│   ├── package.json               ✅
│   └── .env.example               ✅ Supabase URL format
├── frontend/                      ← Bun workspace (ไม่แตะ)
└── docs/
    ├── BACKEND_PLAN.md            ✅ เอกสารนี้
    └── HANDOFF.md
```

Frontend อยู่ที่ `project/frontend/` แยก workspace ออกจาก backend ชัดเจน
ไม่มีแผนย้าย frontend เข้า monorepo ในระยะนี้

---

## 4. Prisma Schema (ตาม Data Model ใน System Design §14–20)

### Core Tables

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Users & Auth ─────────────────────────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailNorm     String   @unique @map("email_norm")
  passwordHash  String   @map("password_hash")
  displayName   String   @map("display_name")
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  refreshTokens RefreshToken[]
  subscription  Subscription?
  items         LibraryItem[]
  usagePeriods  UsagePeriod[]

  @@map("users")
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  client    String   @default("web") // "web" | "extension"
  expiresAt DateTime @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

// ── Subscriptions & Usage ────────────────────────────────────────────────────

model Subscription {
  id        String           @id @default(cuid())
  userId    String           @unique @map("user_id")
  plan      PlanCode
  status    SubscriptionStatus @default(ACTIVE)
  startedAt DateTime         @default(now()) @map("started_at")
  expiresAt DateTime?        @map("expires_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

enum PlanCode     { FREE PREMIUM }
enum SubscriptionStatus { ACTIVE CANCELLED EXPIRED }

model UsagePeriod {
  id                String @id @default(cuid())
  userId            String @map("user_id")
  period            String // "YYYY-MM"
  itemsAdded        Int    @default(0) @map("items_added")
  aiAbstractsUsed   Int    @default(0) @map("ai_abstracts_used")
  semanticSearches  Int    @default(0) @map("semantic_searches")
  reprocessCount    Int    @default(0) @map("reprocess_count")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, period])
  @@map("usage_periods")
}

// ── Library Items ────────────────────────────────────────────────────────────

model LibraryItem {
  id             String      @id @default(cuid())
  userId         String      @map("user_id")
  url            String
  urlNorm        String      @map("url_norm")
  domain         String
  faviconLetter  String      @map("favicon_letter")
  title          String      // user-visible (extracted or custom)
  customTitle    String?     @map("custom_title")
  extractedTitle String?     @map("extracted_title")
  description    String?
  personalNote   String?     @map("personal_note")
  status         ItemStatus  @default(PENDING)
  bookshelf      String?
  bookshelfSource ClassificationSource? @map("bookshelf_source")
  aiAbstract     String?     @map("ai_abstract")
  readableContent String?    @map("readable_content")
  language       String?
  author         String?
  publishedDate  String?     @map("published_date")
  inReadingList  Boolean     @default(false) @map("in_reading_list")
  archived       Boolean     @default(false)
  failureReason  String?     @map("failure_reason")
  partialReason  String?     @map("partial_reason")
  processedAt    DateTime?   @map("processed_at")
  addedAt        DateTime    @default(now()) @map("added_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")
  deletedAt      DateTime?   @map("deleted_at") // soft delete

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags        ItemTag[]
  tocEntries  TocEntry[]
  processingJob ProcessingJob?

  @@unique([userId, urlNorm])
  @@index([userId, archived, deletedAt])
  @@index([userId, status])
  @@map("library_items")
}

enum ItemStatus          { PENDING PROCESSING READY PARTIAL FAILED }
enum ClassificationSource { AUTO MANUAL }

model ItemTag {
  itemId String @map("item_id")
  tag    String
  source ClassificationSource @default(MANUAL)

  item LibraryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@id([itemId, tag])
  @@map("item_tags")
}

model TocEntry {
  id     String @id @default(cuid())
  itemId String @map("item_id")
  level  Int
  text   String
  anchor String
  source ClassificationSource @default(AUTO)
  order  Int

  item LibraryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@map("toc_entries")
}

// ── Processing Jobs ──────────────────────────────────────────────────────────

model ProcessingJob {
  id              String          @id @default(cuid())
  itemId          String          @unique @map("item_id")
  dispatchStatus  DispatchStatus  @default(PENDING_DISPATCH) @map("dispatch_status")
  executionStatus ExecutionStatus @default(QUEUED) @map("execution_status")
  attempt         Int             @default(0)
  maxAttempts     Int             @default(3) @map("max_attempts")
  lastError       String?         @map("last_error")
  scheduledAt     DateTime        @default(now()) @map("scheduled_at")
  startedAt       DateTime?       @map("started_at")
  completedAt     DateTime?       @map("completed_at")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  item LibraryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@map("processing_jobs")
}

enum DispatchStatus  { PENDING_DISPATCH QUEUED DISPATCH_FAILED }
enum ExecutionStatus { QUEUED PROCESSING COMPLETED FAILED CANCELLED SKIPPED }
```

---

## 5. NestJS Module Structure (`apps/api/src/`)

```
src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts      POST /auth/register, /login, /refresh, /logout, GET /session
│   ├── auth.service.ts
│   ├── strategies/             jwt.strategy.ts, refresh.strategy.ts
│   ├── guards/                 jwt-auth.guard.ts, refresh.guard.ts
│   └── dto/                    register.dto.ts, login.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── dto/                    update-display-name.dto.ts
├── subscriptions/
│   ├── subscriptions.module.ts
│   └── subscriptions.service.ts
├── feature-gate/
│   ├── feature-gate.module.ts
│   └── feature-gate.service.ts  ← ตรวจ plan + quota ก่อน execute feature
├── library-items/
│   ├── library-items.module.ts
│   ├── library-items.controller.ts  GET /items, POST /items, GET /items/:id, PATCH, DELETE
│   ├── library-items.service.ts
│   └── dto/
├── processing-jobs/
│   ├── processing-jobs.module.ts
│   └── processing-jobs.service.ts
├── tags/
│   ├── tags.module.ts
│   ├── tags.controller.ts       GET /tags, PATCH /tags/:tag, DELETE /tags/:tag
│   └── tags.service.ts
├── bookshelves/
│   ├── bookshelves.module.ts
│   ├── bookshelves.controller.ts  GET /bookshelves
│   └── bookshelves.service.ts
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts     GET /search/keyword, GET /search/semantic
│   └── search.service.ts
├── vector/
│   ├── vector.module.ts
│   └── vector.service.ts        ← Qdrant client wrapper
├── queue/
│   ├── queue.module.ts
│   └── queue.service.ts         ← BullMQ producer
├── common/
│   ├── decorators/              CurrentUser(), Public()
│   ├── filters/                 all-exceptions.filter.ts
│   ├── interceptors/            response-envelope.interceptor.ts
│   └── pipes/                   zod-validation.pipe.ts
└── config/
    └── configuration.ts
```

---

## 6. API Endpoints (ตาม `frontend/src/lib/api/client.ts`)

Frontend `ApiClient` interface กำหนด contract ที่ backend **ต้อง implement ให้ตรง**:

```
Auth
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout
  GET    /api/v1/auth/session

Items
  GET    /api/v1/items              list (filter, sort, pagination)
  POST   /api/v1/items              create (URL + optional title/note/tags)
  GET    /api/v1/items/:id
  PATCH  /api/v1/items/:id          update (customTitle, bookshelf, etc.)
  DELETE /api/v1/items/:id          soft delete
  PATCH  /api/v1/items/:id/note
  PATCH  /api/v1/items/:id/reading-list
  PATCH  /api/v1/items/:id/archive
  PATCH  /api/v1/items/:id/restore
  POST   /api/v1/items/:id/reprocess

Bookshelves
  GET    /api/v1/bookshelves

Tags
  PATCH  /api/v1/tags/:tag          rename
  DELETE /api/v1/tags/:tag          remove from all items

Search
  GET    /api/v1/search?q=&mode=keyword|semantic
```

Response format: `{ data: T, meta: { requestId, ... } }` (ตาม `ApiSuccessEnvelope<T>` ใน `frontend/src/lib/api/types.ts`)

---

## 7. Background Worker (`apps/worker/`)

```
src/
├── main.ts
├── worker.module.ts
├── processors/
│   ├── item-processing.processor.ts   ← @Processor('item-processing')
│   └── steps/
│       ├── 1-fetch-url.step.ts
│       ├── 2-extract-metadata.step.ts
│       ├── 3-extract-content.step.ts   ← Mozilla Readability
│       ├── 4-ai-abstract.step.ts       ← OpenAI (Premium only)
│       ├── 5-ai-tagging.step.ts        ← OpenAI (Premium only)
│       ├── 6-ai-toc.step.ts            ← OpenAI (Premium only)
│       ├── 7-embed-and-upsert.step.ts  ← Embedding → Qdrant (Premium only)
│       └── 8-update-status.step.ts
├── ssrf/
│   └── ssrf-guard.service.ts           ← Block private IPs, internal hosts
└── config/
```

Pipeline ทำงานแบบ step-by-step: ทุก step อัปเดต status กลับ DB ถ้า step ใด fail
→ retry ตาม `maxAttempts` → เปลี่ยน status เป็น `FAILED` พร้อม `failureReason`

---

## 8. Phase Roadmap

### Phase 1 — Foundation (เริ่มก่อน)
เป้าหมาย: `bun run dev` ใน frontend → call real backend API ได้สำหรับ auth + items

- [ ] สร้าง monorepo root (pnpm workspace, tsconfig base, eslint config)
- [ ] `docker-compose.yml` (postgres, redis, qdrant)
- [ ] `packages/shared-types/` — copy + adapt types จาก `frontend/src/mocks/types.ts`
- [ ] Prisma schema + initial migration + seed
- [ ] NestJS API scaffold (main.ts, app.module, config, common pipes/filters/interceptors)
- [ ] Auth module: register, login, refresh, logout, session
- [ ] Library Items: list, create, get, update, delete (soft), archive, restore, note, reading-list
- [ ] Tags: rename, delete
- [ ] Bookshelves: list (static + DB-backed user bookshelves)
- [ ] Replace `mockAdapter` ใน `frontend/src/lib/api/index.ts` ด้วย real fetch client
  (สร้าง `fetchAdapter.ts` ที่ implement `ApiClient` interface เดิมทุกอย่างเหมือนเดิม)

### Phase 2 — Processing Pipeline
เป้าหมาย: เพิ่ม URL → background worker ประมวลผลจริง → status update กลับ UI

- [ ] `apps/worker/` scaffold
- [ ] BullMQ integration (API produce → worker consume)
- [ ] URL fetch + SSRF guard
- [ ] Mozilla Readability content extraction
- [ ] Cheerio metadata extraction (title, description, author, publishedDate, language)
- [ ] AI Abstract (OpenAI — Premium gate)
- [ ] AI Auto Tags (OpenAI — Premium gate)
- [ ] Smart TOC (OpenAI — Premium gate)
- [ ] Qdrant embedding upsert (Premium gate)
- [ ] Pending Job Dispatcher (polling cron for jobs that missed the queue)
- [ ] WebSocket หรือ SSE สำหรับ real-time status update กลับ frontend

### Phase 3 — Search & Quota
- [ ] Keyword search (PostgreSQL full-text `tsvector`)
- [ ] Semantic search (Qdrant query → rehydrate from PostgreSQL)
- [ ] FeatureGateService + quota enforcement จริง
- [ ] Plan & Usage API endpoints
- [x] Extension token handoff flow — `POST /auth/extension-handoff` + `POST /auth/extension-refresh`, `extension/` package (MV3, Chrome/Edge/Brave)

---

## 9. Frontend Integration Path

ตอน Phase 1 เสร็จ จะ replace mockAdapter โดย:

1. เพิ่ม `VITE_API_BASE_URL` ใน `.env.example` (มีอยู่แล้ว, uncomment)
2. สร้าง `frontend/src/lib/api/fetch-adapter.ts` implement `ApiClient` interface
   ด้วย real `fetch()` + error mapping เป็น `ApiError`
3. ใน `frontend/src/lib/api/index.ts` เปลี่ยนจาก `export { mockAdapter }` เป็น
   `export { fetchAdapter as mockAdapter }` (ชื่อเดิม ไม่ต้องแก้ call sites)
4. ทดสอบทีละ route ที่ migrate แล้ว: `_app.bookshelves.tsx` → `login.tsx` → `register.tsx`
   → routes อื่นๆ ตามลำดับ

`store.ts` (Zustand) จะค่อยๆ ลด scope ลงเหลือแค่ UI state (offline, quotaExceeded)
ส่วน items/user จะ migrate ไปอยู่ใน TanStack Query ผ่าน `ApiClient`

---

## 10. สิ่งที่ต้องตัดสินใจก่อนเริ่ม Phase 1

| เรื่อง | ตัวเลือก | แนะนำ |
|---|---|---|
| NestJS version | v10 vs v11 | v10 (stable, ecosystem ครบ) |
| AI Provider | OpenAI vs Anthropic | OpenAI (embedding + chat ใน provider เดียว) |
| Embedding model | text-embedding-3-small vs large | small (1536 dim, cost-effective) |
| Qdrant hosting | local Docker vs Qdrant Cloud | local Docker สำหรับ dev, Cloud สำหรับ prod |
| Monorepo build tool | Turborepo vs nx vs bare pnpm | Turborepo (เบา, NestJS-friendly) |
| JWT library | `@nestjs/jwt` + `passport-jwt` | ใช้ pattern มาตรฐาน NestJS |
| Content extraction | `@mozilla/readability` + `jsdom` | ✓ ตามที่ระบุ |
| SSRF protection | `dns.resolve` + IP range check | สร้าง `SsrfGuardService` เอง |
| Rate limiting | `@nestjs/throttler` | ใช้ built-in |
| Logging | Pino via `nestjs-pino` | ✓ structured JSON logs |

---

## 11. ขั้นตอนเริ่มต้นทันที (Day 1 checklist)

```bash
# 0. เตรียม Supabase project ก่อน (ทำใน browser)
#    - สร้าง project ใหม่ที่ supabase.com
#    - ดึง DATABASE_URL จาก Project Settings → Database → Connection string (URI mode)
#    - เปิด RLS = false ระหว่าง development (ค่อยเปิดตอน production)

# 1. สร้าง monorepo root
mkdir -p librora/{apps/api,apps/worker,packages/shared-types,packages/shared-validation,prisma,docker}
cd librora

# 2. pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF
pnpm init

# 3. NestJS API scaffold
cd apps/api
npx @nestjs/cli new . --package-manager pnpm --skip-git
cd ../..

# 4. Docker Compose (Redis + Qdrant only — Postgres อยู่บน Supabase)
# (ดู §12 ด้านล่าง)
docker compose up -d

# 5. Prisma — ชี้ไปที่ Supabase
cd ..
pnpm add -w -D prisma
pnpm add -w @prisma/client
npx prisma init --datasource-provider postgresql
# แก้ DATABASE_URL ใน .env ให้ชี้ไปที่ Supabase URL
# copy schema จาก §4 → prisma/schema.prisma
npx prisma migrate dev --name init
npx prisma generate
```

---

## 12. Docker Compose (Development)

PostgreSQL **ไม่อยู่ใน Docker** — ใช้ Supabase project (dev) แทน
`DATABASE_URL` ชี้ไปที่ Supabase connection string ตั้งแต่ต้น

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  redis_data:
  qdrant_data:
```

> Production: Redis → Upstash Redis (REDIS_URL จาก Upstash dashboard)
> Production: Qdrant → Qdrant Cloud (QDRANT_URL + QDRANT_API_KEY)

---

## 13. Environment Variables (`.env.example`)

```env
# App
NODE_ENV=development
PORT=3001
WEB_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3001

# Database — Supabase PostgreSQL
# dev:  ดึงจาก Supabase dashboard → Project Settings → Database → Connection string (URI)
# prod: ใช้ Transaction Pooler URL (port 6543) แทน Direct connection (port 5432)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Redis
# dev:  redis://localhost:6379  (Docker Compose)
# prod: rediss://:[password]@[endpoint].upstash.io:6379  (Upstash)
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=librora_items

# JWT
JWT_ACCESS_SECRET=change-me-in-production-min-32-chars
JWT_ACCESS_TTL=900
JWT_REFRESH_SECRET=change-me-different-from-access
JWT_REFRESH_TTL=2592000

# AI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# Worker
WORKER_CONCURRENCY=3
WORKER_MAX_ATTEMPTS=3
FETCH_TIMEOUT_MS=15000
FETCH_MAX_RESPONSE_BYTES=5242880
```

---

*เอกสารนี้เป็น living document — อัปเดตเมื่อ architecture decision เปลี่ยน*
*ไม่ Commit ค่า secret จริงลง repository ในทุกกรณี*
