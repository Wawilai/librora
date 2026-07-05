import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { z } from "zod";

export const SetBookshelfSchema = z.object({
  bookshelf: z.string().trim().min(1).max(100),
  source: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
});
export type SetBookshelfDto = z.infer<typeof SetBookshelfSchema>;

// Static bookshelf definitions shared with the frontend domain constants.
const BOOKSHELVES = [
  { slug: "code", label: "Code", description: "Snippets, languages, and patterns to keep handy." },
  {
    slug: "software-development",
    label: "Software Development",
    description: "Engineering craft, process, and quality.",
  },
  {
    slug: "architecture",
    label: "Architecture",
    description: "Systems, patterns, and how things fit together.",
  },
  { slug: "design", label: "Design", description: "Visual thinking, interfaces, and craft." },
  { slug: "business", label: "Business", description: "Strategy, markets, and ventures." },
  {
    slug: "management",
    label: "Management",
    description: "Leadership, teams, and decision-making.",
  },
  { slug: "research", label: "Research", description: "Methods, papers, and inquiry." },
  { slug: "news", label: "News", description: "Time-sensitive stories worth keeping." },
  { slug: "tools", label: "Tools", description: "Apps, utilities, and how to use them well." },
  { slug: "learning", label: "Learning", description: "How to learn, study, and remember." },
  {
    slug: "ai",
    label: "Artificial Intelligence",
    description: "Models, capabilities, and limits.",
  },
  {
    slug: "productivity",
    label: "Productivity",
    description: "Habits, focus, and personal systems.",
  },
  {
    slug: "philosophy",
    label: "Philosophy",
    description: "Ideas about thinking, ethics, and meaning.",
  },
  { slug: "other", label: "Other", description: "Items that don't fit neatly elsewhere." },
];

@Injectable()
export class BookshelvesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return BOOKSHELVES;
  }

  get(slug: string) {
    const shelf = BOOKSHELVES.find((b) => b.slug === slug);
    if (!shelf) throw new NotFoundException({ code: "BOOKSHELF_NOT_FOUND", message: "Bookshelf not found" });
    return shelf;
  }

  async setItemBookshelf(userId: string, itemId: string, dto: SetBookshelfDto) {
    const item = await this.prisma.libraryItem.findFirst({ where: { id: itemId, userId, deletedAt: null } });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    return this.prisma.libraryItem.update({
      where: { id: itemId },
      data: { bookshelf: dto.bookshelf, bookshelfSource: dto.source },
    });
  }

  async clearItemBookshelfOverride(userId: string, itemId: string) {
    const item = await this.prisma.libraryItem.findFirst({ where: { id: itemId, userId, deletedAt: null } });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    return this.prisma.libraryItem.update({
      where: { id: itemId },
      data: { bookshelfSource: "AUTO" },
    });
  }
}
