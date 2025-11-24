/*
  Warnings:

  - You are about to drop the column `purchase_price` on the `goods_bases` table. All the data in the column will be lost.
  - You are about to drop the column `retail_price` on the `goods_bases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "goods_bases" DROP COLUMN "purchase_price",
DROP COLUMN "retail_price",
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- AddForeignKey
ALTER TABLE "goods_bases" ADD CONSTRAINT "goods_bases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_bases" ADD CONSTRAINT "goods_bases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
