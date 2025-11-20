# 数据库迁移计划 - 基地中心化架构

## 📋 文档概述

本文档详细描述了从当前架构迁移到基地中心化架构的数据库变更计划。

**创建时间**: 2025-11-20  
**版本**: v1.0  
**状态**: 设计阶段

---

## 🎯 迁移目标

### 主要变更
1. **新增基地相关表**: 基地、用户基地关系、商品基地配置等
2. **现有表增加基地字段**: 为核心业务表添加 `base_id` 字段
3. **数据完整性**: 确保所有现有数据正确分配到基地
4. **性能优化**: 添加必要的索引和约束

---

## 📊 当前数据库状态分析

### 现有核心表
```sql
-- 用户相关
users                    -- 用户表
roles                    -- 角色表  
user_roles              -- 用户角色关系

-- 基础数据
locations               -- 位置表 (仓库/直播间)
goods                   -- 商品表
customers               -- 客户表

-- 库存管理
inventory               -- 库存表

-- 采购管理
purchase_orders         -- 采购订单
purchase_order_items    -- 采购订单明细
arrival_orders          -- 到货单
arrival_order_items     -- 到货单明细

-- 销售管理
distribution_orders     -- 销售订单
distribution_order_items -- 销售订单明细
stock_out_orders        -- 出库单
stock_out_order_items   -- 出库单明细

-- 财务管理
payables               -- 应付账款
payable_payments       -- 应付款支付
receivables            -- 应收账款
receivable_payments    -- 应收款收款

-- 其他
translations           -- 多语言
casbin_rule           -- 权限规则
```

---

## 🏗️ 新增表结构设计

### 1. 基地表 (bases)

```sql
CREATE TABLE bases (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,           -- 基地编号
  name VARCHAR(200) NOT NULL,                 -- 基地名称
  description TEXT,                           -- 基地描述
  address TEXT,                               -- 基地地址
  contact_person VARCHAR(100),                -- 联系人
  contact_phone VARCHAR(50),                  -- 联系电话
  contact_email VARCHAR(100),                 -- 联系邮箱
  is_active BOOLEAN DEFAULT true,             -- 是否启用
  created_by VARCHAR(36) NOT NULL,            -- 创建人
  updated_by VARCHAR(36) NOT NULL,            -- 更新人
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_bases_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_bases_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_bases_code ON bases(code);
CREATE INDEX idx_bases_name ON bases(name);
CREATE INDEX idx_bases_is_active ON bases(is_active);
```

### 2. 用户基地关系表 (user_bases)

```sql
CREATE TABLE user_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,               -- 用户ID
  base_id INTEGER NOT NULL,                   -- 基地ID
  roles TEXT[] DEFAULT '{}',                  -- 在该基地的角色
  is_active BOOLEAN DEFAULT true,             -- 在该基地是否启用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_bases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_bases_user_base UNIQUE (user_id, base_id)
);

-- 索引
CREATE INDEX idx_user_bases_user_id ON user_bases(user_id);
CREATE INDEX idx_user_bases_base_id ON user_bases(base_id);
CREATE INDEX idx_user_bases_is_active ON user_bases(is_active);
```

### 3. 商品基地配置表 (goods_bases)

```sql
CREATE TABLE goods_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_id VARCHAR(36) NOT NULL,              -- 商品ID
  base_id INTEGER NOT NULL,                   -- 基地ID
  is_active BOOLEAN DEFAULT true,             -- 在该基地是否启用
  retail_price DECIMAL(12,2),                 -- 基地特定零售价
  purchase_price DECIMAL(12,2),               -- 基地特定采购价
  notes TEXT,                                 -- 基地特定备注
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_goods_bases_goods FOREIGN KEY (goods_id) REFERENCES goods(id) ON DELETE CASCADE,
  CONSTRAINT fk_goods_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_goods_bases_goods_base UNIQUE (goods_id, base_id)
);

-- 索引
CREATE INDEX idx_goods_bases_goods_id ON goods_bases(goods_id);
CREATE INDEX idx_goods_bases_base_id ON goods_bases(base_id);
CREATE INDEX idx_goods_bases_is_active ON goods_bases(is_active);
```

### 4. 供应商表 (suppliers)

```sql
CREATE TABLE suppliers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,           -- 供应商编号
  name VARCHAR(200) NOT NULL,                 -- 供应商名称
  contact_person VARCHAR(100),                -- 联系人
  phone VARCHAR(50),                          -- 联系电话
  email VARCHAR(100),                         -- 联系邮箱
  address TEXT,                               -- 地址
  tax_number VARCHAR(50),                     -- 税号
  bank_account VARCHAR(100),                  -- 银行账号
  bank_name VARCHAR(200),                     -- 开户银行
  notes TEXT,                                 -- 备注
  is_active BOOLEAN DEFAULT true,             -- 是否启用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
```

