-- AlterTable: Add currency and language columns to bases table
ALTER TABLE "bases" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE "bases" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'zh-CN';

-- AlterEnum: Add MAIN_WAREHOUSE to LocationType
ALTER TYPE "LocationType" ADD VALUE IF NOT EXISTS 'MAIN_WAREHOUSE';

-- AlterTable: Add consumption_id to anchor_profits (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anchor_profits' AND column_name = 'consumption_id') THEN
        ALTER TABLE "anchor_profits" ADD COLUMN "consumption_id" TEXT;
        ALTER TABLE "anchor_profits" ADD CONSTRAINT "anchor_profits_consumption_id_key" UNIQUE ("consumption_id");
        ALTER TABLE "anchor_profits" ADD CONSTRAINT "anchor_profits_consumption_id_fkey" FOREIGN KEY ("consumption_id") REFERENCES "stock_consumptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX "anchor_profits_consumption_id_idx" ON "anchor_profits"("consumption_id");
    END IF;
END $$;
