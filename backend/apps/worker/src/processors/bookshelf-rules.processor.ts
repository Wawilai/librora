import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface AutoArchiveConfig {
  days: number;
}

interface AutoTagConfig {
  domain: string;
  tag: string;
}

// Bounds each individual rule's blast radius per run — a user with a huge
// library still gets swept over multiple daily runs rather than one run
// locking a huge batch of rows.
const RULE_BATCH_LIMIT = 500;

@Processor("bookshelf-rules", { concurrency: 1 })
export class BookshelfRulesProcessor extends WorkerHost {
  private readonly logger = new Logger(BookshelfRulesProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === "apply-one") {
      const { ruleId } = job.data as { ruleId: string };
      const rule = await this.prisma.bookshelfRule.findUnique({ where: { id: ruleId } });
      if (!rule || !rule.enabled) return;
      await this.applyRule(rule.id, rule.userId, rule.type, rule.config);
      return;
    }

    // "sweep-all": run every enabled rule for every user.
    const rules = await this.prisma.bookshelfRule.findMany({ where: { enabled: true } });
    for (const rule of rules) {
      try {
        await this.applyRule(rule.id, rule.userId, rule.type, rule.config);
      } catch (err) {
        this.logger.warn(`Rule ${rule.id} failed: ${String(err)}`);
      }
    }
    if (rules.length > 0) {
      this.logger.log(`Bookshelf-rules sweep processed ${rules.length} rule(s)`);
    }
  }

  private async applyRule(
    ruleId: string,
    userId: string,
    type: string,
    config: Prisma.JsonValue,
  ): Promise<void> {
    if (type === "AUTO_ARCHIVE_AFTER_DAYS") {
      const { days } = config as unknown as AutoArchiveConfig;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await this.prisma.libraryItem.updateMany({
        where: { userId, archived: false, deletedAt: null, addedAt: { lt: cutoff } },
        data: { archived: true },
      });
      if (result.count > 0) {
        this.logger.log(`Rule ${ruleId}: auto-archived ${result.count} item(s)`);
      }
      return;
    }

    if (type === "AUTO_TAG_BY_DOMAIN") {
      const { domain, tag } = config as unknown as AutoTagConfig;
      const items = await this.prisma.libraryItem.findMany({
        where: { userId, domain, archived: false, deletedAt: null },
        select: { id: true },
        take: RULE_BATCH_LIMIT,
      });
      if (items.length === 0) return;

      await this.prisma.$transaction(
        items.map(({ id }) =>
          this.prisma.itemTag.upsert({
            where: { itemId_tag: { itemId: id, tag } },
            create: { itemId: id, tag, source: "AUTO" },
            update: {},
          }),
        ),
      );
      this.logger.log(`Rule ${ruleId}: auto-tagged ${items.length} item(s) with "${tag}"`);
    }
  }
}
