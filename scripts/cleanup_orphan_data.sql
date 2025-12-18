-- MiliCard 孤立数据清理脚本
-- 在启用外键约束前必须执行此脚本清理所有孤立数据
-- 用法: psql -h localhost -U milicard milicard -f cleanup_orphan_data.sql

BEGIN;

-- 1. 清理 arrival_records 中引用不存在的 purchase_orders
DELETE FROM arrival_records 
WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders);

-- 2. 清理 arrival_records 中引用不存在的 goods
DELETE FROM arrival_records 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 3. 清理 arrival_records 中引用不存在的 personnel (handler)
DELETE FROM arrival_records 
WHERE handler_id NOT IN (SELECT id FROM personnel);

-- 4. 清理 arrival_records 中引用不存在的 locations
DELETE FROM arrival_records 
WHERE location_id NOT IN (SELECT id FROM locations);

-- 5. 清理 arrival_records 中引用不存在的 bases
DELETE FROM arrival_records 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 6. 清理 purchase_order_items 中引用不存在的 purchase_orders
DELETE FROM purchase_order_items 
WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders);

-- 7. 清理 purchase_order_items 中引用不存在的 goods
DELETE FROM purchase_order_items 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 8. 清理 inventory 中引用不存在的 goods
DELETE FROM inventory 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 9. 清理 inventory 中引用不存在的 bases
DELETE FROM inventory 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 10. 清理 inventory_ledger 中引用不存在的 goods
DELETE FROM inventory_ledger 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 11. 清理 inventory_ledger 中引用不存在的 locations
DELETE FROM inventory_ledger 
WHERE location_id NOT IN (SELECT id FROM locations);

-- 12. 清理 transfer_records 中引用不存在的 goods
DELETE FROM transfer_records 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 13. 清理 transfer_records 中引用不存在的 bases
DELETE FROM transfer_records 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 14. 清理 stock_consumptions 中引用不存在的 goods
DELETE FROM stock_consumptions 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 15. 清理 stock_consumptions 中引用不存在的 locations
DELETE FROM stock_consumptions 
WHERE location_id NOT IN (SELECT id FROM locations);

-- 16. 清理 personnel 中引用不存在的 bases
DELETE FROM personnel 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 17. 清理 locations 中引用不存在的 bases
DELETE FROM locations 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 18. 清理 purchase_orders 中引用不存在的 bases
DELETE FROM purchase_orders 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 19. 清理 purchase_orders 中引用不存在的 locations
DELETE FROM purchase_orders 
WHERE target_location_id NOT IN (SELECT id FROM locations);

-- 20. 清理 purchase_orders 中引用不存在的 suppliers
DELETE FROM purchase_orders 
WHERE supplier_id IS NOT NULL AND supplier_id NOT IN (SELECT id FROM suppliers);

-- 21. 清理 goods_local_settings 中引用不存在的 goods
DELETE FROM goods_local_settings 
WHERE goods_id NOT IN (SELECT id FROM goods);

-- 22. 清理 goods_local_settings 中引用不存在的 bases
DELETE FROM goods_local_settings 
WHERE base_id NOT IN (SELECT id FROM bases);

-- 23. 清理 user_bases 中引用不存在的 users
DELETE FROM user_bases 
WHERE user_id NOT IN (SELECT id FROM users);

-- 24. 清理 user_bases 中引用不存在的 bases
DELETE FROM user_bases 
WHERE base_id NOT IN (SELECT id FROM bases);

COMMIT;

-- 显示清理结果
SELECT 'Orphan data cleanup completed successfully!' AS result;
