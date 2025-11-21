-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'LIVE_ROOM');

-- CreateEnum
CREATE TYPE "PersonnelRole" AS ENUM ('ANCHOR', 'WAREHOUSE_KEEPER');

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
    "permissions" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "description_key" TEXT,
    "name_key" TEXT,

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
    "id" TEXT NOT NULL,
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

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "retail_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "box_quantity" INTEGER NOT NULL DEFAULT 1,
    "pack_per_box" INTEGER NOT NULL DEFAULT 1,
    "piece_per_pack" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "average_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "target_location_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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
    "arrival_no" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "arrival_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "transfer_no" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "transfer_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "location_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "consumption_date" DATE NOT NULL,
    "opening_stock" INTEGER NOT NULL DEFAULT 0,
    "closing_stock" INTEGER NOT NULL DEFAULT 0,
    "arrival_quantity" INTEGER NOT NULL DEFAULT 0,
    "transfer_in" INTEGER NOT NULL DEFAULT 0,
    "transfer_out" INTEGER NOT NULL DEFAULT 0,
    "stock_out" INTEGER NOT NULL DEFAULT 0,
    "consumption" INTEGER NOT NULL DEFAULT 0,
    "consumption_unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "consumption_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "order_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_order_items" (
    "id" TEXT NOT NULL,
    "distribution_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "pending_quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "distribution_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_out_orders" (
    "id" TEXT NOT NULL,
    "out_no" TEXT NOT NULL,
    "distribution_order_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "out_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_out_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_out_order_items" (
    "id" TEXT NOT NULL,
    "stock_out_order_id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pending_before" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "stock_out_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anchor_profits" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
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

    CONSTRAINT "anchor_profits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "distribution_order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "received_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" TEXT NOT NULL,
    "receivable_id" TEXT NOT NULL,
    "payment_amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "goods_bases" (
    "id" TEXT NOT NULL,
    "goods_id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "retail_price" DECIMAL(12,2),
    "purchase_price" DECIMAL(12,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_bases_pkey" PRIMARY KEY ("id")
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
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "goods_is_active_idx" ON "goods"("is_active");

-- CreateIndex
CREATE INDEX "inventory_goods_id_idx" ON "inventory"("goods_id");

-- CreateIndex
CREATE INDEX "inventory_location_id_idx" ON "inventory"("location_id");

-- CreateIndex
CREATE INDEX "inventory_base_id_idx" ON "inventory"("base_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_goods_id_location_id_key" ON "inventory"("goods_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_no_key" ON "purchase_orders"("order_no");

-- CreateIndex
CREATE INDEX "purchase_orders_order_no_idx" ON "purchase_orders"("order_no");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_name_idx" ON "purchase_orders"("supplier_name");

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
CREATE UNIQUE INDEX "arrival_orders_arrival_no_key" ON "arrival_orders"("arrival_no");

-- CreateIndex
CREATE INDEX "arrival_orders_arrival_no_idx" ON "arrival_orders"("arrival_no");

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
CREATE UNIQUE INDEX "transfer_orders_transfer_no_key" ON "transfer_orders"("transfer_no");

-- CreateIndex
CREATE INDEX "transfer_orders_transfer_no_idx" ON "transfer_orders"("transfer_no");

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
CREATE INDEX "stock_consumption_location_id_idx" ON "stock_consumption"("location_id");

-- CreateIndex
CREATE INDEX "stock_consumption_goods_id_idx" ON "stock_consumption"("goods_id");

-- CreateIndex
CREATE INDEX "stock_consumption_consumption_date_idx" ON "stock_consumption"("consumption_date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_consumption_location_id_goods_id_consumption_date_key" ON "stock_consumption"("location_id", "goods_id", "consumption_date");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_orders_order_no_key" ON "distribution_orders"("order_no");

-- CreateIndex
CREATE INDEX "distribution_orders_order_no_idx" ON "distribution_orders"("order_no");

-- CreateIndex
CREATE INDEX "distribution_orders_customer_id_idx" ON "distribution_orders"("customer_id");

-- CreateIndex
CREATE INDEX "distribution_orders_order_date_idx" ON "distribution_orders"("order_date");

-- CreateIndex
CREATE INDEX "distribution_orders_created_by_idx" ON "distribution_orders"("created_by");

-- CreateIndex
CREATE INDEX "distribution_order_items_distribution_order_id_idx" ON "distribution_order_items"("distribution_order_id");

-- CreateIndex
CREATE INDEX "distribution_order_items_goods_id_idx" ON "distribution_order_items"("goods_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_out_orders_out_no_key" ON "stock_out_orders"("out_no");

-- CreateIndex
CREATE INDEX "stock_out_orders_out_no_idx" ON "stock_out_orders"("out_no");

-- CreateIndex
CREATE INDEX "stock_out_orders_distribution_order_id_idx" ON "stock_out_orders"("distribution_order_id");

-- CreateIndex
CREATE INDEX "stock_out_orders_location_id_idx" ON "stock_out_orders"("location_id");

-- CreateIndex
CREATE INDEX "stock_out_orders_out_date_idx" ON "stock_out_orders"("out_date");

-- CreateIndex
CREATE INDEX "stock_out_order_items_stock_out_order_id_idx" ON "stock_out_order_items"("stock_out_order_id");

-- CreateIndex
CREATE INDEX "stock_out_order_items_goods_id_idx" ON "stock_out_order_items"("goods_id");

-- CreateIndex
CREATE INDEX "anchor_profits_location_id_idx" ON "anchor_profits"("location_id");

-- CreateIndex
CREATE INDEX "anchor_profits_profit_date_idx" ON "anchor_profits"("profit_date");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_profits_location_id_profit_date_key" ON "anchor_profits"("location_id", "profit_date");

-- CreateIndex
CREATE INDEX "receivables_distribution_order_id_idx" ON "receivables"("distribution_order_id");

-- CreateIndex
CREATE INDEX "receivables_customer_id_idx" ON "receivables"("customer_id");

-- CreateIndex
CREATE INDEX "receivables_due_date_idx" ON "receivables"("due_date");

-- CreateIndex
CREATE INDEX "receivable_payments_receivable_id_idx" ON "receivable_payments"("receivable_id");

-- CreateIndex
CREATE INDEX "receivable_payments_payment_date_idx" ON "receivable_payments"("payment_date");

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
CREATE INDEX "goods_bases_goods_id_idx" ON "goods_bases"("goods_id");

-- CreateIndex
CREATE INDEX "goods_bases_base_id_idx" ON "goods_bases"("base_id");

-- CreateIndex
CREATE INDEX "goods_bases_is_active_idx" ON "goods_bases"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "goods_bases_goods_id_base_id_key" ON "goods_bases"("goods_id", "base_id");

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

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_base_id_fkey" FOREIGN KEY ("default_base_id") REFERENCES "bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_target_location_id_fkey" FOREIGN KEY ("target_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_orders" ADD CONSTRAINT "arrival_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_orders" ADD CONSTRAINT "arrival_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_orders" ADD CONSTRAINT "arrival_orders_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_order_items" ADD CONSTRAINT "arrival_order_items_arrival_order_id_fkey" FOREIGN KEY ("arrival_order_id") REFERENCES "arrival_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrival_order_items" ADD CONSTRAINT "arrival_order_items_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_transfer_order_id_fkey" FOREIGN KEY ("transfer_order_id") REFERENCES "transfer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_consumption" ADD CONSTRAINT "stock_consumption_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_orders" ADD CONSTRAINT "distribution_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_orders" ADD CONSTRAINT "distribution_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_order_items" ADD CONSTRAINT "distribution_order_items_distribution_order_id_fkey" FOREIGN KEY ("distribution_order_id") REFERENCES "distribution_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_order_items" ADD CONSTRAINT "distribution_order_items_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_orders" ADD CONSTRAINT "stock_out_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_orders" ADD CONSTRAINT "stock_out_orders_distribution_order_id_fkey" FOREIGN KEY ("distribution_order_id") REFERENCES "distribution_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_orders" ADD CONSTRAINT "stock_out_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_order_items" ADD CONSTRAINT "stock_out_order_items_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_out_order_items" ADD CONSTRAINT "stock_out_order_items_stock_out_order_id_fkey" FOREIGN KEY ("stock_out_order_id") REFERENCES "stock_out_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchor_profits" ADD CONSTRAINT "anchor_profits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchor_profits" ADD CONSTRAINT "anchor_profits_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_distribution_order_id_fkey" FOREIGN KEY ("distribution_order_id") REFERENCES "distribution_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payable_payments" ADD CONSTRAINT "payable_payments_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_reviews" ADD CONSTRAINT "translation_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_reviews" ADD CONSTRAINT "translation_reviews_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bases" ADD CONSTRAINT "user_bases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bases" ADD CONSTRAINT "user_bases_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_bases" ADD CONSTRAINT "goods_bases_goods_id_fkey" FOREIGN KEY ("goods_id") REFERENCES "goods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_bases" ADD CONSTRAINT "goods_bases_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bases" ADD CONSTRAINT "supplier_bases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_bases" ADD CONSTRAINT "supplier_bases_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personnel" ADD CONSTRAINT "personnel_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
