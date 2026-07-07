import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

@Injectable()
export class QdrantInitService implements OnModuleInit {
  private readonly logger = new Logger(QdrantInitService.name);
  private readonly qdrant: QdrantClient;
  private readonly collection: string;
  private readonly dimension: number;

  constructor(private readonly config: ConfigService) {
    this.qdrant = new QdrantClient({
      url: config.get<string>("qdrant.url"),
      apiKey: config.get<string>("qdrant.apiKey") || undefined,
    });
    this.collection = config.get<string>("qdrant.collection") ?? "librora_items";
    this.dimension = config.get<number>("openai.embeddingDimension") ?? 1536;
  }

  async onModuleInit(): Promise<void> {
    try {
      const { exists } = await this.qdrant.collectionExists(this.collection);

      if (exists) {
        this.logger.log(`Qdrant collection "${this.collection}" already exists — skipping creation`);
        return;
      }

      await this.qdrant.createCollection(this.collection, {
        vectors: { size: this.dimension, distance: "Cosine" },
      });

      this.logger.log(
        `Qdrant collection "${this.collection}" created (dimension=${this.dimension}, distance=Cosine)`,
      );
    } catch (err) {
      // Log but do not crash the application — Qdrant may be temporarily
      // unavailable and the collection can be created on the next restart.
      this.logger.error(
        `Failed to initialise Qdrant collection "${this.collection}": ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
