-- 简单修改：只修改locations表的id类型
-- 注意：这会清空所有location数据

-- 1. 清空locations表（CASCADE会自动清空相关表）
TRUNCATE TABLE "locations" CASCADE;

-- 2. 删除旧的id列
ALTER TABLE "locations" DROP COLUMN "id";

-- 3. 添加新的自增id列作为主键
ALTER TABLE "locations" ADD COLUMN "id" SERIAL PRIMARY KEY;
