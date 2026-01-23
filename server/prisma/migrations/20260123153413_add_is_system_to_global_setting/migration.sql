-- AlterTable
ALTER TABLE "global_settings" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "global_settings_is_system_idx" ON "global_settings"("is_system");
