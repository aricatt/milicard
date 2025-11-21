-- DropForeignKey
ALTER TABLE "personnel" DROP CONSTRAINT "personnel_created_by_fkey";

-- DropForeignKey
ALTER TABLE "personnel" DROP CONSTRAINT "personnel_updated_by_fkey";

-- AlterTable
ALTER TABLE "personnel" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
