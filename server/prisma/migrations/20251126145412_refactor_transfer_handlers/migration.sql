/*
  Warnings:

  - You are about to drop the column `handler_id` on the `transfer_records` table. All the data in the column will be lost.
  - Added the required column `destination_handler_id` to the `transfer_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_handler_id` to the `transfer_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "transfer_records" DROP CONSTRAINT "transfer_records_handler_id_fkey";

-- DropIndex
DROP INDEX "transfer_records_handler_id_idx";

-- AlterTable
ALTER TABLE "transfer_records" DROP COLUMN "handler_id",
ADD COLUMN     "destination_handler_id" TEXT NOT NULL,
ADD COLUMN     "source_handler_id" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- CreateIndex
CREATE INDEX "transfer_records_source_handler_id_idx" ON "transfer_records"("source_handler_id");

-- CreateIndex
CREATE INDEX "transfer_records_destination_handler_id_idx" ON "transfer_records"("destination_handler_id");

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_destination_handler_id_fkey" FOREIGN KEY ("destination_handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_source_handler_id_fkey" FOREIGN KEY ("source_handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
