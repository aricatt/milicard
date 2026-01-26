-- DropIndex
DROP INDEX "anchor_profits_location_id_profit_date_key";

-- CreateIndex
CREATE INDEX "anchor_profits_location_id_profit_date_idx" ON "anchor_profits"("location_id", "profit_date");
