# 字段权限功能修复问题汇总

## 概述
本文档汇总了在实现和修复字段权限功能过程中遇到的所有问题及解决方案，用于指导后续其他页面的字段权限配置。

---

## 问题分类

### 1. 字段名称不匹配问题

#### 问题描述
前端字段权限配置中的字段名与后端实际返回的字段名不一致，导致字段权限配置无效。

#### 典型案例
**采购订单**：
- ❌ 配置中使用：`code`
- ✅ 实际字段：`orderNo`

**到货单/调货单**：
- ❌ 配置中使用：`code`
- ✅ 实际字段：`arrivalNo` / `transferNo`

#### 解决方案
1. 检查后端数据库 Schema 或 Service 返回的字段名
2. 检查后端 Controller 的响应数据结构
3. 确保前端字段权限配置使用**完全相同**的字段名（区分大小写）

#### 验证方法
```typescript
// 1. 查看 Prisma Schema
model PurchaseOrder {
  orderNo  String  // ✅ 使用 orderNo
}

// 2. 查看 Service 返回
return {
  orderNo: order.orderNo,  // ✅ 返回 orderNo
}

// 3. 前端配置
{ key: 'orderNo', label: '订单号' }  // ✅ 配置 orderNo
```

---

### 2. 字段定义不完整问题

#### 问题描述
前端字段权限配置只列出了部分字段，但后端实际返回的字段更多，导致用户无法配置所有字段的权限。

#### 典型案例
**采购订单**：
- 配置中只有 5 个字段
- 实际返回 38+ 个字段（包括关联查询的商品信息、品类信息、数量、单价等）

#### 解决方案
1. **检查后端实际返回的完整数据结构**
2. **包含所有关联查询的字段**（JOIN 查询的字段）
3. **包含计算字段**（如单价、折扣等）
4. **包含嵌套对象和数组字段**

#### 字段类型清单
```typescript
// 基本字段
{ key: 'id', label: 'ID', type: 'string' }
{ key: 'name', label: '名称', type: 'string' }
{ key: 'amount', label: '金额', type: 'number' }
{ key: 'isActive', label: '状态', type: 'boolean' }
{ key: 'createdAt', label: '创建时间', type: 'date' }

// 关联字段（JOIN 查询）
{ key: 'goodsName', label: '商品名称', type: 'string' }
{ key: 'categoryName', label: '品类名称', type: 'string' }

// 嵌套对象
{ key: 'goods', label: '商品信息', type: 'object' }
{ key: 'category', label: '品类信息', type: 'object' }

// 数组字段
{ key: 'items', label: '明细', type: 'array' }

// 计算字段
{ key: 'unitPriceBox', label: '箱单价', type: 'number' }
{ key: 'diffBoxQty', label: '相差箱数', type: 'number' }
```

---

### 3. 缺少字段权限过滤中间件

#### 问题描述
路由只有权限检查中间件，但没有字段权限过滤中间件，导致字段权限配置不生效。

#### 典型案例
```typescript
// ❌ 只有权限检查
router.get('/', 
  checkSystemPermission('category', 'read'), 
  categoryController.list
)

// ✅ 添加字段权限过滤
router.get('/', 
  checkSystemPermission('category', 'read'),
  injectDataPermission('category'),    // 注入权限上下文
  filterResponseFields(),               // 过滤响应字段
  categoryController.list
)
```

#### 解决方案
为所有**查询类路由**添加字段权限过滤中间件：
- `injectDataPermission(resourceName)` - 注入权限上下文
- `filterResponseFields()` - 过滤响应字段

#### 需要添加的路由类型
- ✅ GET 列表接口
- ✅ GET 详情接口
- ✅ GET 搜索接口
- ✅ GET 统计接口
- ❌ POST/PUT/DELETE 接口（不需要）

---

### 4. 响应数据格式不兼容问题

#### 问题描述
字段权限过滤中间件只支持特定的响应格式，导致某些 API 的字段权限过滤失效。

#### 支持的响应格式

**格式1：标准格式**（采购订单、全局商品、货币汇率）
```typescript
{
  success: true,
  data: [...] 或 {...},
  pagination: {...}  // 可选
}
```

**格式2：分页格式**（商品品类）
```typescript
{
  data: [...],
  pagination: {...}
}
```