### 5. 供应商基地关系表 (supplier_bases)

```sql
CREATE TABLE supplier_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id VARCHAR(36) NOT NULL,           -- 供应商ID
  base_id INTEGER NOT NULL,                   -- 基地ID
  is_active BOOLEAN DEFAULT true,             -- 合作关系是否启用
  payment_terms TEXT,                         -- 付款条件
  delivery_terms TEXT,                        -- 交货条件
  credit_limit DECIMAL(12,2) DEFAULT 0,       -- 信用额度
  notes TEXT,                                 -- 合作备注
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_supplier_bases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_supplier_bases_supplier_base UNIQUE (supplier_id, base_id)
);

-- 索引
CREATE INDEX idx_supplier_bases_supplier_id ON supplier_bases(supplier_id);
CREATE INDEX idx_supplier_bases_base_id ON supplier_bases(base_id);
CREATE INDEX idx_supplier_bases_is_active ON supplier_bases(is_active);
```

---

## 🔄 现有表结构修改

### 1. 用户表 (users) - 添加默认基地

```sql
-- 添加默认基地字段
ALTER TABLE users ADD COLUMN default_base_id INTEGER;
ALTER TABLE users ADD CONSTRAINT fk_users_default_base 
  FOREIGN KEY (default_base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_users_default_base_id ON users(default_base_id);
```

### 2. 位置表 (locations) - 添加基地关联

```sql
-- 添加基地字段
ALTER TABLE locations ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE locations ADD CONSTRAINT fk_locations_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_locations_base_id ON locations(base_id);

-- 移除默认值
ALTER TABLE locations ALTER COLUMN base_id DROP DEFAULT;
```

### 3. 库存表 (inventory) - 添加基地关联

```sql
-- 添加基地字段 (冗余字段，用于查询性能)
ALTER TABLE inventory ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD CONSTRAINT fk_inventory_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_inventory_base_id ON inventory(base_id);

-- 移除默认值
ALTER TABLE inventory ALTER COLUMN base_id DROP DEFAULT;
```

### 4. 采购订单表 (purchase_orders) - 添加基地关联

```sql
-- 添加基地字段
ALTER TABLE purchase_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_purchase_orders_base_id ON purchase_orders(base_id);

-- 移除默认值
ALTER TABLE purchase_orders ALTER COLUMN base_id DROP DEFAULT;
```

### 5. 销售订单表 (distribution_orders) - 添加基地关联

```sql
-- 添加基地字段
ALTER TABLE distribution_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE distribution_orders ADD CONSTRAINT fk_distribution_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_distribution_orders_base_id ON distribution_orders(base_id);

-- 移除默认值
ALTER TABLE distribution_orders ALTER COLUMN base_id DROP DEFAULT;
```

### 6. 客户表 (customers) - 添加基地关联

```sql
-- 添加基地字段 (可选，支持跨基地客户)
ALTER TABLE customers ADD COLUMN base_id INTEGER;
ALTER TABLE customers ADD CONSTRAINT fk_customers_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);

-- 添加索引
CREATE INDEX idx_customers_base_id ON customers(base_id);
```

### 7. 其他相关表

```sql
-- 到货单
ALTER TABLE arrival_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE arrival_orders ADD CONSTRAINT fk_arrival_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_arrival_orders_base_id ON arrival_orders(base_id);

-- 出库单
ALTER TABLE stock_out_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_out_orders ADD CONSTRAINT fk_stock_out_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_stock_out_orders_base_id ON stock_out_orders(base_id);

-- 库存消耗
ALTER TABLE stock_consumptions ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stock_consumptions ADD CONSTRAINT fk_stock_consumptions_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_stock_consumptions_base_id ON stock_consumptions(base_id);

-- 调拨单
ALTER TABLE transfer_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_transfer_orders_base_id ON transfer_orders(base_id);

-- 应付账款
ALTER TABLE payables ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payables ADD CONSTRAINT fk_payables_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_payables_base_id ON payables(base_id);

-- 应收账款
ALTER TABLE receivables ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE receivables ADD CONSTRAINT fk_receivables_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_receivables_base_id ON receivables(base_id);
```

---

## 📋 迁移脚本

### 第一阶段: 创建基地相关表

