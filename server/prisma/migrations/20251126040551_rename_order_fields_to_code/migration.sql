/*
  Warnings:

  - You are about to drop the column `order_no` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `order_no` on the `distribution_orders` table. All the data in the column will be lost.
  - You are about to drop the column `transfer_no` on the `transfer_orders` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_no` on the `arrival_orders` table. All the data in the column will be lost.
  - You are about to drop the column `out_no` on the `stock_out_orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `distribution_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `transfer_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `arrival_orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `stock_out_orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `purchase_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `distribution_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `transfer_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `arrival_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `stock_out_orders` table without a default value. This is not possible if the table is not empty.

*/

-- 1. 采购订单表：order_no -> code
ALTER TABLE "purchase_orders" RENAME COLUMN "order_no" TO "code";

-- 2. 销售订单表：order_no -> code
ALTER TABLE "distribution_orders" RENAME COLUMN "order_no" TO "code";

-- 3. 调拨订单表：transfer_no -> code
ALTER TABLE "transfer_orders" RENAME COLUMN "transfer_no" TO "code";

-- 4. 到货单表：arrival_no -> code
ALTER TABLE "arrival_orders" RENAME COLUMN "arrival_no" TO "code";

-- 5. 出库单表：out_no -> code
ALTER TABLE "stock_out_orders" RENAME COLUMN "out_no" TO "code";
