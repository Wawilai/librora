/**
 * TEMPORARY — One-time setup endpoint to bootstrap the Qdrant collection.
 *
 * The Qdrant collection is only created when the worker processes a Premium
 * user's library item. This endpoint creates a test Premium user + item and
 * enqueues a processing job to trigger that path.
 *
 * Once the collection exists and the worker is confirmed healthy, this module
 * should be removed from app.module.ts (or this file deleted entirely).
 */

import { Controller, Post, ConflictException, Logger } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { normalizeUrl, domainOf, faviconLetter } from "../library-items/url.util";
import * as argon2 from "argon2";

const SETUP_EMAIL = "premium@test.librora.local";
const SETUP_URL = "https://example.com/setup-trigger-article";

@Controller("setup")
export class SetupController {
  private readonly logger = new Logger(SetupController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  /**
   * POST /api/v1/setup/premium-user
   *
   * Creates a Premium test user, subscription, and library item, then
   * enqueues a processing job so the worker creates the Qdrant collection.
   * Idempotency guard: returns 409 if any Premium subscription already exists.
   */
  @Public()
  @Post("premium-user")
  async createPremiumUser() {
    // Safety check — only run once, before any real Premium users exist.
    const existingPremium = await this.prisma.subscription.findFirst({
      where: { plan: "PREMIUM" },
    });
    if (existingPremium) {
      throw new ConflictException({
        code: "SETUP_ALREADY_DONE",
        message:
          "A Premium subscription already exists. This endpoint is a one-time setup tool and will not run again.",
      });
    }

    const emailNorm = SETUP_EMAIL.toLowerCase();
    const passwordHash = await argon2.hash("setup-placeholder-password-not-for-login");

    const urlNorm = normalizeUrl(SETUP_URL);
    const domain = domainOf(urlNorm);

    const { user, item, job } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: SETUP_EMAIL,
          emailNorm,
          passwordHash,
          displayName: "Setup Test User",
          // Mark as verified so the account is fully active.
          emailVerifiedAt: new Date(),
        },
      });

      await tx.subscription.create({
        data: {
          userId: user.id,
          plan: "PREMIUM",
          status: "ACTIVE",
        },
      });

      const item = await tx.libraryItem.create({
        data: {
          userId: user.id,
          url: SETUP_URL,
          urlNorm,
          domain,
          faviconLetter: faviconLetter(domain),
          title: "Setup trigger article",
          status: "PENDING",
          sourceType: "ARTICLE",
        },
      });

      const job = await tx.processingJob.create({
        data: {
          itemId: item.id,
          dispatchStatus: "PENDING_DISPATCH",
          executionStatus: "QUEUED",
        },
      });

      return { user, item, job };
    });

    // Attempt immediate dispatch (Transactional Outbox pattern: the DB record
    // is already PENDING_DISPATCH, so a Redis failure here is safe — the
    // Dispatcher sweep will retry on its next cycle).
    await this.queue.enqueueItemProcessing({
      itemId: item.id,
      userId: user.id,
      url: item.url,
    });

    this.logger.log(
      `[SETUP] Created Premium user ${user.id}, item ${item.id}, job ${job.id}. ` +
        `Worker will process the item and create the Qdrant collection.`,
    );

    return {
      message:
        "Premium user created and processing job enqueued. The worker will create the Qdrant collection when it processes this item.",
      userId: user.id,
      itemId: item.id,
      jobId: job.id,
    };
  }
}
