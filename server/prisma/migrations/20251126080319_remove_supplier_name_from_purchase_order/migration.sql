/*
  Warnings:

  - You are about to drop the column `supplier_name` on the `purchase_orders` table. All the data in the column will be lost.
  - Made the column `supplier_id` on table `purchase_orders` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_supplier_id_fkey";

-- DropIndex
DROP INDEX "purchase_orders_supplier_name_idx";

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "supplier_name",
ALTER COLUMN "supplier_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
