-- MiliCard 孤立数据检查脚本
-- 用法: psql -h localhost -p 5437 -U postgres -d milicard_dev -f check_orphan_data.sql
-- 或在 psql 中执行: \i check_orphan_data.sql

SELECT '========================================' AS "Orphan Data Check";
SELECT 'Checking all foreign key relationships...' AS "Status";
SELECT '========================================' AS "";

SELECT 
    relation,
    orphan_count,
    CASE WHEN orphan_count > 0 THEN '❌ ORPHAN DATA FOUND' ELSE '✅ OK' END AS status
FROM (
    -- arrival_records 外键检查
    SELECT 'arrival_records.purchase_order_id -> purchase_orders' AS relation, 
           COUNT(*) AS orphan_count 
    FROM arrival_records WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
    
    UNION ALL
    SELECT 'arrival_records.goods_id -> goods', COUNT(*) 
    FROM arrival_records WHERE goods_id NOT IN (SELECT id FROM goods)
    
    UNION ALL
    SELECT 'arrival_records.handler_id -> personnel', COUNT(*) 
    FROM arrival_records WHERE handler_id NOT IN (SELECT id FROM personnel)
    
    UNION ALL
    SELECT 'arrival_records.location_id -> locations', COUNT(*) 
    FROM arrival_records WHERE location_id NOT IN (SELECT id FROM locations)
    
    UNION ALL
    SELECT 'arrival_records.base_id -> bases', COUNT(*) 
    FROM arrival_records WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- purchase_order_items 外键检查
    UNION ALL
    SELECT 'purchase_order_items.purchase_order_id -> purchase_orders', COUNT(*) 
    FROM purchase_order_items WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
    
    UNION ALL
    SELECT 'purchase_order_items.goods_id -> goods', COUNT(*) 
    FROM purchase_order_items WHERE goods_id NOT IN (SELECT id FROM goods)
    
    -- inventory 外键检查
    UNION ALL
    SELECT 'inventory.goods_id -> goods', COUNT(*) 
    FROM inventory WHERE goods_id NOT IN (SELECT id FROM goods)
    
    UNION ALL
    SELECT 'inventory.base_id -> bases', COUNT(*) 
    FROM inventory WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- inventory_ledger 外键检查
    UNION ALL
    SELECT 'inventory_ledger.goods_id -> goods', COUNT(*) 
    FROM inventory_ledger WHERE goods_id NOT IN (SELECT id FROM goods)
    
    UNION ALL
    SELECT 'inventory_ledger.location_id -> locations', COUNT(*) 
    FROM inventory_ledger WHERE location_id NOT IN (SELECT id FROM locations)
    
    UNION ALL
    SELECT 'inventory_ledger.handler_id -> personnel', COUNT(*) 
    FROM inventory_ledger WHERE handler_id IS NOT NULL AND handler_id NOT IN (SELECT id FROM personnel)
    
    -- transfer_records 外键检查
    UNION ALL
    SELECT 'transfer_records.goods_id -> goods', COUNT(*) 
    FROM transfer_records WHERE goods_id NOT IN (SELECT id FROM goods)
    
    UNION ALL
    SELECT 'transfer_records.base_id -> bases', COUNT(*) 
    FROM transfer_records WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- personnel 外键检查
    UNION ALL
    SELECT 'personnel.base_id -> bases', COUNT(*) 
    FROM personnel WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- locations 外键检查
    UNION ALL
    SELECT 'locations.base_id -> bases', COUNT(*) 
    FROM locations WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- purchase_orders 外键检查
    UNION ALL
    SELECT 'purchase_orders.base_id -> bases', COUNT(*) 
    FROM purchase_orders WHERE base_id NOT IN (SELECT id FROM bases)
    
    UNION ALL
    SELECT 'purchase_orders.target_location_id -> locations', COUNT(*) 
    FROM purchase_orders WHERE target_location_id IS NOT NULL AND target_location_id NOT IN (SELECT id FROM locations)
    
    UNION ALL
    SELECT 'purchase_orders.supplier_id -> suppliers', COUNT(*) 
    FROM purchase_orders WHERE supplier_id IS NOT NULL AND supplier_id NOT IN (SELECT id FROM suppliers)
    
    -- goods_local_settings 外键检查
    UNION ALL
    SELECT 'goods_local_settings.goods_id -> goods', COUNT(*) 
    FROM goods_local_settings WHERE goods_id NOT IN (SELECT id FROM goods)
    
    UNION ALL
    SELECT 'goods_local_settings.base_id -> bases', COUNT(*) 
    FROM goods_local_settings WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- user_bases 外键检查
    UNION ALL
    SELECT 'user_bases.user_id -> users', COUNT(*) 
    FROM user_bases WHERE user_id NOT IN (SELECT id FROM users)
    
    UNION ALL
    SELECT 'user_bases.base_id -> bases', COUNT(*) 
    FROM user_bases WHERE base_id NOT IN (SELECT id FROM bases)
    
    -- supplier_bases 外键检查
    UNION ALL
    SELECT 'supplier_bases.supplier_id -> suppliers', COUNT(*) 
    FROM supplier_bases WHERE supplier_id NOT IN (SELECT id FROM suppliers)
    
    UNION ALL
    SELECT 'supplier_bases.base_id -> bases', COUNT(*) 
    FROM supplier_bases WHERE base_id NOT IN (SELECT id FROM bases)

) AS checks
ORDER BY orphan_count DESC, relation;

SELECT '========================================' AS "";
SELECT 'Summary:' AS "Status";

SELECT 
    SUM(orphan_count) AS total_orphans,
    CASE WHEN SUM(orphan_count) > 0 
         THEN '⚠️  Found orphan data! Run cleanup script.' 
         ELSE '✅ Database is clean!' 
    END AS result
FROM (
    SELECT COUNT(*) AS orphan_count FROM arrival_records WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
    UNION ALL SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id NOT IN (SELECT id FROM purchase_orders)
    UNION ALL SELECT COUNT(*) FROM inventory WHERE goods_id NOT IN (SELECT id FROM goods)
    UNION ALL SELECT COUNT(*) FROM personnel WHERE base_id NOT IN (SELECT id FROM bases)
    UNION ALL SELECT COUNT(*) FROM locations WHERE base_id NOT IN (SELECT id FROM bases)
) AS totals;
