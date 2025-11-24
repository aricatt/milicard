/*
  Warnings:

  - Made the column `manufacturer` on table `goods` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "goods" ALTER COLUMN "retail_price" DROP DEFAULT,
ALTER COLUMN "purchase_price" DROP NOT NULL,
ALTER COLUMN "purchase_price" DROP DEFAULT,
ALTER COLUMN "pack_per_box" DROP DEFAULT,
ALTER COLUMN "piece_per_pack" DROP DEFAULT,
ALTER COLUMN "manufacturer" SET NOT NULL;
