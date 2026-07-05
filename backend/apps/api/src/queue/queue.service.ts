import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ItemProcessingJob } from "./queue.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("item-processing") private queue: Queue<ItemProcessingJob>,
    @InjectQueue("account-purge") private accountPurgeQueue: Queue,
    @InjectQueue("dispatcher") private dispatcherQueue: Queue,
    @InjectQueue("bookshelf-rules") private bookshelfRulesQueue: Queue,
    @InjectQueue("email-digest") private emailDigestQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Repeatable job: daily sweep for soft-deleted accounts past their grace period.
    await this.accountPurgeQueue.add(
      "purge",
      {},
      {
        repeat: { pattern: "0 3 * * *" }, // 03:00 daily
        jobId: "account-purge-daily",
        removeOnComplete: 30,
        removeOnFail: 30,
      },
    );

    // Repeatable job: closes the transactional-outbox gap — recovers
    // ProcessingJob rows left at PENDING_DISPATCH/DISPATCH_FAILED when the
    // in-process enqueue attempt below failed (e.g. a Redis blip).
    await this.dispatcherQueue.add(
      "sweep",
      {},
      {
        repeat: { pattern: "*/1 * * * *" }, // every minute
        jobId: "dispatcher-sweep",
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    );

    // Repeatable job: daily sweep applying every enabled BookshelfRule
    // (auto-archive / auto-tag) across all users. Staggered an hour after the
    // account-purge job so the two bulk sweeps don't compete for DB load.
    await this.bookshelfRulesQueue.add(
      "sweep-all",
      {},
      {
        repeat: { pattern: "0 4 * * *" }, // 04:00 daily
        jobId: "bookshelf-rules-daily",
        removeOnComplete: 30,
        removeOnFail: 30,
      },
    );

    // Repeatable job: weekly email digest of unread (Reading List) items for
    // Premium users who haven't opted out. Monday 09:00, after the daily
    // bulk-sweep jobs above so it isn't competing with them for DB load.
    await this.emailDigestQueue.add(
      "send-all",
      {},
      {
        repeat: { pattern: "0 9 * * 1" }, // Monday 09:00
        jobId: "email-digest-weekly",
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    );
  }

  async enqueueBookshelfRule(job: { ruleId: string }): Promise<void> {
    await this.bookshelfRulesQueue.add("apply-one", job, {
      attempts: 2,
      removeOnComplete: 50,
      removeOnFail: 50,
    });
  }

  async enqueueItemProcessing(job: ItemProcessingJob): Promise<void> {
    try {
      await this.queue.add("process", job, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      await this.prisma.processingJob.update({
        where: { itemId: job.itemId },
        data: { dispatchStatus: "QUEUED", lastError: null },
      });
      this.logger.log(`Enqueued processing job for item ${job.itemId}`);
    } catch (err) {
      // Mark DISPATCH_FAILED (rather than leaving PENDING_DISPATCH) so the
      // Dispatcher's sweep query picks this row up on its next tick instead
      // of only recovering it once it happens to age past the grace window.
      await this.prisma.processingJob
        .update({
          where: { itemId: job.itemId },
          data: { dispatchStatus: "DISPATCH_FAILED", lastError: String(err) },
        })
        .catch(() => null);
      this.logger.warn(`Failed to enqueue item ${job.itemId}: ${err}`);
    }
  }
}
