-- AlterTable
ALTER TABLE "arrival_records" ADD COLUMN     "cny_logistics_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "logistics_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
