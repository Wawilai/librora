# Librora Next Work

Updated: 2026-07-04

## Priority Order

1. Landing page Premium pricing and marketing section
2. Premium full-system readiness check

## 1. Landing Page Premium Pricing

Goal: make the public landing page sell Premium clearly before production launch.

Recommended offer:

| Plan | Price | Daily equivalent | Positioning |
|---|---:|---:|---|
| Premium Monthly | $8.99/month | about $0.30/day | Flexible monthly plan |
| Premium Yearly Launch | $79/year | about $0.22/day | Best value, save $28.88/year |

Pricing math:

- Monthly annualized cost: $8.99 x 12 = $107.88/year
- Monthly daily equivalent: $8.99 / 30 = about $0.30/day
- Yearly launch price: $79/year
- Yearly daily equivalent: $79 / 365 = about $0.22/day
- Customer saving: $28.88/year
- Discount: about 27% off monthly billing
- Yearly effective monthly price: $79 / 12 = about $6.58/month

Safer margin option:

- Use $89/year if AI processing cost needs more buffer.
- $89/year = about $0.24/day.
- Saving versus monthly billing: $18.88/year, about 17.5% off.

Recommended default: show Monthly at $8.99 and highlight Yearly Launch at $79/year.

Reasoning:

- Readwise Reader is priced above this market position at about $12.99/month or $9.99/month billed annually.
- Instapaper Premium is cheaper at about $5.99/month or $59.99/year, but has less AI-native positioning.
- Raindrop.io Pro is much cheaper, so Librora should avoid competing as a bookmark manager and sell the AI library outcome instead.
- A 25-30% yearly discount is easier to market than a small annual discount, and it gives the yearly plan a clear reason to exist.

Landing page message:

- Sell the outcome, not only the feature: "Turn saved articles into a searchable AI library."
- Show the monthly daily equivalent clearly: "$8.99/month, about $0.30/day."
- Use the yearly daily price as the stronger psychological anchor: "From $0.22/day when billed yearly."
- Make yearly the recommended card: "Best value" or "Launch price".
- Keep free plan visible, but make Premium feel like the serious reader/researcher plan.

Suggested headline copy:

> Build a personal AI library from everything worth reading.

Suggested pricing card copy:

Monthly:

> Premium  
> $8.99/month  
> About $0.30/day.  
> AI abstracts, smart tags, semantic search, and reprocessing for your saved articles.

Yearly:

> Premium Yearly  
> $79/year  
> About $0.22/day. Save $28.88 compared with monthly billing.

Suggested CTA copy:

- Start Premium
- Save 27% yearly
- Upgrade to Premium

Premium value bullets:

- AI abstracts for saved articles
- Auto tags and smart table of contents
- Semantic search across the personal library
- Smart Bookshelves
- Reprocess articles when content changes
- Higher monthly AI limits

Implementation notes:

- Update landing page copy in `frontend/src/routes/index.tsx`.
- Add English and Thai strings to `frontend/src/lib/locales/en.ts` and `frontend/src/lib/locales/th.ts`.
- Keep the current UI structure and visual style unless explicitly asked to redesign.
- Ensure primary language setting does not mix Thai and English on the landing page.
- Validate with `bun run format`, `bun run typecheck`, and `bun run lint` inside Docker/frontend flow.

## 2. Premium Full-System Readiness Check

Goal: make sure paying customers can use Premium completely across the whole product before production launch.

Status after Docker smoke on 2026-07-04: Premium backend flow is ready in Docker smoke tests. The only remaining payment confidence step is a real Stripe-hosted payment through Checkout UI or Stripe CLI against the production webhook URL.

Fixes completed during this check:

- Fixed item queue dispatch state so successfully enqueued jobs are marked `dispatchStatus=QUEUED`.
- Fixed dispatcher sweep so it only recovers jobs that are still `executionStatus=QUEUED`.
- Fixed reprocess job reset to refresh `scheduledAt`, clear stale errors, and avoid immediate stale recovery.
- Cleared stale `failureReason` / `lastError` on successful processing.
- Fixed semantic search usage so successful semantic attempts count even when zero items clear the score threshold.

