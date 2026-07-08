CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "item_embeddings" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_embeddings_item_id_chunk_index_key"
    ON "item_embeddings"("item_id", "chunk_index");

CREATE INDEX "item_embeddings_user_id_idx" ON "item_embeddings"("user_id");
CREATE INDEX "item_embeddings_item_id_idx" ON "item_embeddings"("item_id");

CREATE INDEX "item_embeddings_embedding_hnsw_idx"
    ON "item_embeddings"
    USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "item_embeddings"
    ADD CONSTRAINT "item_embeddings_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "library_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
