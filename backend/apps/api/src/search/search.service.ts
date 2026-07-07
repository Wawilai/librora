import { Injectable, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { currentBillingPeriod } from "../common/billing-period.util";

@Injectable()
export class SearchService {
  private readonly qdrant: QdrantClient;
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private subscriptions: SubscriptionsService,
    private config: ConfigService,
  ) {
    this.qdrant = new QdrantClient({ url: config.get<string>("qdrant.url") });
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
    const collection = this.config.get<string>("qdrant.collection") ?? "librora_items";

    // Fall back to keyword if no OpenAI key configured
    if (!apiKey) return this.keywordAsSemantic(userId, q, limit);

    // Check collection exists (items may not be embedded yet)
    let collectionExists = false;
    try {
      const info = await this.qdrant.collectionExists(collection);
      collectionExists = info.exists;
    } catch {
      collectionExists = false;
    }
    if (!collectionExists) return this.keywordAsSemantic(userId, q, limit);

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

    // Search Qdrant — filter by userId in payload so users only see their own items
    const cappedLimit = Math.min(limit, this.config.get<number>("search.maxLimit") ?? 50);
    const minScore = this.config.get<number>("search.minScore") ?? 0.3;

    let qdrantResults: Array<{ id: string | number; score: number }> = [];
    try {
      const response = await this.qdrant.search(collection, {
        vector: queryVector,
        limit: cappedLimit,
        score_threshold: minScore,
        filter: {
          must: [{ key: "userId", match: { value: userId } }],
        },
        with_payload: true,
        with_vector: false,
      });
      qdrantResults = response;
    } catch {
      return this.keywordAsSemantic(userId, q, limit);
    }

    await this.incrementSemanticSearchUsage(userId).catch(() => null);

    if (!qdrantResults.length) return { items: [], total: 0, scores: [] };

    // Rehydrate — Qdrant stores the original cuid as itemId in payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = qdrantResults.map((r) => ((r as any).payload?.itemId as string | undefined) ?? String(r.id));
    const scoreMap = new Map(
      qdrantResults.map((r, i) => [ids[i], r.score]),
    );

    const items = await this.prisma.libraryItem.findMany({
      where: { id: { in: ids }, userId, deletedAt: null, archived: false },
      include: { tags: true },
    });

    // Return in Qdrant score order (most similar first)
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
