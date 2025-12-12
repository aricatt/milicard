/*
  Refactor Goods table to global + local settings model
  
  This migration:
  1. Creates the goods_local_settings table
  2. Migrates existing data from goods to goods_local_settings
  3. Removes base-specific columns from goods table
*/

-- CreateTable (先创建新表)
CREATE TABLE "goods_local_settings" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "retail_price" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2),
    "pack_price" DECIMAL(12,2),
    "alias" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_local_settings_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from goods to goods_local_settings
INSERT INTO "goods_local_settings" ("id", "goods_id", "base_id", "retail_price", "purchase_price", "pack_price", "alias", "is_active", "created_at", "updated_at")
SELECT 
    gen_random_uuid()::text,
    "id",
    "base_id",
    "retail_price",
    "purchase_price",
    "pack_price",
    "alias",
    "is_active",
    "created_at",
    "updated_at"
FROM "goods"
WHERE "base_id" IS NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "goods_base_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "goods_base_id_is_active_idx";

-- AlterTable (移除基地相关字段)
ALTER TABLE "goods" DROP COLUMN IF EXISTS "alias",
DROP COLUMN IF EXISTS "base_id",
DROP COLUMN IF EXISTS "pack_price",
DROP COLUMN IF EXISTS "purchase_price",
DROP COLUMN IF EXISTS "retail_price";

-- CreateIndex
CREATE INDEX "goods_local_settings_goods_id_idx" ON "goods_local_settings"("goods_id");

-- CreateIndex
CREATE INDEX "goods_local_settings_base_id_idx" ON "goods_local_settings"("base_id");

-- CreateIndex
CREATE INDEX "goods_local_settings_is_active_idx" ON "goods_local_settings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "goods_local_settings_goods_id_base_id_key" ON "goods_local_settings"("goods_id", "base_id");
