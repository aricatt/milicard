-- 修改locations表的id从TEXT改为INTEGER自增

-- 1. 删除所有外键约束
ALTER TABLE "user_locations" DROP CONSTRAINT IF EXISTS "user_locations_location_id_fkey";
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_location_id_fkey";
ALTER TABLE "purchase_orders" DROP CONSTRAINT IF EXISTS "purchase_orders_target_location_id_fkey";
ALTER TABLE "arrival_orders" DROP CONSTRAINT IF EXISTS "arrival_orders_location_id_fkey";
ALTER TABLE "transfer_orders" DROP CONSTRAINT IF EXISTS "transfer_orders_from_location_id_fkey";
ALTER TABLE "transfer_orders" DROP CONSTRAINT IF EXISTS "transfer_orders_to_location_id_fkey";
ALTER TABLE "stock_consumptions" DROP CONSTRAINT IF EXISTS "stock_consumptions_location_id_fkey";
ALTER TABLE "stock_out_orders" DROP CONSTRAINT IF EXISTS "stock_out_orders_location_id_fkey";
ALTER TABLE "anchor_profits" DROP CONSTRAINT IF EXISTS "anchor_profits_location_id_fkey";
ALTER TABLE "arrival_records" DROP CONSTRAINT IF EXISTS "arrival_records_location_id_fkey";
ALTER TABLE "transfer_records" DROP CONSTRAINT IF EXISTS "transfer_records_source_location_id_fkey";
ALTER TABLE "transfer_records" DROP CONSTRAINT IF EXISTS "transfer_records_destination_location_id_fkey";
ALTER TABLE "inventory_ledgers" DROP CONSTRAINT IF EXISTS "inventory_ledgers_location_id_fkey";

-- 2. 清空locations表
TRUNCATE TABLE "locations" CASCADE;

-- 3. 删除旧的id列
ALTER TABLE "locations" DROP COLUMN "id";

-- 4. 添加新的自增id列
ALTER TABLE "locations" ADD COLUMN "id" SERIAL PRIMARY KEY;

-- 5. 修改所有引用表的locationId字段类型
ALTER TABLE "user_locations" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "inventory" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "purchase_orders" ALTER COLUMN "target_location_id" TYPE INTEGER;
ALTER TABLE "arrival_orders" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "transfer_orders" ALTER COLUMN "from_location_id" TYPE INTEGER;
ALTER TABLE "transfer_orders" ALTER COLUMN "to_location_id" TYPE INTEGER;
ALTER TABLE "stock_consumptions" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "stock_out_orders" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "anchor_profits" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "arrival_records" ALTER COLUMN "location_id" TYPE INTEGER;
ALTER TABLE "transfer_records" ALTER COLUMN "source_location_id" TYPE INTEGER;
ALTER TABLE "transfer_records" ALTER COLUMN "destination_location_id" TYPE INTEGER;
ALTER TABLE "inventory_ledgers" ALTER COLUMN "location_id" TYPE INTEGER;

-- 6. 重新添加外键约束
ALTER TABLE "user_locations" 
  ADD CONSTRAINT "user_locations_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE;

ALTER TABLE "inventory" 
  ADD CONSTRAINT "inventory_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE;

ALTER TABLE "purchase_orders" 
  ADD CONSTRAINT "purchase_orders_target_location_id_fkey" 
  FOREIGN KEY ("target_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "arrival_orders" 
  ADD CONSTRAINT "arrival_orders_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "transfer_orders" 
  ADD CONSTRAINT "transfer_orders_from_location_id_fkey" 
  FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "transfer_orders" 
  ADD CONSTRAINT "transfer_orders_to_location_id_fkey" 
  FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "stock_consumptions" 
  ADD CONSTRAINT "stock_consumptions_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "stock_out_orders" 
  ADD CONSTRAINT "stock_out_orders_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "anchor_profits" 
  ADD CONSTRAINT "anchor_profits_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "arrival_records" 
  ADD CONSTRAINT "arrival_records_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "transfer_records" 
  ADD CONSTRAINT "transfer_records_source_location_id_fkey" 
  FOREIGN KEY ("source_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "transfer_records" 
  ADD CONSTRAINT "transfer_records_destination_location_id_fkey" 
  FOREIGN KEY ("destination_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;

ALTER TABLE "inventory_ledgers" 
  ADD CONSTRAINT "inventory_ledgers_location_id_fkey" 
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT;
