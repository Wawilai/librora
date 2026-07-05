-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('AUTO_ARCHIVE_AFTER_DAYS', 'AUTO_TAG_BY_DOMAIN');

-- CreateTable
CREATE TABLE "bookshelf_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookshelf_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookshelf_rules_user_id_idx" ON "bookshelf_rules"("user_id");

-- AddForeignKey
ALTER TABLE "bookshelf_rules" ADD CONSTRAINT "bookshelf_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

