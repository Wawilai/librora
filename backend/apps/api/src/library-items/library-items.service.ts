import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { normalizeUrl, domainOf, faviconLetter, detectSourceType } from "./url.util";
import { currentBillingPeriod } from "../common/billing-period.util";

const PLAN_LIMITS = {
  FREE: { reprocess: 0 },
  PREMIUM: { reprocess: 50 },
} as const;

@Injectable()
export class LibraryItemsService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  // ── List (with filters) ───────────────────────────────────────────────────

  async list(
    userId: string,
    opts: {
      page?: number;
      limit?: number;
      status?: string;
      tag?: string;
      bookshelf?: string;
      readingList?: boolean;
      archived?: boolean;
      sort?: string;
      query?: string;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId, deletedAt: null };
    if (opts.status) where["status"] = opts.status.toUpperCase();
    if (opts.tag) where["tags"] = { some: { tag: opts.tag } };
    if (opts.bookshelf) where["bookshelf"] = opts.bookshelf;
    if (opts.readingList !== undefined) where["inReadingList"] = opts.readingList;
    where["archived"] = opts.archived ?? false;
    if (opts.query) {
      where["OR"] = [
        { title: { contains: opts.query, mode: "insensitive" } },
        { extractedTitle: { contains: opts.query, mode: "insensitive" } },
        { description: { contains: opts.query, mode: "insensitive" } },
        { domain: { contains: opts.query, mode: "insensitive" } },
      ];
    }

    const orderBy: Record<string, string> =
      opts.sort === "oldest"
        ? { addedAt: "asc" }
        : opts.sort === "recently_updated"
          ? { updatedAt: "desc" }
          : opts.sort === "title_asc"
            ? { title: "asc" }
            : opts.sort === "title_desc"
              ? { title: "desc" }
              : { addedAt: "desc" };

    const [items, total] = await Promise.all([
      this.prisma.libraryItem.findMany({
        where,
        include: { tags: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.libraryItem.count({ where }),
    ]);

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  // ── Check existing (duplicate detection) ─────────────────────────────────

  async checkExisting(userId: string, url: string) {
    const urlNorm = normalizeUrl(url);
    const existing = await this.prisma.libraryItem.findFirst({
      where: { userId, urlNorm, deletedAt: null },
      include: { tags: true },
    });
    return existing ? { exists: true, item: existing } : { exists: false };
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────

  async inbox(userId: string) {
    const [processing, needsAttention, recentlyCompleted] = await Promise.all([
      this.prisma.libraryItem.findMany({
        where: { userId, deletedAt: null, status: { in: ["PENDING", "PROCESSING"] } },
        orderBy: { addedAt: "desc" },
        take: 20,
      }),
      this.prisma.libraryItem.findMany({
        where: { userId, deletedAt: null, status: { in: ["FAILED", "PARTIAL"] } },
        orderBy: { addedAt: "desc" },
        take: 20,
      }),
      this.prisma.libraryItem.findMany({
        where: { userId, deletedAt: null, status: "READY", archived: false },
        orderBy: { processedAt: "desc" },
        take: 6,
      }),
    ]);
    return { processing, needsAttention, recentlyCompleted };
  }

  // ── Reading List ──────────────────────────────────────────────────────────

  async readingList(userId: string) {
    return this.prisma.libraryItem.findMany({
      where: { userId, deletedAt: null, inReadingList: true, archived: false },
      include: { tags: true },
      orderBy: { addedAt: "desc" },
    });
  }

  // ── Archive ───────────────────────────────────────────────────────────────

  async archiveList(userId: string) {
    return this.prisma.libraryItem.findMany({
      where: { userId, deletedAt: null, archived: true },
      include: { tags: true },
      orderBy: { addedAt: "desc" },
    });
  }

  // ── Update (PATCH fields) ─────────────────────────────────────────────────

  async update(userId: string, id: string, patch: { customTitle?: string | null; personalNote?: string | null }) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({
      where: { id },
      data: {
        ...(patch.customTitle !== undefined && {
          customTitle: patch.customTitle,
          title: patch.customTitle || undefined,
        }),
        ...(patch.personalNote !== undefined && { personalNote: patch.personalNote }),
      },
    });
  }

  // ── Get ───────────────────────────────────────────────────────────────────

  async get(userId: string, id: string) {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id, userId, deletedAt: null },
      include: { tags: true, tocEntries: { orderBy: { order: "asc" } } },
    });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    return item;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateItemDto) {
    const urlNorm = normalizeUrl(dto.url);
    const domain = domainOf(urlNorm);
    const sourceType = detectSourceType(dto.url);

    const existing = await this.prisma.libraryItem.findFirst({
      where: { userId, urlNorm, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({
        code: "ITEM_DUPLICATE",
        message: "This URL is already in your library",
        details: { existingItemId: existing.id },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.libraryItem.create({
        data: {
          userId,
          url: dto.url,
          urlNorm,
          domain,
          faviconLetter: faviconLetter(domain),
          title: dto.customTitle || dto.url,
          customTitle: dto.customTitle,
          personalNote: dto.note,
          status: "PENDING",
          sourceType,
        },
      });

      if (dto.tags?.length) {
        await tx.itemTag.createMany({
          data: dto.tags.map((tag) => ({ itemId: item.id, tag, source: "MANUAL" })),
        });
      }

      // Create processing job (Transactional Outbox)
      await tx.processingJob.create({
        data: {
          itemId: item.id,
          dispatchStatus: "PENDING_DISPATCH",
          executionStatus: "QUEUED",
        },
      });

      return tx.libraryItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { tags: true },
      });
    }).then(async (createdItem) => {
      // Attempt immediate queue dispatch (Transactional Outbox pattern:
      // job record was already created in DB, so failure here is safe —
      // Dispatcher will retry PENDING_DISPATCH jobs on its next cycle)
      await this.queue.enqueueItemProcessing({
        itemId: createdItem.id,
        userId,
        url: createdItem.url,
      });
      return createdItem;
    });
  }

  // ── Update (patch) ────────────────────────────────────────────────────────

  async setNote(userId: string, id: string, note: string) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({
      where: { id },
      data: { personalNote: note },
    });
  }

  async toggleReadingList(userId: string, id: string) {
    const item = await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({
      where: { id },
      data: { inReadingList: !item.inReadingList },
    });
  }

  async addToReadingList(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({ where: { id }, data: { inReadingList: true } });
  }

  async removeFromReadingList(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({ where: { id }, data: { inReadingList: false } });
  }

  async archive(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({ where: { id }, data: { archived: true } });
  }

  async restore(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.libraryItem.update({ where: { id }, data: { archived: false } });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.libraryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.$executeRaw`DELETE FROM "item_embeddings" WHERE "item_id" = ${id}`;
  }

  async reprocess(userId: string, id: string) {
    await this.assertOwner(userId, id);
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const period = currentBillingPeriod(sub?.startedAt ?? new Date());
    const usage = await this.prisma.usagePeriod.findUnique({
      where: { userId_period: { userId, period } },
    });
    const plan = (sub?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan].reprocess;
    const used = usage?.reprocessCount ?? 0;
    if (used >= limit) {
      throw new ForbiddenException({
        code: "USAGE_QUOTA_EXCEEDED",
        message: "You have used all reprocesses available for this billing period",
      });
    }

    const item = await this.prisma.$transaction(async (tx) => {
      await tx.usagePeriod.upsert({
        where: { userId_period: { userId, period } },
        create: { userId, period, reprocessCount: 1 },
        update: { reprocessCount: { increment: 1 } },
      });
      const updated = await tx.libraryItem.update({ where: { id }, data: { status: "PENDING" } });
      const existing = await tx.processingJob.findUnique({ where: { itemId: id } });
      if (existing) {
        await tx.processingJob.update({
          where: { itemId: id },
          data: {
            dispatchStatus: "PENDING_DISPATCH",
            executionStatus: "QUEUED",
            attempt: 0,
            lastError: null,
            scheduledAt: new Date(),
            startedAt: null,
            completedAt: null,
          },
        });
      } else {
        await tx.processingJob.create({
          data: { itemId: id, dispatchStatus: "PENDING_DISPATCH", executionStatus: "QUEUED" },
        });
      }
      return updated;
    });

    // Same Transactional Outbox pattern as create(): DB job record is already
    // PENDING_DISPATCH, so a dispatch failure here is safe to ignore — but
    // unlike create(), reprocess previously never reached this point at all.
    await this.queue.enqueueItemProcessing({ itemId: item.id, userId, url: item.url });

    return this.get(userId, id);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async assertOwner(userId: string, id: string) {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    return item;
  }
}
