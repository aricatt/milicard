# 商品页面 ProTable 改造状态

## ✅ 已完成部分

### 1. 数据类型定义 ✅
- ✅ Supplier → Product
- ✅ SupplierStats → ProductStats
- ✅ 添加商品特有字段（alias, manufacturer, retailPrice, packPrice, etc.）

### 2. API 调用修改 ✅
- ✅ `/api/v1/bases/:baseId/suppliers` → `/api/v1/bases/:baseId/goods`
- ✅ 参数名修改：`current` → `page`
- ✅ 参数名修改：`name` → `search`
- ✅ 响应格式：`result.total` → `result.pagination.total`
- ✅ 添加 `manufacturer` 筛选参数

### 3. CRUD 方法修改 ✅
- ✅ `handleCreate` - 创建商品（添加 boxQuantity: 1）
- ✅ `handleUpdate` - 更新商品
- ✅ `handleDelete` - 删除商品
- ✅ `handleEdit` - 编辑表单字段设置

### 4. 统计计算 ✅
- ✅ `calculateStats` - 修改为商品统计
- ✅ totalGoods, activeGoods, inactiveGoods, totalManufacturers

### 5. 变量名修改 ✅
- ✅ `editingSupplier` → `editingProduct`
- ✅ `fetchSupplierData` → `fetchProductData`

---

## 🔄 待完成部分

### 1. 列定义（columns）⚠️
**当前状态**：仍使用供应商列定义
**需要修改**：
```typescript
const columns: ProColumns<Supplier>[] = [  // ❌ 需改为 Product
  // 供应商字段...
]
```

**应改为商品列定义**：
- 编号（code）
- 商品名称（name）
- 别名（alias）
- 厂家（manufacturer）
- 描述（description）
- 零售价（retailPrice）
- 平拆价（packPrice）
- 采购价（purchasePrice）
- 箱数（boxQuantity）
- 盒/箱（packPerBox）
- 包/盒（piecePerPack）
- 图片（imageUrl）
- 备注（notes）
- 状态（isActive）
- 创建时间（createdAt）
- 更新时间（updatedAt）
- 操作（action）

### 2. 统计详情内容（statsContent）⚠️
**当前状态**：仍使用供应商统计字段
```typescript
stats.totalSuppliers  // ❌ 应改为 stats.totalGoods
stats.activeSuppliers  // ❌ 应改为 stats.activeGoods
stats.inactiveSuppliers  // ❌ 应改为 stats.inactiveGoods
stats.recentlyAdded  // ❌ 应改为 stats.totalManufacturers
```

### 3. ProTable 配置 ⚠️
**需要修改**：
```typescript
<ProTable<Supplier>  // ❌ 需改为 Product
  request={fetchSupplierData}  // ❌ 需改为 fetchProductData
  columnsState={{
    persistenceKey: 'supplier-table-columns',  // ❌ 需改为 'product-table-columns'
    // ...
  }}
  headerTitle={
    <Space>
      <span>供应商列表</span>  // ❌ 需改为 商品列表
      <span>(共 {stats.totalSuppliers} 家)</span>  // ❌ 需改为 totalGoods 个
    </Space>
  }
/>
```

### 4. 表单内容 ⚠️
**创建表单**：需要完全重写为商品字段
**编辑表单**：需要完全重写为商品字段

---

## 📝 快速修复方案

### 方案 1：手动完成（推荐）⏱️ 10-15分钟
参照 `x:\Gits\_ari_milicard\client\src\pages\live-base\products\index.tsx.backup` 中的：
1. 列定义（第113-285行）
2. 表单内容（第714-890行）

复制到 `index-protable.tsx` 并调整为 ProColumns 格式。

### 方案 2：使用备份文件 ⏱️ 5分钟
1. 保留 `index-protable.tsx` 中已修改的部分（第1-282行）
2. 从备份文件复制列定义和表单
3. 手动调整格式

---

## 🎯 关键差异点

### 商品 vs 供应商

| 特性 | 供应商 | 商品 |
|------|--------|------|
| API路径 | `/suppliers` | `/goods` |
| 参数名 | `current` | `page` |
| 搜索参数 | `name` | `search` |
| 响应格式 | `result.total` | `result.pagination.total` |
| 特殊字段 | contactPerson, phone, email, address | alias, manufacturer, retailPrice, packPrice, packPerBox, piecePerPack |
| 固定值 | 无 | boxQuantity = 1 |
| 统计项 | 总数、启用、禁用、近7天新增 | 总数、启用、禁用、厂家数量 |

---

## 📂 文件位置

```
client/src/pages/live-base/products/
├── index.tsx                    # 原版本（Table）
├── index.tsx.backup             # 备份
└── index-protable.tsx           # ProTable版本（进行中）
```

---

## 🚀 下一步操作

### 选项 A：我继续完成 ⏱️ 需要多次交互
由于文件较大（800+行），需要分多次修改列定义、统计内容、表单等。

### 选项 B：您手动完成 ⏱️ 10-15分钟
1. 打开 `index-protable.tsx`
2. 搜索 `Supplier` 全局替换为 `Product`
3. 修改列定义（参照备份文件）
4. 修改表单内容（参照备份文件）
5. 修改统计详情
6. 测试功能

### 选项 C：混合方式 ⏱️ 最快
1. 我提供完整的列定义代码
2. 您复制粘贴替换
3. 我提供表单代码
4. 您复制粘贴替换

---

**建议**：由于改造工作量较大，建议采用 **选项 C（混合方式）**，这样最快且最准确。

**您希望采用哪种方式？**
