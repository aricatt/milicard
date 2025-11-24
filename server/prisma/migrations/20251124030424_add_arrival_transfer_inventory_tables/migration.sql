-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "arrival_records" (
    "id" TEXT NOT NULL,
    "arrival_date" DATE NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "handler_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrival_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_records" (
    "id" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "goods_id" TEXT NOT NULL,
    "source_location_id" TEXT NOT NULL,
    "destination_location_id" TEXT NOT NULL,
    "handler_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "goods_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "handler_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "opening_stock_box" INTEGER NOT NULL DEFAULT 0,
    "opening_stock_pack" INTEGER NOT NULL DEFAULT 0,
    "opening_stock_piece" INTEGER NOT NULL DEFAULT 0,
    "closing_stock_box" INTEGER NOT NULL DEFAULT 0,
    "closing_stock_pack" INTEGER NOT NULL DEFAULT 0,
    "closing_stock_piece" INTEGER NOT NULL DEFAULT 0,
    "arrival_box" INTEGER NOT NULL DEFAULT 0,
    "arrival_pack" INTEGER NOT NULL DEFAULT 0,
    "arrival_piece" INTEGER NOT NULL DEFAULT 0,
    "transfer_in_box" INTEGER NOT NULL DEFAULT 0,
    "transfer_in_pack" INTEGER NOT NULL DEFAULT 0,
    "transfer_in_piece" INTEGER NOT NULL DEFAULT 0,
    "transfer_out_box" INTEGER NOT NULL DEFAULT 0,
    "transfer_out_pack" INTEGER NOT NULL DEFAULT 0,
    "transfer_out_piece" INTEGER NOT NULL DEFAULT 0,
    "consumption_box" INTEGER NOT NULL DEFAULT 0,
    "consumption_pack" INTEGER NOT NULL DEFAULT 0,
    "consumption_piece" INTEGER NOT NULL DEFAULT 0,
    "consumption_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arrival_records_arrival_date_idx" ON "arrival_records"("arrival_date");

-- CreateIndex
CREATE INDEX "arrival_records_purchase_order_id_idx" ON "arrival_records"("purchase_order_id");

-- CreateIndex
CREATE INDEX "arrival_records_goods_id_idx" ON "arrival_records"("goods_id");

-- CreateIndex
CREATE INDEX "arrival_records_location_id_idx" ON "arrival_records"("location_id");

-- CreateIndex
CREATE INDEX "arrival_records_handler_id_idx" ON "arrival_records"("handler_id");

-- CreateIndex
CREATE INDEX "arrival_records_base_id_idx" ON "arrival_records"("base_id");

-- CreateIndex
CREATE INDEX "arrival_records_created_at_idx" ON "arrival_records"("created_at");

-- CreateIndex
CREATE INDEX "transfer_records_transfer_date_idx" ON "transfer_records"("transfer_date");

-- CreateIndex
CREATE INDEX "transfer_records_goods_id_idx" ON "transfer_records"("goods_id");

-- CreateIndex
CREATE INDEX "transfer_records_source_location_id_idx" ON "transfer_records"("source_location_id");

-- CreateIndex
CREATE INDEX "transfer_records_destination_location_id_idx" ON "transfer_records"("destination_location_id");

-- CreateIndex
CREATE INDEX "transfer_records_handler_id_idx" ON "transfer_records"("handler_id");

-- CreateIndex
CREATE INDEX "transfer_records_base_id_idx" ON "transfer_records"("base_id");

-- CreateIndex
CREATE INDEX "transfer_records_status_idx" ON "transfer_records"("status");

-- CreateIndex
CREATE INDEX "transfer_records_created_at_idx" ON "transfer_records"("created_at");

-- CreateIndex
CREATE INDEX "inventory_ledger_date_idx" ON "inventory_ledger"("date");

-- CreateIndex
CREATE INDEX "inventory_ledger_goods_id_idx" ON "inventory_ledger"("goods_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_location_id_idx" ON "inventory_ledger"("location_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_handler_id_idx" ON "inventory_ledger"("handler_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_base_id_idx" ON "inventory_ledger"("base_id");

-- CreateIndex
CREATE INDEX "inventory_ledger_created_at_idx" ON "inventory_ledger"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ledger_date_goods_id_location_id_handler_id_key" ON "inventory_ledger"("date", "goods_id", "location_id", "handler_id");

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_records" ADD CONSTRAINT "arrival_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_source_location_id_fkey" FOREIGN KEY ("source_location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_destination_location_id_fkey" FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_records" ADD CONSTRAINT "transfer_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
