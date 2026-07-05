-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ARTICLE', 'GOOGLE_DOC');

-- AlterTable
ALTER TABLE "library_items" ADD COLUMN     "source_type" "SourceType" NOT NULL DEFAULT 'ARTICLE';
