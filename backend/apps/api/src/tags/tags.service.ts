import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { z } from "zod";

export const RenameTagSchema = z.object({ tag: z.string().trim().toLowerCase().min(1).max(100) });
export type RenameTagDto = z.infer<typeof RenameTagSchema>;

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.itemTag.groupBy({
      by: ["tag"],
      where: { item: { userId, deletedAt: null, archived: false } },
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.tag }));
  }

  async rename(userId: string, oldTag: string, dto: RenameTagDto) {
    const newTag = dto.tag;
    if (oldTag === newTag) return { updated: 0 };
    // Items belonging to user that have oldTag
    const items = await this.prisma.itemTag.findMany({
      where: { tag: oldTag, item: { userId, deletedAt: null } },
      select: { itemId: true },
    });
    if (!items.length) throw new NotFoundException({ code: "TAG_NOT_FOUND", message: "Tag not found" });

    // For each item: upsert newTag, delete oldTag
    await this.prisma.$transaction(
      items.flatMap(({ itemId }) => [
        this.prisma.itemTag.upsert({
          where: { itemId_tag: { itemId, tag: newTag } },
          create: { itemId, tag: newTag, source: "MANUAL" },
          update: {},
        }),
        this.prisma.itemTag.delete({ where: { itemId_tag: { itemId, tag: oldTag } } }),
      ]),
    );
    return { updated: items.length };
  }

  async remove(userId: string, tag: string) {
    const items = await this.prisma.itemTag.findMany({
      where: { tag, item: { userId, deletedAt: null } },
      select: { itemId: true },
    });
    if (!items.length) throw new NotFoundException({ code: "TAG_NOT_FOUND", message: "Tag not found" });
    await this.prisma.itemTag.deleteMany({
      where: { tag, item: { userId } },
    });
    return { deleted: items.length };
  }

  async addTagToItem(userId: string, itemId: string, tag: string) {
    await this.assertItemOwner(userId, itemId);
    await this.prisma.itemTag.upsert({
      where: { itemId_tag: { itemId, tag } },
      create: { itemId, tag, source: "MANUAL" },
      update: { source: "MANUAL" },
    });
  }

  async removeTagFromItem(userId: string, itemId: string, tag: string) {
    await this.assertItemOwner(userId, itemId);
    await this.prisma.itemTag.delete({ where: { itemId_tag: { itemId, tag } } }).catch(() => null);
  }

  private async assertItemOwner(userId: string, itemId: string) {
    const item = await this.prisma.libraryItem.findFirst({ where: { id: itemId, userId, deletedAt: null } });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    return item;
  }
}
