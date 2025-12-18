-- AlterEnum
ALTER TYPE "PersonnelRole" ADD VALUE 'OPERATOR';

-- AlterTable
ALTER TABLE "personnel" ADD COLUMN     "operator_id" TEXT;

-- CreateIndex
CREATE INDEX "personnel_operator_id_idx" ON "personnel"("operator_id");
