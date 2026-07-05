-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ClassificationSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING_DISPATCH', 'QUEUED', 'DISPATCH_FAILED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_norm" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "client" TEXT NOT NULL DEFAULT 'web',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "PlanCode" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_periods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "items_added" INTEGER NOT NULL DEFAULT 0,
    "ai_abstracts_used" INTEGER NOT NULL DEFAULT 0,
    "semantic_searches" INTEGER NOT NULL DEFAULT 0,
    "reprocess_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_norm" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "favicon_letter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "custom_title" TEXT,
    "extracted_title" TEXT,
    "description" TEXT,
    "personal_note" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "bookshelf" TEXT,
    "bookshelf_source" "ClassificationSource",
    "ai_abstract" TEXT,
    "readable_content" TEXT,
    "language" TEXT,
    "author" TEXT,
    "published_date" TEXT,
    "in_reading_list" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" TEXT,
    "partial_reason" TEXT,
    "processed_at" TIMESTAMP(3),
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_tags" (
    "item_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "source" "ClassificationSource" NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "item_tags_pkey" PRIMARY KEY ("item_id","tag")
);

-- CreateTable
CREATE TABLE "toc_entries" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "anchor" TEXT NOT NULL,
    "source" "ClassificationSource" NOT NULL DEFAULT 'AUTO',
    "order" INTEGER NOT NULL,

    CONSTRAINT "toc_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "dispatch_status" "DispatchStatus" NOT NULL DEFAULT 'PENDING_DISPATCH',
    "execution_status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_norm_key" ON "users"("email_norm");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_periods_user_id_period_key" ON "usage_periods"("user_id", "period");

-- CreateIndex
CREATE INDEX "library_items_user_id_archived_deleted_at_idx" ON "library_items"("user_id", "archived", "deleted_at");

-- CreateIndex
CREATE INDEX "library_items_user_id_status_idx" ON "library_items"("user_id", "status");

-- CreateIndex
CREATE INDEX "library_items_user_id_in_reading_list_idx" ON "library_items"("user_id", "in_reading_list");

-- CreateIndex
CREATE UNIQUE INDEX "library_items_user_id_url_norm_key" ON "library_items"("user_id", "url_norm");

-- CreateIndex
CREATE INDEX "item_tags_tag_idx" ON "item_tags"("tag");

-- CreateIndex
CREATE INDEX "toc_entries_item_id_order_idx" ON "toc_entries"("item_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "processing_jobs_item_id_key" ON "processing_jobs"("item_id");

-- CreateIndex
CREATE INDEX "processing_jobs_dispatch_status_idx" ON "processing_jobs"("dispatch_status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toc_entries" ADD CONSTRAINT "toc_entries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
