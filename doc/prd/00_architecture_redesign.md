# 系统架构重新设计 - 基地中心化架构

## 📋 文档概述

本文档定义了基于"基地"作为核心业务实体的系统架构重新设计方案。这是一个重大的架构调整，将影响系统的所有核心模块。

**创建时间**: 2025-11-20  
**版本**: v2.0  
**状态**: 设计阶段

---

## 🎯 设计目标

### 核心原则
1. **基地隔离**: 不同基地的数据完全隔离，互不干扰
2. **权限控制**: 用户只能访问所属基地的数据和功能
3. **业务完整性**: 每个基地都是一个完整的业务单元
4. **可扩展性**: 支持未来多基地、跨基地业务场景

### 业务场景
- **单基地运营**: 用户只管理一个基地的所有业务
- **多基地管理**: 管理员可以管理多个基地
- **跨基地协作**: 特定业务场景下的基地间协作
- **数据统计**: 基地级别和跨基地的数据分析

---

## 🏗️ 核心数据模型设计

### 1. Base (基地) - 核心实体

```typescript
interface Base {
  id: number;                    // 基地ID (主键)
  code: string;                  // 基地编号 (唯一)
  name: string;                  // 基地名称
  description?: string;          // 基地描述
  address?: string;              // 基地地址
  contactPerson?: string;        // 联系人
  contactPhone?: string;         // 联系电话
  isActive: boolean;             // 是否启用
  createdBy: string;             // 创建人
  updatedBy: string;             // 更新人
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}
```

### 2. 基地关联的核心实体

#### 2.1 用户与基地关系
```typescript
// 用户可以归属多个基地，每个基地有不同角色
interface UserBase {
  id: string;
  userId: string;                // 用户ID
  baseId: number;                // 基地ID
  roles: string[];               // 在该基地的角色
  isActive: boolean;             // 在该基地是否启用
  createdAt: Date;
  updatedAt: Date;
}

// 用户表增加默认基地
interface User {
  // ... 原有字段
  defaultBaseId?: number;        // 默认基地ID
  // ... 其他字段
}
```

#### 2.2 位置与基地关系
```typescript
interface Location {
  // ... 原有字段
  baseId: number;                // 归属基地ID (新增)
  // ... 其他字段
}
```

