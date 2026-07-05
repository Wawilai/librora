import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { buildDigestEmail } from "../email/templates/digest";

// Weekly digest is Premium-only and opt-out (User.digestEnabled, default
// true) — sends unread (still-in-Reading-List) items with their AI
// abstracts. Users with zero unread items are skipped entirely; no empty
// digest spam.
@Processor("email-digest", { concurrency: 1 })
export class EmailDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailDigestProcessor.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        digestEnabled: true,
        subscription: { plan: "PREMIUM", status: "ACTIVE" },
      },
      select: { id: true, email: true },
    });

    let sent = 0;
    for (const user of users) {
      const items = await this.prisma.libraryItem.findMany({
        where: { userId: user.id, inReadingList: true, archived: false, deletedAt: null },
        orderBy: { addedAt: "desc" },
        select: {
          id: true,
          title: true,
          customTitle: true,
          extractedTitle: true,
          aiAbstract: true,
          domain: true,
        },
        take: 50,
      });
      if (items.length === 0) continue;

      const webBaseUrl = this.config.get<string>("webBaseUrl")!;
      const html = buildDigestEmail(items, webBaseUrl);
      try {
        await this.email.send(user.email, "Your Librora reading list", html);
        sent += 1;
      } catch (err) {
        this.logger.warn(`Failed to send digest to user ${user.id}: ${String(err)}`);
      }
    }

    if (sent > 0) {
      this.logger.log(`Email digest sent to ${sent} user(s)`);
    }
  }
}