```sql
-- migration_001_create_bases.sql

BEGIN;

-- 1. 创建基地表
CREATE TABLE bases (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建默认基地
INSERT INTO bases (id, code, name, description, created_by, updated_by) 
VALUES (1, 'HQ001', '总部基地', '系统默认基地，用于数据迁移', 'system', 'system');

-- 3. 重置序列
SELECT setval('bases_id_seq', 1, true);

-- 4. 创建索引
CREATE INDEX idx_bases_code ON bases(code);
CREATE INDEX idx_bases_name ON bases(name);
CREATE INDEX idx_bases_is_active ON bases(is_active);

COMMIT;
```

### 第二阶段: 创建关系表

```sql
-- migration_002_create_relationships.sql

BEGIN;

-- 1. 用户基地关系表
CREATE TABLE user_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  base_id INTEGER NOT NULL,
  roles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_user_bases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_bases_user_base UNIQUE (user_id, base_id)
);

-- 2. 商品基地配置表
CREATE TABLE goods_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_id VARCHAR(36) NOT NULL,
  base_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retail_price DECIMAL(12,2),
  purchase_price DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_goods_bases_goods FOREIGN KEY (goods_id) REFERENCES goods(id) ON DELETE CASCADE,
  CONSTRAINT fk_goods_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_goods_bases_goods_base UNIQUE (goods_id, base_id)
);

-- 3. 供应商表
CREATE TABLE suppliers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  address TEXT,
  tax_number VARCHAR(50),
  bank_account VARCHAR(100),
  bank_name VARCHAR(200),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 供应商基地关系表
CREATE TABLE supplier_bases (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id VARCHAR(36) NOT NULL,
  base_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  payment_terms TEXT,
  delivery_terms TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_supplier_bases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_bases_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE CASCADE,
  CONSTRAINT uk_supplier_bases_supplier_base UNIQUE (supplier_id, base_id)
);

-- 创建索引
CREATE INDEX idx_user_bases_user_id ON user_bases(user_id);
CREATE INDEX idx_user_bases_base_id ON user_bases(base_id);
CREATE INDEX idx_goods_bases_goods_id ON goods_bases(goods_id);
CREATE INDEX idx_goods_bases_base_id ON goods_bases(base_id);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_supplier_bases_supplier_id ON supplier_bases(supplier_id);
CREATE INDEX idx_supplier_bases_base_id ON supplier_bases(base_id);

COMMIT;
```

### 第三阶段: 修改现有表

```sql
-- migration_003_add_base_fields.sql

BEGIN;

-- 1. 用户表添加默认基地
ALTER TABLE users ADD COLUMN default_base_id INTEGER;
ALTER TABLE users ADD CONSTRAINT fk_users_default_base 
  FOREIGN KEY (default_base_id) REFERENCES bases(id);
CREATE INDEX idx_users_default_base_id ON users(default_base_id);

-- 2. 位置表添加基地关联
ALTER TABLE locations ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE locations ADD CONSTRAINT fk_locations_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_locations_base_id ON locations(base_id);

-- 3. 库存表添加基地关联
ALTER TABLE inventory ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory ADD CONSTRAINT fk_inventory_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_inventory_base_id ON inventory(base_id);

-- 4. 采购订单表添加基地关联
ALTER TABLE purchase_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_purchase_orders_base_id ON purchase_orders(base_id);

-- 5. 销售订单表添加基地关联
ALTER TABLE distribution_orders ADD COLUMN base_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE distribution_orders ADD CONSTRAINT fk_distribution_orders_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_distribution_orders_base_id ON distribution_orders(base_id);

-- 6. 客户表添加基地关联
ALTER TABLE customers ADD COLUMN base_id INTEGER;
ALTER TABLE customers ADD CONSTRAINT fk_customers_base 
  FOREIGN KEY (base_id) REFERENCES bases(id);
CREATE INDEX idx_customers_base_id ON customers(base_id);

COMMIT;
```

### 第四阶段: 数据迁移

```sql
-- migration_004_migrate_data.sql

BEGIN;

-- 1. 将所有用户关联到默认基地
INSERT INTO user_bases (user_id, base_id, roles, is_active)
SELECT id, 1, ARRAY['admin'], true 
FROM users;

-- 2. 设置用户默认基地
UPDATE users SET default_base_id = 1;

-- 3. 将所有商品关联到默认基地
INSERT INTO goods_bases (goods_id, base_id, is_active, retail_price, purchase_price)
SELECT id, 1, is_active, retail_price, purchase_price 
FROM goods;

-- 4. 从采购订单中提取供应商信息
INSERT INTO suppliers (code, name, created_at, updated_at)
SELECT DISTINCT 
  'SUP' || ROW_NUMBER() OVER (ORDER BY supplier_name),
  supplier_name,
  MIN(created_at),
  MAX(updated_at)
FROM purchase_orders 
WHERE supplier_name IS NOT NULL AND supplier_name != ''
GROUP BY supplier_name;

-- 5. 创建供应商基地关系
INSERT INTO supplier_bases (supplier_id, base_id, is_active)
SELECT s.id, 1, true
FROM suppliers s;

-- 6. 更新库存表的基地ID (通过location关联)
UPDATE inventory 
SET base_id = l.base_id
FROM locations l
WHERE inventory.location_id = l.id;

COMMIT;
```

