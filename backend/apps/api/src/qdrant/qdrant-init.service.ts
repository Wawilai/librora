import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

@Injectable()
export class QdrantInitService implements OnModuleInit {
  private readonly logger = new Logger(QdrantInitService.name);
  private readonly qdrant: QdrantClient;

  constructor(private readonly config: ConfigService) {
    this.qdrant = new QdrantClient({
      url: config.get<string>("qdrant.url"),
      apiKey: config.get<string>("qdrant.apiKey"),
    });
  }

  async onModuleInit(): Promise<void> {
    const collection = this.config.get<string>("qdrant.collection") ?? "librora_items";

    try {
      const { exists } = await this.qdrant.collectionExists(collection);

      if (exists) {
        this.logger.log(`Qdrant collection "${collection}" already exists — skipping creation`);
        return;
      }

      await this.qdrant.createCollection(collection, {
        vectors: {
          size: 1536,
          distance: "Cosine",
        },
      });

      this.logger.log(`Qdrant collection "${collection}" created successfully`);
    } catch (err) {
      // Non-fatal: log and continue so the API still starts if Qdrant is unavailable
      this.logger.error(
        `Failed to initialise Qdrant collection "${collection}": ${(err as Error).message}`,
      );
    }
  }
}
