import OpenAI from "openai";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { withRateLimitRetry } from "./openai-retry";

const CHUNK_SIZE = 4_000;
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS_PER_ITEM = 12;

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length && chunks.length < MAX_CHUNKS_PER_ITEM) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks.filter(Boolean);
}

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export async function embedAndUpsert(
  openai: OpenAI,
  prisma: PrismaService,
  opts: { embeddingModel: string; dimension: number },
  itemId: string,
  text: string,
  metadata: {
    userId: string;
    title: string | null;
  },
): Promise<void> {
  const chunks = chunkText(text);
  if (!chunks.length) return;

  const inputs = chunks.map((chunk) => [metadata.title, chunk].filter(Boolean).join("\n\n"));
  const embeddingResponse = await withRateLimitRetry(() =>
    openai.embeddings.create({
      model: opts.embeddingModel,
      input: inputs,
      dimensions: opts.dimension,
    }),
  );

  const vectors = embeddingResponse.data.map((entry) => entry.embedding);
  if (vectors.length !== chunks.length || vectors.some((vector) => !vector?.length)) {
    throw new Error("OpenAI embedding response did not include all chunk vectors");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM "item_embeddings" WHERE "item_id" = ${itemId}`;

    for (const [index, vector] of vectors.entries()) {
      await tx.$executeRaw`
        INSERT INTO "item_embeddings" ("id", "item_id", "user_id", "chunk_index", "text", "embedding")
        VALUES (
          ${randomUUID()},
          ${itemId},
          ${metadata.userId},
          ${index},
          ${chunks[index]},
          ${vectorLiteral(vector)}::vector
        )
      `;
    }
  });
}