### 第五阶段: 清理和优化

```sql
-- migration_005_cleanup.sql

BEGIN;

-- 1. 移除默认值
ALTER TABLE locations ALTER COLUMN base_id DROP DEFAULT;
ALTER TABLE inventory ALTER COLUMN base_id DROP DEFAULT;
ALTER TABLE purchase_orders ALTER COLUMN base_id DROP DEFAULT;
ALTER TABLE distribution_orders ALTER COLUMN base_id DROP DEFAULT;

-- 2. 添加NOT NULL约束 (如果需要)
-- ALTER TABLE users ALTER COLUMN default_base_id SET NOT NULL;

-- 3. 验证数据完整性
DO $$
BEGIN
  -- 检查是否所有位置都有基地
  IF EXISTS (SELECT 1 FROM locations WHERE base_id IS NULL) THEN
    RAISE EXCEPTION '存在未分配基地的位置';
  END IF;
  
  -- 检查是否所有库存都有基地
  IF EXISTS (SELECT 1 FROM inventory WHERE base_id IS NULL) THEN
    RAISE EXCEPTION '存在未分配基地的库存';
  END IF;
  
  RAISE NOTICE '数据迁移验证通过';
END $$;

COMMIT;
```

---

## ✅ 迁移验证

### 数据完整性检查

```sql
-- 1. 检查基地数据
SELECT COUNT(*) as base_count FROM bases;
SELECT COUNT(*) as active_base_count FROM bases WHERE is_active = true;

-- 2. 检查用户基地关系
SELECT COUNT(*) as user_base_relations FROM user_bases;
SELECT COUNT(DISTINCT user_id) as users_with_base FROM user_bases;

-- 3. 检查商品基地配置
SELECT COUNT(*) as goods_base_configs FROM goods_bases;
SELECT COUNT(DISTINCT goods_id) as goods_with_base FROM goods_bases;

-- 4. 检查业务数据基地关联
SELECT COUNT(*) as locations_with_base FROM locations WHERE base_id IS NOT NULL;
SELECT COUNT(*) as inventory_with_base FROM inventory WHERE base_id IS NOT NULL;
SELECT COUNT(*) as purchase_orders_with_base FROM purchase_orders WHERE base_id IS NOT NULL;
SELECT COUNT(*) as distribution_orders_with_base FROM distribution_orders WHERE base_id IS NOT NULL;
```

### 性能测试

```sql
-- 测试基地过滤查询性能
EXPLAIN ANALYZE SELECT * FROM inventory WHERE base_id = 1 LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM purchase_orders WHERE base_id = 1 ORDER BY created_at DESC LIMIT 20;
```

---

## 🔄 回滚计划

### 紧急回滚脚本

```sql
-- rollback_base_migration.sql

BEGIN;

-- 1. 删除新增的表
DROP TABLE IF EXISTS supplier_bases;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS goods_bases;
DROP TABLE IF EXISTS user_bases;
DROP TABLE IF EXISTS bases;

-- 2. 删除新增的字段
ALTER TABLE users DROP COLUMN IF EXISTS default_base_id;
ALTER TABLE locations DROP COLUMN IF EXISTS base_id;
ALTER TABLE inventory DROP COLUMN IF EXISTS base_id;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS base_id;
ALTER TABLE distribution_orders DROP COLUMN IF EXISTS base_id;
ALTER TABLE customers DROP COLUMN IF EXISTS base_id;

COMMIT;
```

---

## 📋 执行清单

### 迁移前准备
- [ ] 备份生产数据库
- [ ] 在测试环境验证迁移脚本
- [ ] 准备回滚方案
- [ ] 通知相关团队

### 迁移执行
- [ ] 执行 migration_001_create_bases.sql
- [ ] 执行 migration_002_create_relationships.sql
- [ ] 执行 migration_003_add_base_fields.sql
- [ ] 执行 migration_004_migrate_data.sql
- [ ] 执行 migration_005_cleanup.sql

### 迁移后验证
- [ ] 数据完整性检查
- [ ] 性能测试
- [ ] 功能测试
- [ ] 更新Prisma Schema
- [ ] 重新生成Prisma Client

---

**文档状态**: ✅ 完成  
**下一步**: 开始执行数据库迁移
