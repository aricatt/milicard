-- AlterTable
ALTER TABLE "users" ADD COLUMN     "has_global_base_access" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_has_global_base_access_idx" ON "users"("has_global_base_access");