**格式3：直接数组**
```typescript
[...]
```

**格式4：直接对象**
```typescript
{...}
```

#### 解决方案
字段权限过滤中间件已更新支持所有4种格式，无需额外处理。

---

### 5. 全局组件数据被过滤问题

#### 问题描述
全局组件（如 `BaseSwitcher`）使用的 API 被添加了字段权限过滤，导致关键字段被过滤掉，引发运行时错误。

#### 典型案例
```typescript
// BaseSwitcher 组件
currencyRate.fixedRate.toFixed(2)  // ❌ TypeError: Cannot read properties of undefined

// 原因：/api/v1/currency-rates/with-live-rates 被添加了字段权限过滤
// 用户角色配置中 fixedRate 被过滤掉
```

#### 解决方案
**全局组件使用的 API 不应用字段权限过滤**：

```typescript
// ✅ 全局组件用的接口 - 不过滤
router.get('/with-live-rates', 
  checkSystemPermission('currency_rate', 'read'), 
  CurrencyRateController.getAllWithLiveRates
)

// ✅ 管理页面用的接口 - 应用过滤
router.get('/', 
  checkSystemPermission('currency_rate', 'read'),
  injectDataPermission('currencyRate'),
  filterResponseFields(),
  CurrencyRateController.getList
)
```

#### 识别全局组件 API
- 被 `BaseContext` 使用的接口
- 被顶部导航栏使用的接口
- 被侧边栏使用的接口
- 被全局下拉选择器使用的接口

---

### 6. 保存逻辑问题

#### 问题描述
前端保存字段权限时，只保存修改过的字段，导致其他字段没有记录，后端认为只有明确配置的字段才可读。

#### 典型案例
```typescript
// ❌ 只保存修改的字段
用户只取消勾选了 totalAmount
数据库中只有 1 条记录：totalAmount: canRead=false
后端返回 readable = []  // 空数组，所有字段被过滤

// ✅ 保存所有字段的完整状态
用户取消勾选了 totalAmount
数据库中有 38 条记录：
  - totalAmount: canRead=false
  - orderNo: canRead=true
  - supplierName: canRead=true
  - ... (其他 35 个字段都是 true)
后端返回 readable = ['orderNo', 'supplierName', ...]
```

#### 解决方案
前端保存时，保存**当前资源的所有字段**：

```typescript
// ✅ 修复后的保存逻辑
const permissionsToSave = currentFields.map(field => {
  const key = `${selectedResource}:${field.key}`;
  const perm = permissions.get(key);
  return {
    roleId,
    resource: selectedResource,
    field: field.key,
    canRead: perm?.canRead ?? true,   // 未配置默认为 true
    canWrite: perm?.canWrite ?? true,
  };
});
```

---

## 完整修复流程

### 步骤1：检查后端数据结构
```bash
# 1. 查看数据库 Schema
cat server/prisma/schema.prisma | grep -A 20 "model Category"

# 2. 查看 Service 返回
cat server/src/services/categoryService.ts | grep -A 30 "toResponse"

# 3. 查看 Controller 响应
cat server/src/controllers/categoryController.ts | grep -A 10 "res.json"
```

### 步骤2：更新前端字段权限配置
```typescript
// client/src/pages/system/roles/components/FieldPermissionConfig.tsx

{
  key: 'category',
  label: '商品品类',
  fields: [
    // 包含所有实际返回的字段
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'code', label: '品类编码', type: 'string' },
    { key: 'name', label: '品类名称', type: 'string' },
    { key: 'description', label: '描述', type: 'string' },
    { key: 'sortOrder', label: '排序', type: 'number' },
    { key: 'isActive', label: '状态', type: 'boolean' },
    { key: 'createdAt', label: '创建时间', type: 'date' },
    { key: 'updatedAt', label: '更新时间', type: 'date' },
  ],
}
```

### 步骤3：添加字段权限过滤中间件
```typescript
// server/src/routes/categoryRoutes.ts

import { 
  checkSystemPermission, 
  injectDataPermission, 
  filterResponseFields 
} from '../middleware/permissionMiddleware'

// 查询接口添加字段过滤
router.get('/', 
  checkSystemPermission('category', 'read'),
  injectDataPermission('category'),
  filterResponseFields(),
  categoryController.list
)
```

