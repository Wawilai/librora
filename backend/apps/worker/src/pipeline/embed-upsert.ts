import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "crypto";
import { withRateLimitRetry } from "./openai-retry";

// Qdrant point IDs must be UUID or unsigned integer.
// Derive a deterministic UUID v5-style from the cuid itemId so searches can match it back.
function itemIdToUuid(itemId: string): string {
  const hex = createHash("sha256").update(itemId).digest("hex");
  // Format first 32 hex chars as UUID: 8-4-4-4-12
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16), // version 4 marker
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // variant
    hex.slice(20, 32),
  ].join("-");
}

// Ensure collection exists with correct vector config
export async function ensureCollection(
  qdrant: QdrantClient,
  collection: string,
  dimension: number,
): Promise<void> {
  const exists = await qdrant.collectionExists(collection);
  if (!exists.exists) {
    await qdrant.createCollection(collection, {
      vectors: { size: dimension, distance: "Cosine" },
    });
  }
}

export async function embedAndUpsert(
  openai: OpenAI,
  qdrant: QdrantClient,
  opts: { embeddingModel: string; collection: string; dimension: number },
  itemId: string,
  text: string,
  metadata: {
    userId: string;
    url: string;
    title: string | null;
    domain: string;
    tags: string[];
  },
): Promise<void> {
  // Combine title + content excerpt for embedding (max 8k chars)
  const input = [metadata.title, text.slice(0, 8_000)].filter(Boolean).join("\n\n");

  const embeddingResponse = await withRateLimitRetry(() =>
    openai.embeddings.create({
      model: opts.embeddingModel,
      input,
      dimensions: opts.dimension,
    }),
  );

  const vector = embeddingResponse.data?.[0]?.embedding;
  if (!vector?.length) {
    throw new Error("OpenAI embedding response did not include a vector");
  }

  await qdrant.upsert(opts.collection, {
    wait: true,
    points: [
      {
        id: itemIdToUuid(itemId),
        vector,
        payload: {
          itemId, // keep original cuid for rehydration
          userId: metadata.userId,
          url: metadata.url,
          title: metadata.title,
          domain: metadata.domain,
          tags: metadata.tags,
        },
      },
    ],
  });
}
