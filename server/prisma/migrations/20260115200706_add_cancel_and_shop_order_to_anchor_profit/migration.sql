-- AlterTable
-- 添加取消订单金额和店铺订单金额字段到主播利润表
ALTER TABLE "anchor_profits" 
ADD COLUMN "cancel_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "shop_order_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 注释说明
COMMENT ON COLUMN "anchor_profits"."cancel_order_amount" IS '取消订单金额：前端GMV包含但实际未发货的订单';
COMMENT ON COLUMN "anchor_profits"."shop_order_amount" IS '店铺订单金额：非直播间下单，前端GMV不显示但实际收到款';
