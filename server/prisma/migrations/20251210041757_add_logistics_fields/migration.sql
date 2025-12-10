-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "logistics_company" TEXT,
ADD COLUMN     "logistics_company_code" TEXT,
ADD COLUMN     "logistics_data" JSONB,
ADD COLUMN     "logistics_state" INTEGER,
ADD COLUMN     "logistics_updated_at" TIMESTAMP(3),
ADD COLUMN     "tracking_number" TEXT;

-- CreateIndex
CREATE INDEX "purchase_orders_tracking_number_idx" ON "purchase_orders"("tracking_number");
