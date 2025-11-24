-- 清理基地 BASE001 相关数据的SQL脚本
-- 注意：请在执行前备份数据库！

-- 1. 首先查看基地ID
SELECT id, code, name FROM bases WHERE code = 'BASE001';

-- 2. 查看依赖关系数据量
SELECT 
  'user_bases' as table_name, COUNT(*) as count 
FROM user_bases ub 
JOIN bases b ON ub.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'goods_bases' as table_name, COUNT(*) as count 
FROM goods_bases gb 
JOIN bases b ON gb.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'supplier_bases' as table_name, COUNT(*) as count 
FROM supplier_bases sb 
JOIN bases b ON sb.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'locations' as table_name, COUNT(*) as count 
FROM locations l 
JOIN bases b ON l.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'inventory' as table_name, COUNT(*) as count 
FROM inventory i 
JOIN bases b ON i.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'purchase_orders' as table_name, COUNT(*) as count 
FROM purchase_orders po 
JOIN bases b ON po.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'customers' as table_name, COUNT(*) as count 
FROM customers c 
JOIN bases b ON c.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'personnel' as table_name, COUNT(*) as count 
FROM personnel p 
JOIN bases b ON p.base_id = b.id 
WHERE b.code = 'BASE001'

UNION ALL

SELECT 
  'users_default_base' as table_name, COUNT(*) as count 
FROM users u 
JOIN bases b ON u.default_base_id = b.id 
WHERE b.code = 'BASE001';

-- 3. 如果确认要删除，按以下顺序执行（从子表到父表）

-- 3.1 删除用户基地关联
DELETE FROM user_bases 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.2 删除商品基地关联
DELETE FROM goods_bases 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.3 删除供应商基地关联
DELETE FROM supplier_bases 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.4 删除库存记录
DELETE FROM inventory 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.5 删除采购订单项（如果存在）
DELETE FROM purchase_order_items 
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001')
);

-- 3.6 删除采购订单
DELETE FROM purchase_orders 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.7 删除位置记录
DELETE FROM locations 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.8 删除客户记录
DELETE FROM customers 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.9 删除人员记录
DELETE FROM personnel 
WHERE base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.10 清除用户的默认基地设置
UPDATE users 
SET default_base_id = NULL 
WHERE default_base_id IN (SELECT id FROM bases WHERE code = 'BASE001');

-- 3.11 最后删除基地记录
DELETE FROM bases WHERE code = 'BASE001';

-- 4. 验证删除结果
SELECT 'Cleanup completed. BASE001 should be removed.' as result;
SELECT COUNT(*) as remaining_bases FROM bases WHERE code = 'BASE001';