Docker smoke results:

- API, frontend, worker, Redis, and Qdrant are running.
- Frontend routes `/plan`, `/search`, and `/library` return 200 on `localhost:4173`.
- New Free user registers successfully.
- Free semantic search is blocked with `PLAN_FEATURE_NOT_AVAILABLE`.
- Stripe Checkout session creation returns a real Stripe Checkout URL.
- Stripe Billing Portal session creation returns a real Stripe billing URL after a customer exists.
- Signed Stripe webhook smoke passes:
  - `checkout.session.completed` changes Free to Premium.
  - `customer.subscription.deleted` changes Premium back to Free.
- Premium plan usage returns Premium limits.
- Premium item processing reaches `READY` with readable content, AI abstract, auto tags, and Qdrant embedding.
- No duplicate dispatcher recovery occurred after the queue fix.
- AI usage increments once per processing run.
- Semantic search returns results and increments `semanticSearches`.
- Reprocess works and increments `reprocessCount`.
- Extension handoff returns extension-scoped tokens.

Remaining before declaring fully production-ready:

- Run a real Stripe-hosted payment flow and confirm the Checkout UI redirects back to `/plan?checkout=success`.
- Run `customer.subscription.updated` and `customer.subscription.deleted` webhook tests from Stripe CLI or Dashboard.
- Confirm production webhook URL is reachable by Stripe, not only localhost/Docker.
- Add or document an external API health endpoint; `/api/v1/health` currently returns 404 even though Docker health is healthy.
- Do one final production smoke with a clean user after Stripe webhook verification.

Required verification:

- Stripe Checkout can upgrade a Free user to Premium.
- Stripe webhook updates the backend subscription state correctly.
- Billing Portal opens for Premium users.
- `/subscriptions/me` returns Premium plan, usage, and limits correctly.
- Premium users can add articles and receive AI abstracts.
- Premium users receive auto tags and smart table of contents.
- Premium users can use semantic search against real Qdrant embeddings.
- Premium users can reprocess articles within quota.
- Premium usage counters increment correctly:
  - `aiAbstractsUsed`
  - `semanticSearches`
  - `reprocessCount`
- Premium quota exceeded states return `USAGE_QUOTA_EXCEEDED`.
- Free users remain blocked from Premium-only features with `PLAN_FEATURE_NOT_AVAILABLE` where appropriate.
- Frontend renders Premium-only features without mock data.
- Extension save flow works for logged-in Premium users.
- Docker smoke tests cover frontend, API, worker, Redis, Qdrant, and Stripe webhook path.

Suggested acceptance test:

1. Register or log in as a Free user.
2. Upgrade via Stripe Checkout.
3. Confirm the user becomes Premium in the UI and API.
4. Save a real article.
5. Wait for worker processing.
6. Confirm the item becomes READY or PARTIAL with Premium AI fields populated where possible.
7. Run keyword search and semantic search.
8. Reprocess the item.
9. Confirm all Premium usage counters update.
10. Confirm no mock adapter or fake Premium state is used.

## Remaining Known Cleanup

- Landing page still contains hardcoded Thai text outside locale files.
- `frontend/src/components/librora/shared-states.tsx` still has Thai fallback toast strings.
- `frontend/src/lib/api/fetch-adapter.ts` still has Thai fallback error strings.
- `frontend/src/routes/design-system.tsx` contains Thai demo text; keep only if it is intentionally internal.
- Docs need a final production-readiness pass because some handoff text is stale after recent implementation work.

## Market References Checked

- Readwise pricing: https://readwise.io/pricing/reader
- Instapaper Premium pricing: https://www.instapaper.com/premium
- Raindrop.io Pro pricing: https://raindrop.io/pro
