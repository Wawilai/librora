import { Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import OpenAI from "openai";
import { currentBillingPeriod } from "../common/billing-period.util";

@Injectable()
export class SearchService {
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get<string>("openai.apiKey") ?? "" });
  }

  async keyword(userId: string, q: string, limit = 20) {
    if (!q?.trim()) return { items: [], total: 0 };

    const items = await this.prisma.libraryItem.findMany({
      where: {
        userId,
        deletedAt: null,
        archived: false,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { extractedTitle: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { readableContent: { contains: q, mode: "insensitive" } },
          { domain: { contains: q, mode: "insensitive" } },
          { personalNote: { contains: q, mode: "insensitive" } },
          { tags: { some: { tag: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { tags: true },
      orderBy: { addedAt: "desc" },
      take: Math.min(limit, 50),
    });

    return { items, total: items.length };
  }

  async semantic(userId: string, q: string, limit = 10) {
    const planData = await this.subscriptions.getPlanAndUsage(userId);
    if (!planData.features.semanticSearch) {
      throw new ForbiddenException({
        code: "PLAN_FEATURE_NOT_AVAILABLE",
        message: "Semantic search requires a Premium plan",
      });
    }

    const apiKey = this.config.get<string>("openai.apiKey");

    // Fall back to keyword if no OpenAI key configured
    if (!apiKey) return this.keywordAsSemantic(userId, q, limit);

    // Embed the query
    const embeddingModel =
      this.config.get<string>("openai.embeddingModel") ?? "text-embedding-3-small";
    const dimension = this.config.get<number>("openai.embeddingDimension") ?? 1536;

    let queryVector: number[];
    try {
      const embeddingResponse = await this.openai.embeddings.create({
        model: embeddingModel,
        input: q.trim(),
        dimensions: dimension,
      });
      const vector = embeddingResponse.data?.[0]?.embedding;
      if (!vector?.length) return this.keywordAsSemantic(userId, q, limit);
      queryVector = vector;
    } catch {
      // OpenAI error — fall back to keyword
      return this.keywordAsSemantic(userId, q, limit);
    }

    // Search embedded chunks in Postgres/pgvector. The top chunks are grouped
    // back to items so a long article can match from any embedded section.
    const cappedLimit = Math.min(limit, this.config.get<number>("search.maxLimit") ?? 50);
    const minScore = this.config.get<number>("search.minScore") ?? 0.3;
    const vector = `[${queryVector.join(",")}]`;

    let vectorResults: Array<{ itemId: string; score: number }> = [];
    try {
      vectorResults = await this.prisma.$queryRaw`
        WITH ranked_chunks AS (
          SELECT
            ie."item_id" AS "itemId",
            1 - (ie."embedding" <=> ${vector}::vector) AS "score"
          FROM "item_embeddings" ie
          INNER JOIN "library_items" li ON li."id" = ie."item_id"
          WHERE
            ie."user_id" = ${userId}
            AND li."deleted_at" IS NULL
            AND li."archived" = false
          ORDER BY ie."embedding" <=> ${vector}::vector
          LIMIT ${cappedLimit * 5}
        )
        SELECT "itemId", MAX("score")::float AS "score"
        FROM ranked_chunks
        WHERE "score" >= ${minScore}
        GROUP BY "itemId"
        ORDER BY "score" DESC
        LIMIT ${cappedLimit}
      `;
    } catch {
      return this.keywordAsSemantic(userId, q, limit);
    }

    await this.incrementSemanticSearchUsage(userId).catch(() => null);

    if (!vectorResults.length) return this.keywordAsSemantic(userId, q, limit);

    const ids = vectorResults.map((r) => r.itemId);
    const scoreMap = new Map(
      vectorResults.map((r) => [r.itemId, r.score]),
    );

    const items = await this.prisma.libraryItem.findMany({
      where: { id: { in: ids }, userId, deletedAt: null, archived: false },
      include: { tags: true },
    });

    // Return in vector score order (most similar first)
    const sorted = items.sort(
      (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
    );

    // Increment usage counter (fire-and-forget — don't fail the search if this errors)
    return {
      items: sorted,
      total: sorted.length,
      scores: sorted.map((i) => scoreMap.get(i.id) ?? 0),
    };
  }

  private async keywordAsSemantic(userId: string, q: string, limit: number) {
    const result = await this.keyword(userId, q, limit);
    return {
      ...result,
      scores: result.items.map(() => 0),
    };
  }

  private async incrementSemanticSearchUsage(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const period = currentBillingPeriod(sub?.startedAt ?? new Date());
    await this.prisma.usagePeriod.upsert({
      where: { userId_period: { userId, period } },
      create: { userId, period, semanticSearches: 1 },
      update: { semanticSearches: { increment: 1 } },
    });
  }
}
