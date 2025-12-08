-- CreateEnum
CREATE TYPE "GoodsCategory" AS ENUM ('CARD', 'CARD_BRICK', 'GIFT', 'COLOR_PAPER', 'FORTUNE_SIGN', 'TEAR_CARD', 'TOY', 'STAMP', 'LUCKY_CAT');

-- AlterTable
ALTER TABLE "goods" ADD COLUMN     "category" "GoodsCategory" NOT NULL DEFAULT 'CARD';
