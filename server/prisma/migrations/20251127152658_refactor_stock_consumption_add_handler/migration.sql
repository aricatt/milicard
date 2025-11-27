/*
  Warnings:

  - You are about to drop the column `arrival_quantity` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `closing_stock` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `consumption` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `consumption_unit_price` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `consumption_value` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `opening_stock` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `stock_out` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_in` on the `stock_consumption` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_out` on the `stock_consumption` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[consumption_date,goods_id,location_id,handler_id]` on the table `stock_consumption` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `base_id` to the `stock_consumption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `handler_id` to the `stock_consumption` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "stock_consumption_location_id_goods_id_consumption_date_key";

-- AlterTable
ALTER TABLE "stock_consumption" DROP COLUMN "arrival_quantity",
DROP COLUMN "closing_stock",
DROP COLUMN "consumption",
DROP COLUMN "consumption_unit_price",
DROP COLUMN "consumption_value",
DROP COLUMN "opening_stock",
DROP COLUMN "stock_out",
DROP COLUMN "transfer_in",
DROP COLUMN "transfer_out",
ADD COLUMN     "base_id" INTEGER NOT NULL,
ADD COLUMN     "box_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handler_id" TEXT NOT NULL,
ADD COLUMN     "pack_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "piece_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_by" TEXT;

-- CreateIndex
CREATE INDEX "stock_consumption_base_id_idx" ON "stock_consumption"("base_id");

-- CreateIndex
CREATE INDEX "stock_consumption_handler_id_idx" ON "stock_consumption"("handler_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_consumption_consumption_date_goods_id_location_id_han_key" ON "stock_consumption"("consumption_date", "goods_id", "location_id", "handler_id");

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
