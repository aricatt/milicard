-- CreateEnum
CREATE TYPE "StockOutType" AS ENUM ('POINT_ORDER', 'TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "BaseType" AS ENUM ('LIVE_BASE', 'OFFLINE_REGION');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'LIVE_ROOM', 'MAIN_WAREHOUSE');

-- CreateEnum
CREATE TYPE "PersonnelRole" AS ENUM ('ANCHOR', 'WAREHOUSE_KEEPER');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PointOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "default_base_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "description_key" TEXT,
    "name_key" TEXT,
    "level" INTEGER NOT NULL DEFAULT 99,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "base_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "base_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "retail_price" DECIMAL(12,2) NOT NULL,
    "purchase_price" DECIMAL(12,2),
    "box_quantity" INTEGER NOT NULL DEFAULT 1,
    "pack_per_box" INTEGER NOT NULL,
    "piece_per_pack" INTEGER NOT NULL,
    "image_url" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "alias" TEXT,
    "manufacturer" TEXT NOT NULL,
    "pack_price" DECIMAL(12,2),
    "base_id" INTEGER NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "average_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "actual_amount" DECIMAL(12,2),
    "target_location_id" INTEGER,
    "supplier_id" TEXT NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_pieces" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrival_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "arrival_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "arrival_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrival_order_items" (
    "id" TEXT NOT NULL,
    "arrival_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "arrival_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_location_id" INTEGER NOT NULL,
    "to_location_id" INTEGER NOT NULL,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_items" (
    "id" TEXT NOT NULL,
    "transfer_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "transfer_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_consumption" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "consumption_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "location_id" INTEGER NOT NULL,
    "base_id" INTEGER NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "handler_id" TEXT NOT NULL,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_by" TEXT,
    "closing_box_qty" INTEGER NOT NULL DEFAULT 0,
    "closing_pack_qty" INTEGER NOT NULL DEFAULT 0,
    "closing_piece_qty" INTEGER NOT NULL DEFAULT 0,
    "opening_box_qty" INTEGER NOT NULL DEFAULT 0,
    "opening_pack_qty" INTEGER NOT NULL DEFAULT 0,
    "opening_piece_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price_per_box" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "stock_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_outs" (
    "id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "goods_id" TEXT NOT NULL,
    "type" "StockOutType" NOT NULL DEFAULT 'MANUAL',
    "target_name" TEXT,
    "related_order_id" TEXT,
    "related_order_code" TEXT,
    "location_id" INTEGER NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anchor_profits" (
    "id" TEXT NOT NULL,
    "profit_date" DATE NOT NULL,
    "gmv_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "offline_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "consumption_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ad_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platform_fee_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "platform_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "daily_sales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "location_id" INTEGER NOT NULL,
    "consumption_id" TEXT,

    CONSTRAINT "anchor_profits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_payments" (
    "id" TEXT NOT NULL,
    "payable_id" TEXT NOT NULL,
    "payment_amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "namespace" TEXT,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_reviews" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casbin_rule" (
    "id" SERIAL NOT NULL,
    "ptype" VARCHAR(100) NOT NULL,
    "v0" VARCHAR(100) NOT NULL DEFAULT '',
    "v1" VARCHAR(100) NOT NULL DEFAULT '',
    "v2" VARCHAR(100) NOT NULL DEFAULT '',
    "v3" VARCHAR(100),
    "v4" VARCHAR(100),
    "v5" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casbin_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bases" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "type" "BaseType" NOT NULL DEFAULT 'LIVE_BASE',

    CONSTRAINT "bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_number" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_bases" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "payment_terms" TEXT,
    "delivery_terms" TEXT,
    "credit_limit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personnel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PersonnelRole" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "base_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrival_records" (
    "id" TEXT NOT NULL,
    "arrival_date" DATE NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
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
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "arrival_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_records" (
    "id" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "goods_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_location_id" INTEGER NOT NULL,
    "destination_location_id" INTEGER NOT NULL,
    "destination_handler_id" TEXT NOT NULL,
    "source_handler_id" TEXT NOT NULL,

    CONSTRAINT "transfer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "goods_id" TEXT NOT NULL,
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
    "location_id" INTEGER NOT NULL,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "base_id" INTEGER NOT NULL,
    "owner_id" TEXT,
    "dealer_id" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_goods" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "max_box_quantity" INTEGER,
    "max_pack_quantity" INTEGER,
    "unit_price" DECIMAL(12,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "order_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PointOrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_notes" TEXT,
    "shipping_address" TEXT,
    "shipping_phone" TEXT,
    "tracking_number" TEXT,
    "delivery_person" TEXT,
    "delivery_phone" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "customer_notes" TEXT,
    "staff_notes" TEXT,
    "created_by" TEXT NOT NULL,
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_order_items" (
    "id" TEXT NOT NULL,
    "point_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "actual_box_qty" INTEGER,
    "actual_pack_qty" INTEGER,
    "notes" TEXT,

    CONSTRAINT "point_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_inventory" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "box_quantity" INTEGER NOT NULL DEFAULT 0,
    "pack_quantity" INTEGER NOT NULL DEFAULT 0,
    "piece_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_profits" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_sales_amount" DECIMAL(12,2) NOT NULL,
    "total_cost_amount" DECIMAL(12,2) NOT NULL,
    "profit_amount" DECIMAL(12,2) NOT NULL,
    "profit_rate" DECIMAL(8,4) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_profits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casbin_rules" (
    "id" SERIAL NOT NULL,
    "ptype" TEXT NOT NULL,
    "v0" TEXT,
    "v1" TEXT,
    "v2" TEXT,
    "v3" TEXT,
    "v4" TEXT,
    "v5" TEXT,

    CONSTRAINT "casbin_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_permission_rules" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value_type" TEXT NOT NULL,
    "fixed_value" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_permission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_default_base_id_idx" ON "users"("default_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_key_idx" ON "roles"("name_key");

-- CreateIndex
CREATE INDEX "roles_is_system_idx" ON "roles"("is_system");

-- CreateIndex
CREATE INDEX "roles_level_idx" ON "roles"("level");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_expires_at_idx" ON "user_roles"("expires_at");

-- CreateIndex
CREATE INDEX "user_roles_is_active_idx" ON "user_roles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_is_active_key" ON "user_roles"("user_id", "role_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_name_idx" ON "locations"("name");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");

-- CreateIndex
CREATE INDEX "user_locations_user_id_idx" ON "user_locations"("user_id");

-- CreateIndex
CREATE INDEX "user_locations_location_id_idx" ON "user_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_user_id_location_id_key" ON "user_locations"("user_id", "location_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "goods_code_key" ON "goods"("code");

-- CreateIndex
CREATE INDEX "goods_code_idx" ON "goods"("code");

-- CreateIndex
CREATE INDEX "goods_name_idx" ON "goods"("name");

-- CreateIndex
CREATE INDEX "goods_base_id_idx" ON "goods"("base_id");

-- CreateIndex
CREATE INDEX "goods_is_active_idx" ON "goods"("is_active");

-- CreateIndex
CREATE INDEX "goods_base_id_is_active_idx" ON "goods"("base_id", "is_active");

-- CreateIndex
CREATE INDEX "inventory_goods_id_idx" ON "inventory"("goods_id");

-- CreateIndex
CREATE INDEX "inventory_base_id_idx" ON "inventory"("base_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_goods_id_base_id_key" ON "inventory"("goods_id", "base_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders"("code");

-- CreateIndex
CREATE INDEX "purchase_orders_code_idx" ON "purchase_orders"("code");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_target_location_id_idx" ON "purchase_orders"("target_location_id");

-- CreateIndex
CREATE INDEX "purchase_orders_base_id_idx" ON "purchase_orders"("base_id");

-- CreateIndex
CREATE INDEX "purchase_orders_purchase_date_idx" ON "purchase_orders"("purchase_date");

-- CreateIndex
CREATE INDEX "purchase_orders_created_by_idx" ON "purchase_orders"("created_by");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_goods_id_idx" ON "purchase_order_items"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "arrival_orders_code_key" ON "arrival_orders"("code");

-- CreateIndex
CREATE INDEX "arrival_orders_code_idx" ON "arrival_orders"("code");

-- CreateIndex
CREATE INDEX "arrival_orders_purchase_order_id_idx" ON "arrival_orders"("purchase_order_id");

-- CreateIndex
CREATE INDEX "arrival_orders_location_id_idx" ON "arrival_orders"("location_id");

-- CreateIndex
CREATE INDEX "arrival_orders_arrival_date_idx" ON "arrival_orders"("arrival_date");

-- CreateIndex
CREATE INDEX "arrival_order_items_arrival_order_id_idx" ON "arrival_order_items"("arrival_order_id");

-- CreateIndex
CREATE INDEX "arrival_order_items_goods_id_idx" ON "arrival_order_items"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_orders_code_key" ON "transfer_orders"("code");

-- CreateIndex
CREATE INDEX "transfer_orders_code_idx" ON "transfer_orders"("code");

-- CreateIndex
CREATE INDEX "transfer_orders_from_location_id_idx" ON "transfer_orders"("from_location_id");

-- CreateIndex
CREATE INDEX "transfer_orders_to_location_id_idx" ON "transfer_orders"("to_location_id");

-- CreateIndex
CREATE INDEX "transfer_orders_transfer_date_idx" ON "transfer_orders"("transfer_date");

-- CreateIndex
CREATE INDEX "transfer_order_items_transfer_order_id_idx" ON "transfer_order_items"("transfer_order_id");

-- CreateIndex
CREATE INDEX "transfer_order_items_goods_id_idx" ON "transfer_order_items"("goods_id");

-- CreateIndex
CREATE INDEX "stock_consumption_base_id_idx" ON "stock_consumption"("base_id");

-- CreateIndex
CREATE INDEX "stock_consumption_location_id_idx" ON "stock_consumption"("location_id");

-- CreateIndex
CREATE INDEX "stock_consumption_goods_id_idx" ON "stock_consumption"("goods_id");

-- CreateIndex
CREATE INDEX "stock_consumption_handler_id_idx" ON "stock_consumption"("handler_id");

-- CreateIndex
CREATE INDEX "stock_consumption_consumption_date_idx" ON "stock_consumption"("consumption_date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_consumption_consumption_date_goods_id_location_id_han_key" ON "stock_consumption"("consumption_date", "goods_id", "location_id", "handler_id");

-- CreateIndex
CREATE INDEX "stock_outs_base_id_idx" ON "stock_outs"("base_id");

-- CreateIndex
CREATE INDEX "stock_outs_date_idx" ON "stock_outs"("date");

-- CreateIndex
CREATE INDEX "stock_outs_goods_id_idx" ON "stock_outs"("goods_id");

-- CreateIndex
CREATE INDEX "stock_outs_type_idx" ON "stock_outs"("type");

-- CreateIndex
CREATE INDEX "stock_outs_location_id_idx" ON "stock_outs"("location_id");

-- CreateIndex
CREATE INDEX "stock_outs_related_order_id_idx" ON "stock_outs"("related_order_id");

-- CreateIndex
CREATE INDEX "stock_outs_base_id_date_idx" ON "stock_outs"("base_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_profits_consumption_id_key" ON "anchor_profits"("consumption_id");

-- CreateIndex
CREATE INDEX "anchor_profits_location_id_idx" ON "anchor_profits"("location_id");

-- CreateIndex
CREATE INDEX "anchor_profits_profit_date_idx" ON "anchor_profits"("profit_date");

-- CreateIndex
CREATE INDEX "anchor_profits_consumption_id_idx" ON "anchor_profits"("consumption_id");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_profits_location_id_profit_date_key" ON "anchor_profits"("location_id", "profit_date");

-- CreateIndex
CREATE INDEX "payables_purchase_order_id_idx" ON "payables"("purchase_order_id");

-- CreateIndex
CREATE INDEX "payables_supplier_name_idx" ON "payables"("supplier_name");

-- CreateIndex
CREATE INDEX "payables_due_date_idx" ON "payables"("due_date");

-- CreateIndex
CREATE INDEX "payable_payments_payable_id_idx" ON "payable_payments"("payable_id");

-- CreateIndex
CREATE INDEX "payable_payments_payment_date_idx" ON "payable_payments"("payment_date");

-- CreateIndex
CREATE INDEX "translations_key_idx" ON "translations"("key");

-- CreateIndex
CREATE INDEX "translations_language_idx" ON "translations"("language");

-- CreateIndex
CREATE INDEX "translations_namespace_idx" ON "translations"("namespace");

-- CreateIndex
CREATE INDEX "translations_review_status_idx" ON "translations"("review_status");

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_language_key" ON "translations"("key", "language");

-- CreateIndex
CREATE INDEX "translation_reviews_translation_id_idx" ON "translation_reviews"("translation_id");

-- CreateIndex
CREATE INDEX "translation_reviews_reviewer_id_idx" ON "translation_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "translation_reviews_status_idx" ON "translation_reviews"("status");

-- CreateIndex
CREATE INDEX "idx_casbin_rule_ptype" ON "casbin_rule"("ptype");

-- CreateIndex
CREATE INDEX "idx_casbin_rule_v0" ON "casbin_rule"("v0");

-- CreateIndex
CREATE UNIQUE INDEX "casbin_rule_ptype_v0_v1_v2_v3_v4_v5_key" ON "casbin_rule"("ptype", "v0", "v1", "v2", "v3", "v4", "v5");

-- CreateIndex
CREATE UNIQUE INDEX "bases_code_key" ON "bases"("code");

-- CreateIndex
CREATE INDEX "bases_code_idx" ON "bases"("code");

-- CreateIndex
CREATE INDEX "bases_name_idx" ON "bases"("name");

-- CreateIndex
CREATE INDEX "bases_is_active_idx" ON "bases"("is_active");

-- CreateIndex
CREATE INDEX "user_bases_user_id_idx" ON "user_bases"("user_id");

-- CreateIndex
CREATE INDEX "user_bases_base_id_idx" ON "user_bases"("base_id");

-- CreateIndex
CREATE INDEX "user_bases_is_active_idx" ON "user_bases"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_bases_user_id_base_id_key" ON "user_bases"("user_id", "base_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_code_idx" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE INDEX "supplier_bases_supplier_id_idx" ON "supplier_bases"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_bases_base_id_idx" ON "supplier_bases"("base_id");

-- CreateIndex
CREATE INDEX "supplier_bases_is_active_idx" ON "supplier_bases"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_bases_supplier_id_base_id_key" ON "supplier_bases"("supplier_id", "base_id");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_code_key" ON "personnel"("code");

-- CreateIndex
CREATE INDEX "personnel_code_idx" ON "personnel"("code");

-- CreateIndex
CREATE INDEX "personnel_name_idx" ON "personnel"("name");

-- CreateIndex
CREATE INDEX "personnel_role_idx" ON "personnel"("role");

-- CreateIndex
CREATE INDEX "personnel_base_id_idx" ON "personnel"("base_id");

-- CreateIndex
CREATE INDEX "personnel_is_active_idx" ON "personnel"("is_active");

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
CREATE INDEX "transfer_records_source_handler_id_idx" ON "transfer_records"("source_handler_id");

-- CreateIndex
CREATE INDEX "transfer_records_destination_location_id_idx" ON "transfer_records"("destination_location_id");

-- CreateIndex
CREATE INDEX "transfer_records_destination_handler_id_idx" ON "transfer_records"("destination_handler_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "points_code_key" ON "points"("code");

-- CreateIndex
CREATE INDEX "points_code_idx" ON "points"("code");

-- CreateIndex
CREATE INDEX "points_name_idx" ON "points"("name");

-- CreateIndex
CREATE INDEX "points_base_id_idx" ON "points"("base_id");

-- CreateIndex
CREATE INDEX "points_owner_id_idx" ON "points"("owner_id");

-- CreateIndex
CREATE INDEX "points_dealer_id_idx" ON "points"("dealer_id");

-- CreateIndex
CREATE INDEX "points_is_active_idx" ON "points"("is_active");

-- CreateIndex
CREATE INDEX "point_goods_point_id_idx" ON "point_goods"("point_id");

-- CreateIndex
CREATE INDEX "point_goods_goods_id_idx" ON "point_goods"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_goods_point_id_goods_id_key" ON "point_goods"("point_id", "goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_orders_code_key" ON "point_orders"("code");

-- CreateIndex
CREATE INDEX "point_orders_code_idx" ON "point_orders"("code");

-- CreateIndex
CREATE INDEX "point_orders_point_id_idx" ON "point_orders"("point_id");

-- CreateIndex
CREATE INDEX "point_orders_base_id_idx" ON "point_orders"("base_id");

-- CreateIndex
CREATE INDEX "point_orders_status_idx" ON "point_orders"("status");

-- CreateIndex
CREATE INDEX "point_orders_payment_status_idx" ON "point_orders"("payment_status");

-- CreateIndex
CREATE INDEX "point_orders_order_date_idx" ON "point_orders"("order_date");

-- CreateIndex
CREATE INDEX "point_orders_created_by_idx" ON "point_orders"("created_by");

-- CreateIndex
CREATE INDEX "point_order_items_point_order_id_idx" ON "point_order_items"("point_order_id");

-- CreateIndex
CREATE INDEX "point_order_items_goods_id_idx" ON "point_order_items"("goods_id");

-- CreateIndex
CREATE INDEX "point_inventory_point_id_idx" ON "point_inventory"("point_id");

-- CreateIndex
CREATE INDEX "point_inventory_goods_id_idx" ON "point_inventory"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_inventory_point_id_goods_id_key" ON "point_inventory"("point_id", "goods_id");

-- CreateIndex
CREATE INDEX "location_profits_point_id_idx" ON "location_profits"("point_id");

-- CreateIndex
CREATE INDEX "location_profits_base_id_idx" ON "location_profits"("base_id");

-- CreateIndex
CREATE INDEX "location_profits_start_date_end_date_idx" ON "location_profits"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "location_profits_created_at_idx" ON "location_profits"("created_at");

-- CreateIndex
CREATE INDEX "casbin_rules_ptype_idx" ON "casbin_rules"("ptype");

-- CreateIndex
CREATE INDEX "casbin_rules_v0_idx" ON "casbin_rules"("v0");

-- CreateIndex
CREATE INDEX "casbin_rules_v1_idx" ON "casbin_rules"("v1");

-- CreateIndex
CREATE INDEX "data_permission_rules_role_id_idx" ON "data_permission_rules"("role_id");

-- CreateIndex
CREATE INDEX "data_permission_rules_resource_idx" ON "data_permission_rules"("resource");

-- CreateIndex
CREATE INDEX "data_permission_rules_is_active_idx" ON "data_permission_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "data_permission_rules_role_id_resource_field_key" ON "data_permission_rules"("role_id", "resource", "field");

-- CreateIndex
CREATE INDEX "field_permissions_role_id_idx" ON "field_permissions"("role_id");

-- CreateIndex
CREATE INDEX "field_permissions_resource_idx" ON "field_permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "field_permissions_role_id_resource_field_key" ON "field_permissions"("role_id", "resource", "field");

