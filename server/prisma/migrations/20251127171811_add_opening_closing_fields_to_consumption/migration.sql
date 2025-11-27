-- AlterTable
ALTER TABLE "stock_consumption" ADD COLUMN     "closing_box_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "closing_pack_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "closing_piece_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opening_box_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opening_pack_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opening_piece_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unit_price_per_box" DECIMAL(12,2) NOT NULL DEFAULT 0;