### 步骤4：验证功能
1. 重启后端服务
2. 刷新前端页面
3. 配置字段权限（取消勾选某个字段）
4. 保存配置
5. 用该角色用户登录测试
6. 检查被取消勾选的字段是否不显示

---

## 注意事项

### 1. 默认权限行为
```typescript
// 后端逻辑
if (permissions.length === 0) {
  // 没有配置字段权限，默认允许所有
  return { readable: ['*'], writable: ['*'] }
}
```
**结论**：新建角色默认所有字段可读可写，不需要手动配置。

### 2. 字段名称大小写
- 字段名称**严格区分大小写**
- 必须与后端返回的字段名**完全一致**
- 推荐使用驼峰命名（camelCase）

### 3. 嵌套对象处理
```typescript
// 后端返回
{
  goods: {
    id: '123',
    name: '商品A',
    category: {
      code: 'CARD',
      name: '卡牌'
    }
  }
}

// 字段权限配置
{ key: 'goods', label: '商品信息', type: 'object' }
// 注意：过滤 goods 字段会过滤整个对象
```

### 4. 数组字段处理
```typescript
// 后端返回
{
  items: [
    { goodsId: '1', quantity: 10 },
    { goodsId: '2', quantity: 20 }
  ]
}

// 字段权限配置
{ key: 'items', label: '订单明细', type: 'array' }
// 注意：过滤 items 字段会过滤整个数组
```

### 5. ID 字段特殊处理
```typescript
// filterObject 函数
// 始终保留 id 字段（用于关联查询）
if ('id' in obj) {
  filtered.id = obj.id
}
```
**结论**：`id` 字段始终可读，无法通过字段权限过滤。

---

## 快速检查清单

### 新页面添加字段权限前检查

- [ ] 1. 确认后端返回的完整字段列表
- [ ] 2. 确认字段名称（大小写）与后端一致
- [ ] 3. 包含所有关联查询的字段
- [ ] 4. 包含所有计算字段
- [ ] 5. 包含嵌套对象和数组字段
- [ ] 6. 为查询路由添加 `injectDataPermission` 和 `filterResponseFields`
- [ ] 7. 确认不是全局组件使用的 API
- [ ] 8. 测试字段权限配置和过滤效果

### 调试字段权限问题

```typescript
// 1. 查看后端日志（已添加调试日志）
// 日志会显示：readable 字段列表、URL、请求方法

// 2. 查看数据库记录
SELECT * FROM field_permissions 
WHERE role_id = 'xxx' AND resource = 'category';

// 3. 测试 API 响应
// 使用 Postman 或浏览器开发者工具查看实际响应数据

// 4. 检查字段权限上下文
// 在 filterResponseFields 中添加 console.log
console.log('fieldPermissions:', req.permissionContext?.fieldPermissions)
```

---

## 已修复的页面

| 页面 | 资源名 | 字段数量 | 状态 | 备注 |
|------|--------|----------|------|------|
| 采购订单 | purchaseOrder | 38 | ✅ | 包含关联字段 |
| 到货单 | arrivalOrder | 10 | ✅ | 字段名已修正 |
| 调货单 | transferOrder | 10 | ✅ | 字段名已修正 |
| 点位订单 | pointOrder | 28 | ✅ | 完整字段 |
| 商品品类 | category | 8 | ✅ | 响应格式已修复 |
| 全局商品 | goods | 21 | ✅ | 完整字段 |
| 货币汇率 | currencyRate | 8 | ✅ | 全局接口已排除 |

---

## 待处理的页面

建议按以下优先级处理其他页面的字段权限配置：

### 高优先级
- [ ] 基地管理（base）
- [ ] 点位管理（point）
- [ ] 用户管理（user）

### 中优先级
- [ ] 库存管理（inventory）
- [ ] 直播间/仓库（location）
- [ ] 人员管理（personnel）

### 低优先级
- [ ] 消耗记录（stockConsumption）
- [ ] 其他辅助页面

---

## 总结

字段权限功能的核心问题：
1. **字段名称必须完全匹配**
2. **字段定义必须完整**
3. **必须添加过滤中间件**
4. **响应格式必须兼容**
5. **全局组件接口需排除**
6. **保存逻辑必须完整**

遵循本文档的检查清单和修复流程，可以快速、准确地为其他页面添加字段权限功能。
