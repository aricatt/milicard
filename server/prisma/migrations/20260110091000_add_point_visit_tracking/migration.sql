-- CreateTable
CREATE TABLE "point_visits" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(6) NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "customer_name" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(11,7),
    "location_name" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_visits_point_id_idx" ON "point_visits"("point_id");

-- CreateIndex
CREATE INDEX "point_visits_visit_date_idx" ON "point_visits"("visit_date");

-- CreateIndex
CREATE INDEX "point_visits_created_by_idx" ON "point_visits"("created_by");

-- CreateIndex
CREATE INDEX "point_visits_created_at_idx" ON "point_visits"("created_at");

-- AddForeignKey
ALTER TABLE "point_visits" ADD CONSTRAINT "point_visits_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_visits" ADD CONSTRAINT "point_visits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
