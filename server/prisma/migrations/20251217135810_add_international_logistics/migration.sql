-- CreateTable
CREATE TABLE "international_logistics" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "batch_no" TEXT NOT NULL,
    "box_no" TEXT NOT NULL,
    "length" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2) NOT NULL,
    "freight_rate" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "international_logistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "international_logistics_purchase_order_id_idx" ON "international_logistics"("purchase_order_id");

-- CreateIndex
CREATE INDEX "international_logistics_batch_no_idx" ON "international_logistics"("batch_no");

-- CreateIndex
CREATE UNIQUE INDEX "international_logistics_batch_no_box_no_key" ON "international_logistics"("batch_no", "box_no");
