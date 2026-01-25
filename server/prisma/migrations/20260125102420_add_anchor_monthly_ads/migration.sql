-- CreateTable
CREATE TABLE "anchor_monthly_ads" (
    "id" TEXT NOT NULL,
    "base_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "handler_id" TEXT NOT NULL,
    "handler_name" TEXT,
    "day1_ads" DECIMAL(10,2) DEFAULT 0,
    "day2_ads" DECIMAL(10,2) DEFAULT 0,
    "day3_ads" DECIMAL(10,2) DEFAULT 0,
    "day4_ads" DECIMAL(10,2) DEFAULT 0,
    "day5_ads" DECIMAL(10,2) DEFAULT 0,
    "day6_ads" DECIMAL(10,2) DEFAULT 0,
    "day7_ads" DECIMAL(10,2) DEFAULT 0,
    "day8_ads" DECIMAL(10,2) DEFAULT 0,
    "day9_ads" DECIMAL(10,2) DEFAULT 0,
    "day10_ads" DECIMAL(10,2) DEFAULT 0,
    "day11_ads" DECIMAL(10,2) DEFAULT 0,
    "day12_ads" DECIMAL(10,2) DEFAULT 0,
    "day13_ads" DECIMAL(10,2) DEFAULT 0,
    "day14_ads" DECIMAL(10,2) DEFAULT 0,
    "day15_ads" DECIMAL(10,2) DEFAULT 0,
    "day16_ads" DECIMAL(10,2) DEFAULT 0,
    "day17_ads" DECIMAL(10,2) DEFAULT 0,
    "day18_ads" DECIMAL(10,2) DEFAULT 0,
    "day19_ads" DECIMAL(10,2) DEFAULT 0,
    "day20_ads" DECIMAL(10,2) DEFAULT 0,
    "day21_ads" DECIMAL(10,2) DEFAULT 0,
    "day22_ads" DECIMAL(10,2) DEFAULT 0,
    "day23_ads" DECIMAL(10,2) DEFAULT 0,
    "day24_ads" DECIMAL(10,2) DEFAULT 0,
    "day25_ads" DECIMAL(10,2) DEFAULT 0,
    "day26_ads" DECIMAL(10,2) DEFAULT 0,
    "day27_ads" DECIMAL(10,2) DEFAULT 0,
    "day28_ads" DECIMAL(10,2) DEFAULT 0,
    "day29_ads" DECIMAL(10,2) DEFAULT 0,
    "day30_ads" DECIMAL(10,2) DEFAULT 0,
    "day31_ads" DECIMAL(10,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anchor_monthly_ads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anchor_monthly_ads_base_id_month_idx" ON "anchor_monthly_ads"("base_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_monthly_ads_base_id_month_handler_id_key" ON "anchor_monthly_ads"("base_id", "month", "handler_id");

-- AddForeignKey
ALTER TABLE "anchor_monthly_ads" ADD CONSTRAINT "anchor_monthly_ads_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchor_monthly_ads" ADD CONSTRAINT "anchor_monthly_ads_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
