import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import OpenAI from "openai";
import { fetchUrl, FetchError } from "../pipeline/fetch-url";
import { extractMetadata, extractContent } from "../pipeline/extract-content";
import { runAiFeatures } from "../pipeline/ai-features";
import { embedAndUpsert } from "../pipeline/embed-upsert";
import { currentBillingPeriod } from "../common/billing-period.util";

const PLAN_LIMITS = {
  FREE: { aiProcessing: 0 },
  PREMIUM: { aiProcessing: 300 },
} as const;

// Mirrors backend/apps/api/src/library-items/url.util.ts's detectSourceType —
// duplicated per-app rather than shared, following the existing convention
// for URL/domain classification lists (see BOOKSHELF_SLUGS in ai-features.ts).
// Google Docs/Sheets/Slides are always login-gated, so a fetch here (even
// through the Playwright fallback used for Cloudflare challenges) never has
// the user's Google session — extraction can't succeed regardless of how the
// page is fetched, so this is checked before attempting it at all.
const GOOGLE_DOC_PATH_RE = /^\/(document|spreadsheets|presentation)\//;
function isGoogleDocUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "docs.google.com" && GOOGLE_DOC_PATH_RE.test(u.pathname);
  } catch {
    return false;
  }
}

export interface ItemProcessingJob {
  itemId: string;
  userId: string;
  url: string;
}

// lockDuration/maxStalledCount raised above BullMQ's defaults (30s / 1) — the
// Supabase pooler occasionally stalls a query for several seconds under
// concurrent load, which was blocking the event loop long enough to miss the
// default lock-renewal window and get the job reassigned mid-run (surfaced as
// "could not renew lock" / "Missing lock for job" / "Lock mismatch" errors).
//
// Concurrency is read from process.env directly (not ConfigService) because
// @Processor()'s decorator options are evaluated at class-decoration/module-load
// time, before Nest's DI container exists — ConfigService isn't available yet.
// Don't "fix" this into a config.get() call; it will break at startup.
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? "3", 10);

