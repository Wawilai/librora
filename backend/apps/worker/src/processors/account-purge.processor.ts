import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Processor("account-purge", { concurrency: 1 })
export class AccountPurgeProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountPurgeProcessor.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const graceDays = this.config.get<number>("accountDeletion.graceDays")!;
    const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

    const toPurge = await this.prisma.user.findMany({
      where: { deletedAt: { lte: cutoff } },
      select: { id: true },
    });

    for (const { id } of toPurge) {
      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`Purged account ${id} after ${graceDays}-day grace period`);
    }

    if (toPurge.length > 0) {
      this.logger.log(`Account purge complete: ${toPurge.length} account(s) removed`);
    }
  }
}
