import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { PrismaService } from "../prisma/prisma.service";

@Processor("account-purge", { concurrency: 1 })
export class AccountPurgeProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountPurgeProcessor.name);
  private readonly qdrant: QdrantClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
    this.qdrant = new QdrantClient({
      url: this.config.get<string>("qdrant.url"),
      apiKey: this.config.get<string>("qdrant.apiKey"),
    });
  }

  async process(_job: Job): Promise<void> {
    const graceDays = this.config.get<number>("accountDeletion.graceDays")!;
    const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

    const toPurge = await this.prisma.user.findMany({
      where: { deletedAt: { lte: cutoff } },
      select: { id: true },
    });

    for (const { id } of toPurge) {
      // Cascade delete only touches Postgres (LibraryItem, Subscription,
      // RefreshToken, PasswordResetToken, UsagePeriod rows via onDelete:
      // Cascade) — Qdrant is a separate store the cascade can't reach, so
      // every purged account would otherwise leak all its embedded vectors
      // permanently. Non-fatal: a Qdrant outage shouldn't block the account
      // deletion itself, which is the stronger guarantee to keep.
      const collection = this.config.get<string>("qdrant.collection") ?? "librora_items";
      await this.qdrant
        .delete(collection, { filter: { must: [{ key: "userId", match: { value: id } }] } })
        .catch((err) => {
          this.logger.warn(`[${id}] Qdrant cleanup failed (non-fatal): ${String(err)}`);
        });

      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`Purged account ${id} after ${graceDays}-day grace period`);
    }

    if (toPurge.length > 0) {
      this.logger.log(`Account purge complete: ${toPurge.length} account(s) removed`);
    }
  }
}
