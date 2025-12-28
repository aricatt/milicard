-- 检查 goods 资源的字段权限配置

-- 1. 查询所有角色
SELECT id, name, level FROM roles ORDER BY level;

-- 2. 查询 goods 资源的所有字段权限
SELECT 
  r.name as role_name,
  fp.resource,
  fp.field,
  fp.can_read,
  fp.can_write
FROM field_permissions fp
JOIN roles r ON fp.role_id = r.id
WHERE fp.resource = 'goods'
ORDER BY r.name, fp.field;

-- 3. 查询 packPerBox 字段的权限配置
SELECT 
  r.name as role_name,
  fp.field,
  fp.can_read,
  fp.can_write
FROM field_permissions fp
JOIN roles r ON fp.role_id = r.id
WHERE fp.resource = 'goods' AND fp.field = 'packPerBox';

-- 4. 统计各资源的字段权限配置数量
SELECT resource, COUNT(*) as config_count
FROM field_permissions
GROUP BY resource
ORDER BY resource;