@Processor("item-processing", {
  concurrency: WORKER_CONCURRENCY,
  lockDuration: 90_000,
  maxStalledCount: 2,
})
export class ItemProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ItemProcessingProcessor.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
    this.openai = new OpenAI({ apiKey: config.get<string>("openai.apiKey") ?? "" });
  }

  async process(job: Job<ItemProcessingJob>): Promise<void> {
    const { itemId, userId, url } = job.data;
    this.logger.log(`[${itemId}] start — ${url}`);

    try {
      await this.prisma.processingJob.update({
        where: { itemId },
        data: {
          executionStatus: "PROCESSING",
          startedAt: new Date(),
          completedAt: null,
          lastError: null,
          attempt: { increment: 1 },
        },
      });
      await this.prisma.libraryItem.update({
        where: { id: itemId },
        data: { status: "PROCESSING", failureReason: null },
      });

      // Google Docs/Sheets/Slides are always login-gated — a real fetch
      // returns HTTP 401/redirect-to-login (not a 200 shell), which would
      // otherwise throw and land the item on FAILED with a raw, confusing
      // "HTTP 401" reason. Skip fetching entirely: keep the URL/domain/title
      // already saved at creation time and go straight to an honest PARTIAL.
      const isGoogleDoc = isGoogleDocUrl(url);
      let html = "";
      let finalUrl = url;

      if (!isGoogleDoc) {
        // ── Step 1: Fetch ─────────────────────────────────────────────────────
        this.logger.log(`[${itemId}] step 1: fetch`);
        const fetched = await fetchUrl(url, {
          timeoutMs: this.config.get<number>("worker.fetchTimeoutMs") ?? 15_000,
          maxBytes: this.config.get<number>("worker.fetchMaxBytes") ?? 5_242_880,
        });
        html = fetched.html;
        finalUrl = fetched.finalUrl;
      }

      // ── Step 2: Metadata ────────────────────────────────────────────────────
      this.logger.log(`[${itemId}] step 2: metadata`);
      const metadata = isGoogleDoc ? extractMetadata("", finalUrl) : extractMetadata(html, finalUrl);

      // ── Step 3: Readable content ────────────────────────────────────────────
      // Same login-gate reasoning as above — skip Readability entirely rather
      // than let it parse a login-wall shell and report a generic "couldn't
      // unpack" reason that isn't actually true.
      this.logger.log(`[${itemId}] step 3: content`);
      const readable = isGoogleDoc ? null : extractContent(html, finalUrl);

      // A low-quality extraction (JS-rendered SPA/paywall shell, etc.) means
      // readable.text isn't reliably the actual article — don't let AI
      // features or search embedding treat it as if it were.
      const contentUsableForAi = !isGoogleDoc && !!readable && readable.looksLikeRealArticle;

      // Save metadata + content immediately (so partial results are visible)
      await this.prisma.libraryItem.update({
        where: { id: itemId },
        data: {
          extractedTitle: metadata.extractedTitle,
          description: metadata.description,
          author: metadata.author,
          publishedDate: metadata.publishedDate?.toISOString() ?? null,
          language: metadata.language,
          domain: metadata.domain,
          readableContent: readable?.text ?? null,
          readableContentHtml: readable?.html ?? null,
          status: "PARTIAL",
          failureReason: null,
          // Framed around the source site's structure, not "our extraction
          // failed" — some sites build their content with JavaScript in a
          // way our reader can't unpack, which is a limitation of that site's
          // format rather than something wrong with the save itself. Always
          // set when contentUsableForAi is false (covers both the thin-text
          // case and readable === null entirely) so the user never sees a
          // silent PARTIAL with no explanation at all.
          partialReason: isGoogleDoc
            ? "This is a Google Doc — Librora can save the link and title, but can't read the file's contents since it requires your Google sign-in. Open the original to view it."
            : !contentUsableForAi
              ? "This site builds its page with technology our reader can't fully unpack yet, so we saved the link and details but couldn't pull in the full text or AI summary. You can still open the original page anytime from here."
              : null,
        },
      });

      // ── Steps 4-7: AI features (Premium plan gate) ─────────────────────────
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      const period = currentBillingPeriod(sub?.startedAt ?? new Date());
      const usage = await this.prisma.usagePeriod.findUnique({
        where: { userId_period: { userId, period } },
      });
      const plan = (sub?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
      const isPremium = plan === "PREMIUM";
      const aiRemaining = Math.max(
        0,
        PLAN_LIMITS[plan].aiProcessing - (usage?.aiAbstractsUsed ?? 0),
      );
      // Low-quality extraction caps the item at PARTIAL regardless of plan —
      // a Free-plan item with the same thin/SPA-shell content shouldn't be
      // marked READY just because it never reaches the AI-gated branch below.
      let finalStatus: "READY" | "PARTIAL" = contentUsableForAi ? "READY" : "PARTIAL";

      if (isPremium && contentUsableForAi && this.config.get<string>("openai.apiKey")) {
        if (aiRemaining === 0) {
          finalStatus = "PARTIAL";
          this.logger.warn(`[${itemId}] AI quota exhausted; skipping AI features`);
        } else {
          // Steps 4-6: abstract, tags, toc
          this.logger.log(`[${itemId}] step 4-6: AI features`);
          let aiResult: Awaited<ReturnType<typeof runAiFeatures>> | null = null;
          try {
            aiResult = await runAiFeatures(
              this.openai,
              this.config.get<string>("openai.chatModel") ?? "gpt-4o-mini",
              readable.textWithHeadingMarkers,
              metadata.extractedTitle,
            );
          } catch (err) {
            this.logger.warn(`[${itemId}] AI features failed (non-fatal): ${String(err)}`);
            finalStatus = "PARTIAL";
          }

          if (aiResult) {
            await this.incrementAiProcessingUsage(userId, period);

            // Never clobber a user's manual bookshelf choice — only write the
            // AI's pick when the item has no override (or was never classified).
            const currentItem = await this.prisma.libraryItem.findUnique({
              where: { id: itemId },
              select: { bookshelfSource: true },
            });
            const canSetAutoBookshelf = currentItem?.bookshelfSource !== "MANUAL";

            await this.prisma.libraryItem.update({
              where: { id: itemId },
              data: {
                aiAbstract: aiResult.abstract,
                ...(aiResult.bookshelf && canSetAutoBookshelf
                  ? { bookshelf: aiResult.bookshelf, bookshelfSource: "AUTO" }
                  : {}),
              },
            });

            if (aiResult.tags.length > 0) {
              await this.prisma.itemTag.createMany({
                data: aiResult.tags.map((tag) => ({ itemId, tag, source: "AUTO" })),
                skipDuplicates: true,
              });
            }

            if (aiResult.toc.length > 0) {
              await this.prisma.tocEntry.createMany({
                data: aiResult.toc.map((h, order) => ({
                  itemId,
                  level: h.level,
                  text: h.text,
                  anchor: h.anchor,
                  source: "AUTO",
                  order,
                })),
                skipDuplicates: true,
              });
            }
          }

          // Step 7: embed + upsert vector chunks to Postgres/pgvector
          this.logger.log(`[${itemId}] step 7: embed`);
          try {
            await embedAndUpsert(
              this.openai,
              this.prisma,
              {
                embeddingModel:
                  this.config.get<string>("openai.embeddingModel") ?? "text-embedding-3-small",
                dimension: this.config.get<number>("openai.embeddingDimension") ?? 1536,
              },
              itemId,
              readable.text,
              {
                userId,
                title: metadata.extractedTitle,
              },
            );
          } catch (err) {
            this.logger.warn(`[${itemId}] vector embed failed (non-fatal): ${String(err)}`);
          }
        }
      }

      // ── Step 8: Mark ready ──────────────────────────────────────────────────
      this.logger.log(`[${itemId}] step 8: mark ${finalStatus.toLowerCase()}`);
      await this.prisma.$transaction([
        this.prisma.libraryItem.update({
          where: { id: itemId },
          data: { status: finalStatus, processedAt: new Date(), failureReason: null },
        }),
        this.prisma.processingJob.update({
          where: { itemId },
          data: { executionStatus: "COMPLETED", completedAt: new Date(), lastError: null },
        }),
      ]);

      this.logger.log(`[${itemId}] done`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Most FetchErrors are permanent (bad URL, SSRF, non-HTML content) and
      // retrying won't help — but network/DNS/timeout errors are genuinely
      // transient (confirmed: a "redirect count exceeded" fetch failure
      // against Notion succeeded on the very next attempt), so only those
      // fall through to the normal attempt-based retry below.
      const isPermanentFetchError = err instanceof FetchError && !err.transient;
      this.logger.error(`[${itemId}] failed: ${message}`);

      const jobRow = await this.prisma.processingJob.findUnique({ where: { itemId } });
      const maxAttempts = jobRow?.maxAttempts ?? 3;
      const attempt = jobRow?.attempt ?? 0;
      const isFinal = isPermanentFetchError || attempt >= maxAttempts;

      await this.prisma.$transaction([
        this.prisma.libraryItem.update({
          where: { id: itemId },
          data: {
            status: isFinal ? "FAILED" : "PENDING",
            failureReason: isFinal ? message : null,
          },
        }),
        this.prisma.processingJob.update({
          where: { itemId },
          data: {
            executionStatus: isFinal ? "FAILED" : "QUEUED",
            lastError: message,
          },
        }),
      ]);

      if (!isFinal) throw err; // BullMQ will retry
    }
  }

  private async incrementAiProcessingUsage(userId: string, period: string) {
    await this.prisma.usagePeriod.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, aiAbstractsUsed: 1 },
      update: { aiAbstractsUsed: { increment: 1 } },
    });
  }
}
