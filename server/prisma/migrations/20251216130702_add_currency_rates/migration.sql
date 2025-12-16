-- CreateTable
CREATE TABLE "currency_rates" (
    "id" SERIAL NOT NULL,
    "currency_code" TEXT NOT NULL,
    "currency_name" TEXT,
    "fixed_rate" DECIMAL(18,8) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_currency_code_key" ON "currency_rates"("currency_code");

-- CreateIndex
CREATE INDEX "currency_rates_currency_code_idx" ON "currency_rates"("currency_code");

-- CreateIndex
CREATE INDEX "currency_rates_is_active_idx" ON "currency_rates"("is_active");
