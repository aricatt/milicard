/*
  Warnings:

  - You are about to drop the column `logistics_company` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `logistics_company_code` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `logistics_data` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `logistics_state` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `logistics_updated_at` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `tracking_number` on the `purchase_orders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "purchase_orders_tracking_number_idx";

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "logistics_company",
DROP COLUMN "logistics_company_code",
DROP COLUMN "logistics_data",
DROP COLUMN "logistics_state",
DROP COLUMN "logistics_updated_at",
DROP COLUMN "tracking_number";

-- CreateTable
CREATE TABLE "purchase_order_logistics" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "logistics_state" INTEGER,
    "logistics_company" TEXT,
    "logistics_company_code" TEXT,
    "logistics_data" JSONB,
    "logistics_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_logistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_order_logistics_purchase_order_id_idx" ON "purchase_order_logistics"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_logistics_tracking_number_idx" ON "purchase_order_logistics"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_logistics_purchase_order_id_tracking_number_key" ON "purchase_order_logistics"("purchase_order_id", "tracking_number");
