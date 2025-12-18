#!/bin/bash
# MiliCard 孤立数据清理脚本
# 用法: ./cleanup_orphan_data.sh [staging|production]
# 在启用外键约束前必须执行此脚本清理所有孤立数据

set -e

ENV=${1:-staging}

if [ "$ENV" = "production" ]; then
    CONTAINER_NAME="milicard-prod"
    echo "⚠️  WARNING: You are about to clean orphan data in PRODUCTION!"
    read -p "Type 'YES' to continue: " confirm
    if [ "$confirm" != "YES" ]; then
        echo "Cancelled."
        exit 0
    fi
else
    CONTAINER_NAME="milicard-staging"
fi

echo ""
echo "============================================="
echo "  MiliCard Orphan Data Cleanup"
echo "============================================="
echo ""
echo "Container: $CONTAINER_NAME"
echo ""

# 检查容器是否运行
if ! docker ps -q -f "name=$CONTAINER_NAME" > /dev/null 2>&1; then
    echo "ERROR: Container $CONTAINER_NAME is not running"
    exit 1
fi

echo "Checking for orphan data..."
echo ""

# 检查并显示孤立数据数量
docker exec $CONTAINER_NAME bash -c "PGPASSWORD=\$DB_PASSWORD psql -h localhost -U milicard milicard -c \"
SELECT 'arrival_records -> purchase_orders' AS relation, COUNT(*) AS orphan_count 
FROM arrival_records WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
UNION ALL
SELECT 'arrival_records -> goods', COUNT(*) 
FROM arrival_records WHERE goods_id NOT IN (SELECT id FROM goods)
UNION ALL
SELECT 'arrival_records -> personnel', COUNT(*) 
FROM arrival_records WHERE handler_id NOT IN (SELECT id FROM personnel)
UNION ALL
SELECT 'arrival_records -> locations', COUNT(*) 
FROM arrival_records WHERE location_id NOT IN (SELECT id FROM locations)
UNION ALL
SELECT 'purchase_order_items -> purchase_orders', COUNT(*) 
FROM purchase_order_items WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
UNION ALL
SELECT 'purchase_order_items -> goods', COUNT(*) 
FROM purchase_order_items WHERE goods_id NOT IN (SELECT id FROM goods)
UNION ALL
SELECT 'inventory -> goods', COUNT(*) 
FROM inventory WHERE goods_id NOT IN (SELECT id FROM goods)
UNION ALL
SELECT 'inventory_ledger -> goods', COUNT(*) 
FROM inventory_ledger WHERE goods_id NOT IN (SELECT id FROM goods)
UNION ALL
SELECT 'personnel -> bases', COUNT(*) 
FROM personnel WHERE base_id NOT IN (SELECT id FROM bases)
UNION ALL
SELECT 'locations -> bases', COUNT(*) 
FROM locations WHERE base_id NOT IN (SELECT id FROM bases);
\""

echo ""
read -p "Do you want to clean up orphan data? (y/N): " cleanup_confirm
if [ "$cleanup_confirm" != "y" ] && [ "$cleanup_confirm" != "Y" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Cleaning up orphan data..."

docker exec $CONTAINER_NAME bash -c "PGPASSWORD=\$DB_PASSWORD psql -h localhost -U milicard milicard -c \"
BEGIN;

-- Clean arrival_records
DELETE FROM arrival_records WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders);
DELETE FROM arrival_records WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM arrival_records WHERE handler_id NOT IN (SELECT id FROM personnel);
DELETE FROM arrival_records WHERE location_id NOT IN (SELECT id FROM locations);
DELETE FROM arrival_records WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean purchase_order_items
DELETE FROM purchase_order_items WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders);
DELETE FROM purchase_order_items WHERE goods_id NOT IN (SELECT id FROM goods);

-- Clean inventory
DELETE FROM inventory WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM inventory WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean inventory_ledger
DELETE FROM inventory_ledger WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM inventory_ledger WHERE location_id NOT IN (SELECT id FROM locations);

-- Clean transfer_records
DELETE FROM transfer_records WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM transfer_records WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean stock_consumptions
DELETE FROM stock_consumptions WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM stock_consumptions WHERE location_id NOT IN (SELECT id FROM locations);

-- Clean personnel
DELETE FROM personnel WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean locations
DELETE FROM locations WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean purchase_orders
DELETE FROM purchase_orders WHERE base_id NOT IN (SELECT id FROM bases);
DELETE FROM purchase_orders WHERE target_location_id NOT IN (SELECT id FROM locations);

-- Clean goods_local_settings
DELETE FROM goods_local_settings WHERE goods_id NOT IN (SELECT id FROM goods);
DELETE FROM goods_local_settings WHERE base_id NOT IN (SELECT id FROM bases);

-- Clean user_bases
DELETE FROM user_bases WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM user_bases WHERE base_id NOT IN (SELECT id FROM bases);

COMMIT;
\""

echo ""
echo "============================================="
echo "  Cleanup Completed!"
echo "============================================="
echo ""