#### 2.3 商品与基地关系
```typescript
// 商品基础信息 (全局)
interface Goods {
  // ... 原有字段 (不变)
}

// 商品在各基地的配置
interface GoodsBase {
  id: string;
  goodsId: string;               // 商品ID
  baseId: number;                // 基地ID
  isActive: boolean;             // 在该基地是否启用
  retailPrice?: Decimal;         // 基地特定零售价
  purchasePrice?: Decimal;       // 基地特定采购价
  notes?: string;                // 基地特定备注
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.4 库存与基地关系
```typescript
interface Inventory {
  // ... 原有字段
  baseId: number;                // 归属基地ID (新增)
  // 通过 location.baseId 间接关联，但为了查询性能直接冗余
}
```

#### 2.5 采购与基地关系
```typescript
interface PurchaseOrder {
  // ... 原有字段
  baseId: number;                // 归属基地ID (新增)
  // ... 其他字段
}
```

#### 2.6 销售与基地关系
```typescript
interface DistributionOrder {
  // ... 原有字段
  baseId: number;                // 归属基地ID (新增)
  // ... 其他字段
}
```

#### 2.7 客户与基地关系
```typescript
interface Customer {
  // ... 原有字段
  baseId?: number;               // 归属基地ID (可选，支持跨基地客户)
  // ... 其他字段
}
```

#### 2.8 供应商与基地关系
```typescript
// 供应商基础信息 (全局)
interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 供应商与基地的合作关系
interface SupplierBase {
  id: string;
  supplierId: string;            // 供应商ID
  baseId: number;                // 基地ID
  isActive: boolean;             // 合作关系是否启用
  paymentTerms?: string;         // 付款条件
  deliveryTerms?: string;        // 交货条件
  notes?: string;                // 合作备注
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔐 权限控制设计

### 1. 基地级别权限

```typescript
// 权限资源增加基地维度
interface Permission {
  resource: string;              // 资源 (如 'goods', 'inventory')
  action: string;                // 操作 (如 'read', 'write', 'delete')
  baseId?: number;               // 基地ID (null表示全局权限)
  conditions?: object;           // 额外条件
}

// 用户权限检查
interface PermissionCheck {
  userId: string;
  resource: string;
  action: string;
  baseId: number;                // 必须指定基地
  resourceId?: string;           // 可选的具体资源ID
}
```

### 2. 权限级别定义

1. **全局管理员**: 可以管理所有基地
2. **基地管理员**: 可以管理指定基地的所有功能
3. **基地操作员**: 可以操作指定基地的特定功能
4. **基地查看员**: 只能查看指定基地的数据

---

## 🔄 数据迁移策略

### 1. 迁移步骤

#### 阶段1: 创建基地相关表
1. 创建 `bases` 表
2. 创建 `user_bases` 表
3. 创建 `goods_bases` 表
4. 创建 `supplier_bases` 表

#### 阶段2: 为现有表添加基地字段
1. 为核心业务表添加 `base_id` 字段
2. 创建相应的外键约束和索引

#### 阶段3: 数据迁移
1. 创建默认基地 "总部基地"
2. 将所有现有数据分配给默认基地
3. 将所有现有用户关联到默认基地

#### 阶段4: 更新应用代码
1. 更新所有查询逻辑，增加基地过滤
2. 更新权限检查逻辑
3. 更新API接口

### 2. 迁移脚本示例

```sql
-- 1. 创建默认基地
INSERT INTO bases (id, code, name, created_by, updated_by) 
VALUES (1, 'HQ001', '总部基地', 'system', 'system');

-- 2. 为现有数据分配基地
UPDATE locations SET base_id = 1 WHERE base_id IS NULL;
UPDATE purchase_orders SET base_id = 1 WHERE base_id IS NULL;
UPDATE distribution_orders SET base_id = 1 WHERE base_id IS NULL;

-- 3. 为现有用户分配基地
INSERT INTO user_bases (user_id, base_id, roles, is_active)
SELECT id, 1, ARRAY['admin'], true FROM users;
```

---

## 📊 API 设计调整

### 1. 基地上下文传递

所有API请求都需要包含基地上下文：

```typescript
// 方式1: URL路径参数
GET /api/v1/bases/{baseId}/goods
POST /api/v1/bases/{baseId}/purchase-orders

// 方式2: Header传递 (推荐)
Headers: {
  'X-Base-Id': '1',
  'Authorization': 'Bearer ...'
}

// 方式3: 查询参数
GET /api/v1/goods?baseId=1
```

### 2. API响应调整

```typescript
// 列表响应增加基地信息
interface BaseAwareListResponse<T> {
  baseId: number;
  baseName: string;
  data: T[];
  total: number;
  // ... 其他分页信息
}
```

### 3. 新增基地管理API

```typescript
// 基地管理
GET    /api/v1/bases                    // 获取基地列表
GET    /api/v1/bases/{id}               // 获取基地详情
POST   /api/v1/bases                    // 创建基地
PUT    /api/v1/bases/{id}               // 更新基地
DELETE /api/v1/bases/{id}               // 删除基地

// 用户基地关系管理
GET    /api/v1/bases/{id}/users         // 获取基地用户
POST   /api/v1/bases/{id}/users         // 添加用户到基地
DELETE /api/v1/bases/{id}/users/{userId} // 从基地移除用户

// 基地数据统计
GET    /api/v1/bases/{id}/dashboard     // 基地仪表板数据
GET    /api/v1/bases/summary            // 跨基地汇总数据
```

---

## 🎨 前端架构调整

### 1. 基地选择器

```typescript
// 全局基地上下文
interface BaseContext {
  currentBaseId: number;
  currentBaseName: string;
  availableBases: Base[];
  switchBase: (baseId: number) => void;
}

// 基地选择组件
const BaseSelector: React.FC = () => {
  const { currentBase, availableBases, switchBase } = useBaseContext();
  
  return (
    <Select 
      value={currentBase.id}
      onChange={switchBase}
      options={availableBases.map(base => ({
        label: base.name,
        value: base.id
      }))}
    />
  );
};
```

### 2. 路由调整

```typescript
// 路由增加基地上下文
const routes = [
  {
    path: '/bases/:baseId/goods',
    component: GoodsList,
  },
  {
    path: '/bases/:baseId/inventory',
    component: InventoryList,
  },
  // ... 其他路由
];
```

---

## 📈 性能优化考虑

### 1. 数据库优化

```sql
-- 关键索引
CREATE INDEX idx_locations_base_id ON locations(base_id);
CREATE INDEX idx_inventory_base_id ON inventory(base_id);
CREATE INDEX idx_purchase_orders_base_id ON purchase_orders(base_id);
CREATE INDEX idx_distribution_orders_base_id ON distribution_orders(base_id);

-- 复合索引
CREATE INDEX idx_goods_bases_base_goods ON goods_bases(base_id, goods_id);
CREATE INDEX idx_user_bases_user_base ON user_bases(user_id, base_id);
```

### 2. 缓存策略

```typescript
// 基地信息缓存
const baseCache = new Map<number, Base>();

// 用户基地权限缓存
const userBasePermissions = new Map<string, UserBasePermission[]>();
```

---

## 🧪 测试策略

### 1. 数据隔离测试

确保不同基地的数据完全隔离：

```typescript
describe('Base Data Isolation', () => {
  it('should not return data from other bases', async () => {
    // 创建两个基地的测试数据
    // 验证查询基地A的数据时，不会返回基地B的数据
  });
});
```

### 2. 权限测试

```typescript
describe('Base Permission Control', () => {
  it('should deny access to unauthorized base', async () => {
    // 验证用户无法访问未授权的基地数据
  });
});
```

---

## 📋 实施计划

### 第一阶段 (3-4天): 数据模型重构
- [ ] 设计完整的数据库Schema
- [ ] 创建迁移脚本
- [ ] 执行数据库迁移
- [ ] 更新Prisma模型

### 第二阶段 (5-7天): 后端重构
- [ ] 重构核心Service层
- [ ] 更新所有Controller
- [ ] 实现基地权限控制
- [ ] 更新API接口

### 第三阶段 (3-4天): 前端重构
- [ ] 实现基地上下文管理
- [ ] 更新所有页面组件
- [ ] 实现基地选择器
- [ ] 更新路由系统

### 第四阶段 (2-3天): 测试和优化
- [ ] 更新所有测试用例
- [ ] 性能测试和优化
- [ ] 文档更新
- [ ] 部署和验证

---

## ⚠️ 风险和注意事项

### 技术风险
1. **数据迁移风险**: 现有数据的完整性
2. **性能影响**: 增加基地过滤可能影响查询性能
3. **复杂度增加**: 代码复杂度显著提升

### 业务风险
1. **用户体验**: 基地切换可能影响用户操作流畅性
2. **权限复杂性**: 多基地权限管理的复杂性
3. **数据一致性**: 跨基地数据的一致性保证

### 缓解措施
1. **充分测试**: 完整的测试覆盖
2. **分阶段实施**: 逐步迁移，降低风险
3. **回滚方案**: 准备完整的回滚策略
4. **性能监控**: 实时监控系统性能

---

## 📚 相关文档

- [基地管理功能设计](./01_live_base/01_base_data/01_base_list.md)
- [权限系统设计](./02_permission_system.md)
- [数据库迁移指南](./03_database_migration.md)

---

**文档状态**: ✅ 完成  
**下一步**: 开始数据库Schema设计和迁移脚本编写
