import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import TurndownService = require("turndown");
import * as epubGenMemory from "epub-gen-memory";
import archiver = require("archiver");
import { PassThrough } from "stream";
import { PrismaService } from "../prisma/prisma.service";

export type ExportFormat = "md" | "epub";

// Bulk export is a synchronous request/response (not BullMQ) — bounded per
// request so it can't buffer an unbounded amount of content in memory or
// hold a Fastify request open indefinitely.
const BULK_EXPORT_LIMIT = 200;

const PLAN_FEATURES = {
  FREE: { export: false },
  PREMIUM: { export: true },
} as const;

interface ExportableItem {
  id: string;
  title: string;
  customTitle: string | null;
  extractedTitle: string | null;
  author: string | null;
  readableContentHtml: string | null;
  readableContent: string | null;
}

@Injectable()
export class ExportService {
  private readonly turndown = new TurndownService({ headingStyle: "atx" });

  constructor(private prisma: PrismaService) {}

  async exportOne(
    userId: string,
    itemId: string,
    format: ExportFormat,
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    await this.assertPremium(userId);
    const item = await this.prisma.libraryItem.findFirst({
      where: { id: itemId, userId, deletedAt: null },
    });
    if (!item) throw new NotFoundException({ code: "ITEM_NOT_FOUND", message: "Item not found" });
    if (item.status !== "READY" && item.status !== "PARTIAL") {
      throw new BadRequestException({
        code: "ITEM_NOT_READY",
        message: "Item has no extracted content to export yet",
      });
    }

    const title = item.customTitle || item.extractedTitle || item.title;
    const slug = this.slugify(title);

    if (format === "md") {
      const markdown = this.toMarkdown(title, item);
      return {
        filename: `${slug}.md`,
        contentType: "text/markdown; charset=utf-8",
        buffer: Buffer.from(markdown, "utf-8"),
      };
    }

    const buffer = await this.toEpub(title, [item]);
    return { filename: `${slug}.epub`, contentType: "application/epub+zip", buffer };
  }

  async exportBulk(
    userId: string,
    format: ExportFormat,
    filter: {
      status?: string;
      tag?: string;
      bookshelf?: string;
      readingList?: boolean;
      archived?: boolean;
      query?: string;
    },
  ): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
    await this.assertPremium(userId);

    const where: Record<string, unknown> = { userId, deletedAt: null };
    if (filter.status) where["status"] = filter.status.toUpperCase();
    if (filter.tag) where["tags"] = { some: { tag: filter.tag } };
    if (filter.bookshelf) where["bookshelf"] = filter.bookshelf;
    if (filter.readingList !== undefined) where["inReadingList"] = filter.readingList;
    where["archived"] = filter.archived ?? false;
    if (filter.query) {
      where["OR"] = [
        { title: { contains: filter.query, mode: "insensitive" } },
        { extractedTitle: { contains: filter.query, mode: "insensitive" } },
        { description: { contains: filter.query, mode: "insensitive" } },
      ];
    }

    const items = await this.prisma.libraryItem.findMany({
      where: { ...where, status: { in: ["READY", "PARTIAL"] } },
      orderBy: { addedAt: "desc" },
      take: BULK_EXPORT_LIMIT,
    });
    if (items.length === 0) {
      throw new NotFoundException({ code: "NO_ITEMS_TO_EXPORT", message: "No items match this filter" });
    }

    if (format === "epub") {
      const buffer = await this.toEpub("Librora export", items);
      return { filename: "librora-export.epub", contentType: "application/epub+zip", buffer };
    }

    const buffer = await this.toMarkdownZip(items);
    return { filename: "librora-export.zip", contentType: "application/zip", buffer };
  }

  private toMarkdown(title: string, item: ExportableItem): string {
    const body = item.readableContentHtml
      ? this.stripLeadingTitleHeading(this.turndown.turndown(item.readableContentHtml), title)
      : (item.readableContent ?? "");
    const byline = item.author ? `\n\n_By ${item.author}_` : "";
    return `# ${title}${byline}\n\n${body}\n`;
  }

  // Readability's extracted content frequently repeats the article's own
  // title as its first heading — without this, every export would show the
  // title twice (once from our own `# ${title}` header, once from the body).
  private stripLeadingTitleHeading(markdown: string, title: string): string {
    const lines = markdown.trimStart().split("\n");
    const first = lines[0]?.trim();
    if (first && /^#{1,2}\s+/.test(first) && first.replace(/^#{1,2}\s+/, "").trim() === title.trim()) {
      return lines.slice(1).join("\n").trimStart();
    }
    return markdown;
  }

  private async toEpub(bookTitle: string, items: ExportableItem[]): Promise<Buffer> {
    const chapters = items.map((item) => {
      const title = item.customTitle || item.extractedTitle || item.title;
      const content = item.readableContentHtml
        ? this.stripLeadingTitleHeadingHtml(item.readableContentHtml, title)
        : `<p>${this.escapeHtml(item.readableContent ?? "")}</p>`;
      return { title, content, author: item.author ? [item.author] : undefined };
    });
    return epubGenMemory.default({ title: bookTitle, author: "Librora" }, chapters);
  }

  // Same rationale as stripLeadingTitleHeading, applied to raw HTML instead
  // of Markdown — epub-gen-memory already renders `title` as the chapter
  // heading, so a matching leading <h1>/<h2> in the body would repeat it.
  private stripLeadingTitleHeadingHtml(html: string, title: string): string {
    const match = html.match(/^\s*<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    if (!match) return html;
    const headingText = match[1].replace(/<[^>]+>/g, "").trim();
    if (headingText !== title.trim()) return html;
    return html.slice(match[0].length);
  }

  private async toMarkdownZip(items: ExportableItem[]): Promise<Buffer> {
    const zip = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const stream = new PassThrough();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.pipe(stream);

    const usedNames = new Set<string>();
    for (const item of items) {
      const title = item.customTitle || item.extractedTitle || item.title;
      let filename = `${this.slugify(title)}.md`;
      let i = 2;
      while (usedNames.has(filename)) {
        filename = `${this.slugify(title)}-${i}.md`;
        i += 1;
      }
      usedNames.add(filename);
      zip.append(this.toMarkdown(title, item), { name: filename });
    }

    const done = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      zip.on("error", reject);
    });
    await zip.finalize();
    return done;
  }

  private slugify(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80) || "article"
    );
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "</p><p>");
  }

  private async assertPremium(userId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const plan = (sub?.plan ?? "FREE") as keyof typeof PLAN_FEATURES;
    if (!PLAN_FEATURES[plan].export) {
      throw new ForbiddenException({
        code: "PREMIUM_REQUIRED",
        message: "Exporting articles is a Premium feature",
      });
    }
  }
}
