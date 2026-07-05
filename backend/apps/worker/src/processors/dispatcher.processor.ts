import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ItemProcessingJob } from "./item-processing.processor";

// Closes the transactional-outbox gap: LibraryItemsService.create()/reprocess()
// write a ProcessingJob row (dispatchStatus: PENDING_DISPATCH) and then try to
// enqueue immediately in the same request. If that in-process enqueue call
// fails (Redis blip), the row previously just rotted forever — nothing ever
// re-scanned it. This sweep runs every minute and recovers those rows.
@Processor("dispatcher", { concurrency: 1 })
export class DispatcherProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatcherProcessor.name);

  // 30s grace window: don't grab a row whose in-process enqueue call from the
  // original request might still be in flight, which would double-enqueue it.
  private static readonly GRACE_MS = 30_000;
  private static readonly SWEEP_LIMIT = 100;

  constructor(
    private prisma: PrismaService,
    @InjectQueue("item-processing") private itemQueue: Queue<ItemProcessingJob>,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const stuck = await this.prisma.processingJob.findMany({
      where: {
        dispatchStatus: { in: ["PENDING_DISPATCH", "DISPATCH_FAILED"] },
        executionStatus: "QUEUED",
        scheduledAt: { lt: new Date(Date.now() - DispatcherProcessor.GRACE_MS) },
      },
      include: { item: { select: { userId: true, url: true } } },
      take: DispatcherProcessor.SWEEP_LIMIT,
    });

    for (const job of stuck) {
      try {
        await this.itemQueue.add(
          "process",
          { itemId: job.itemId, userId: job.item.userId, url: job.item.url },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        );
        await this.prisma.processingJob.update({
          where: { itemId: job.itemId },
          data: { dispatchStatus: "QUEUED" },
        });
        this.logger.log(`Recovered stuck job for item ${job.itemId}`);
      } catch (err) {
        await this.prisma.processingJob
          .update({
            where: { itemId: job.itemId },
            data: { dispatchStatus: "DISPATCH_FAILED", lastError: String(err) },
          })
          .catch(() => null);
        this.logger.warn(`Failed to recover item ${job.itemId}: ${String(err)}`);
      }
    }

    if (stuck.length > 0) {
      this.logger.log(`Dispatcher swept ${stuck.length} stuck job(s)`);
    }
  }
}
