/*
  Warnings:

  - You are about to drop the `goods_bases` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `base_id` to the `goods` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "goods_bases" DROP CONSTRAINT "goods_bases_base_id_fkey";

-- DropForeignKey
ALTER TABLE "goods_bases" DROP CONSTRAINT "goods_bases_created_by_fkey";

-- DropForeignKey
ALTER TABLE "goods_bases" DROP CONSTRAINT "goods_bases_goods_id_fkey";

-- DropForeignKey
ALTER TABLE "goods_bases" DROP CONSTRAINT "goods_bases_updated_by_fkey";

-- AlterTable
ALTER TABLE "goods" ADD COLUMN     "base_id" INTEGER NOT NULL,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- DropTable
DROP TABLE "goods_bases";

-- CreateIndex
CREATE INDEX "goods_base_id_idx" ON "goods"("base_id");

-- CreateIndex
CREATE INDEX "goods_base_id_is_active_idx" ON "goods"("base_id", "is_active");

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
