/*
  Warnings:

  - You are about to drop the column `location_id` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `stock_quantity` on the `inventory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[goods_id,base_id]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_location_id_fkey";

-- DropIndex
DROP INDEX "inventory_goods_id_location_id_key";

-- DropIndex
DROP INDEX "inventory_location_id_idx";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "location_id",
DROP COLUMN "stock_quantity";

-- CreateIndex
CREATE UNIQUE INDEX "inventory_goods_id_base_id_key" ON "inventory"("goods_id", "base_id");
