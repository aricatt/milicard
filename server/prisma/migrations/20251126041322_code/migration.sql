/*
  Warnings:

  - The primary key for the `locations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `locations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `target_location_id` column on the `purchase_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `location_id` on the `anchor_profits` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `arrival_orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `arrival_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `inventory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `inventory_ledger` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `stock_consumption` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `stock_out_orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `from_location_id` on the `transfer_orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `to_location_id` on the `transfer_orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `source_location_id` on the `transfer_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `destination_location_id` on the `transfer_records` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `location_id` on the `user_locations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "anchor_profits" DROP CONSTRAINT "anchor_profits_location_id_fkey";

-- DropForeignKey
ALTER TABLE "arrival_orders" DROP CONSTRAINT "arrival_orders_location_id_fkey";

-- DropForeignKey
ALTER TABLE "arrival_records" DROP CONSTRAINT "arrival_records_location_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_location_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory_ledger" DROP CONSTRAINT "inventory_ledger_location_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_target_location_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_consumption" DROP CONSTRAINT "stock_consumption_location_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_out_orders" DROP CONSTRAINT "stock_out_orders_location_id_fkey";

-- DropForeignKey
ALTER TABLE "transfer_orders" DROP CONSTRAINT "transfer_orders_from_location_id_fkey";

-- DropForeignKey
ALTER TABLE "transfer_orders" DROP CONSTRAINT "transfer_orders_to_location_id_fkey";

-- DropForeignKey
ALTER TABLE "transfer_records" DROP CONSTRAINT "transfer_records_destination_location_id_fkey";

-- DropForeignKey
ALTER TABLE "transfer_records" DROP CONSTRAINT "transfer_records_source_location_id_fkey";

-- DropForeignKey
ALTER TABLE "user_locations" DROP CONSTRAINT "user_locations_location_id_fkey";

-- AlterTable
ALTER TABLE "anchor_profits" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "arrival_orders" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "arrival_records" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "inventory_ledger" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "locations" DROP CONSTRAINT "locations_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "target_location_id",
ADD COLUMN     "target_location_id" INTEGER;

-- AlterTable
ALTER TABLE "stock_consumption" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "stock_out_orders" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transfer_orders" DROP COLUMN "from_location_id",
ADD COLUMN     "from_location_id" INTEGER NOT NULL,
DROP COLUMN "to_location_id",
ADD COLUMN     "to_location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transfer_records" DROP COLUMN "source_location_id",
ADD COLUMN     "source_location_id" INTEGER NOT NULL,
DROP COLUMN "destination_location_id",
ADD COLUMN     "destination_location_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_locations" DROP COLUMN "location_id",
ADD COLUMN     "location_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "anchor_profits_location_id_idx" ON "anchor_profits"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_profits_location_id_profit_date_key" ON "anchor_profits"("location_id", "profit_date");

-- CreateIndex
CREATE INDEX "arrival_orders_location_id_idx" ON "arrival_orders"("location_id");

-- CreateIndex
CREATE INDEX "arrival_records_location_id_idx" ON "arrival_records"("location_id");

-- CreateIndex
CREATE INDEX "inventory_location_id_idx" ON "inventory"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_goods_id_location_id_key" ON "inventory"("goods_id", "location_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_location_id_idx" ON "inventory_ledger"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ledger_date_goods_id_location_id_handler_id_key" ON "inventory_ledger"("date", "goods_id", "location_id", "handler_id");

-- CreateIndex
CREATE INDEX "purchase_orders_target_location_id_idx" ON "purchase_orders"("target_location_id");

-- CreateIndex
CREATE INDEX "stock_consumption_location_id_idx" ON "stock_consumption"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_consumption_location_id_goods_id_consumption_date_key" ON "stock_consumption"("location_id", "goods_id", "consumption_date");

-- CreateIndex
CREATE INDEX "stock_out_orders_location_id_idx" ON "stock_out_orders"("location_id");

-- CreateIndex
CREATE INDEX "transfer_orders_from_location_id_idx" ON "transfer_orders"("from_location_id");

-- CreateIndex
CREATE INDEX "transfer_orders_to_location_id_idx" ON "transfer_orders"("to_location_id");

-- CreateIndex
CREATE INDEX "transfer_records_source_location_id_idx" ON "transfer_records"("source_location_id");

-- CreateIndex
CREATE INDEX "transfer_records_destination_location_id_idx" ON "transfer_records"("destination_location_id");

-- CreateIndex
CREATE INDEX "user_locations_location_id_idx" ON "user_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_user_id_location_id_key" ON "user_locations"("user_id", "location_id");

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_target_location_id_fkey" FOREIGN KEY ("target_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_orders" ADD CONSTRAINT "arrival_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_orders" ADD CONSTRAINT "stock_out_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchor_profits" ADD CONSTRAINT "anchor_profits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "arrival_orders_arrival_no_idx" RENAME TO "arrival_orders_code_idx";

-- RenameIndex
ALTER INDEX "arrival_orders_arrival_no_key" RENAME TO "arrival_orders_code_key";

-- RenameIndex
ALTER INDEX "distribution_orders_order_no_idx" RENAME TO "distribution_orders_code_idx";

-- RenameIndex
ALTER INDEX "distribution_orders_order_no_key" RENAME TO "distribution_orders_code_key";

-- RenameIndex
ALTER INDEX "purchase_orders_order_no_idx" RENAME TO "purchase_orders_code_idx";

-- RenameIndex
ALTER INDEX "purchase_orders_order_no_key" RENAME TO "purchase_orders_code_key";

-- RenameIndex
ALTER INDEX "stock_out_orders_out_no_idx" RENAME TO "stock_out_orders_code_idx";

-- RenameIndex
ALTER INDEX "stock_out_orders_out_no_key" RENAME TO "stock_out_orders_code_key";

-- RenameIndex
ALTER INDEX "transfer_orders_transfer_no_idx" RENAME TO "transfer_orders_code_idx";

-- RenameIndex
ALTER INDEX "transfer_orders_transfer_no_key" RENAME TO "transfer_orders_code_key";
