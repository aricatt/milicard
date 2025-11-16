# 模块：采购管理

- **参考截图**: `6_采购.png`
- **URL**: `/live-base/inventory/purchases`

---

## 1. 功能概述

此页面用于创建和管理采购订单。建议采购单名称使用“日期+商品名称”的格式，以便后期追踪。

**核心业务逻辑**: 创建采购单后，系统会自动在“应付”模块同步生成一条应付记录。付款操作应在“应付”模块进行，支持分批付款。

---

## 2. 页面布局与功能

### 2.1 搜索与操作

- **搜索**: 
  - 页面顶部提供按“仓库”、“日期范围”等条件进行搜索的筛选器。
  - 点击“搜索” (Search) 按钮后，下方列表根据条件进行过滤。
  - “重置” (Reset) 按钮用于清空搜索条件。
- **主要操作**:
  - **添加 (Add)**: 点击跳转到“添加采购订单”页面。
  - **导入 (Import)**: 批量导入采购订单。
  - **导出 (Export)**: 导出采购订单列表。

### 2.2 采购列表

- **数据展示**: 页面主体为一个表格，展示采购订单的详细信息。
- **分页**: 表格下方应有分页组件。
- **表格列**:
  - **ID**: 唯一标识符。
  - **日期**: 采购订单的创建日期。
  - **编号**: 采购订单的业务编号 (例如: `PUSH-L3H1QD91526L`)。
  - **名称**: 采购订单的名称或摘要。
  - **商品**: 采购的商品名称。
  - **单价**: 商品的采购单价。
  - **折扣%**: 该订单享受的折扣百分比。
  - **供应商**: 提供该商品的供应商。
  - **采购箱**: 采购数量（单位：箱）。
  - **采购盒**: 采购数量（单位：盒）。
  - **采购包**: 采购数量（单位：包）。
  - **到货箱**: 已到货数量（单位：箱）。
  - **到货盒**: 已到货数量（单位：盒）。
  - **到货包**: 已到货数量（单位：包）。
  - **操作**:
    - **删除 (Del)**: 点击后，应弹出确认对话框，确认后删除该采购记录。

---

## 3. 数据模型

```typescript
// file: src/models/purchase.ts

export interface PurchaseOrder {
  id: number;
  date: string; // ISO 8601 format
  code: string;
  name: string;
  goodsId: number; // 关联商品
  price: number;
  discount: number; // e.g., 57.00 for 57%
  supplierId: number; // 关联供应商

  // 采购数量
  purchaseQuantityBox: number;
  purchaseQuantityUnit: number; // 盒
  purchaseQuantitySubUnit: number; // 包

  // 已到货数量
  arrivalQuantityBox: number;
  arrivalQuantityUnit: number;
  arrivalQuantitySubUnit: number;
}
```

---

## 4. 已确认的业务规则

1.  **数量单位**: 采购数量由用户根据实际情况手动填写。
2.  **编辑功能**: 采购订单一旦创建不允许修改。如需更正，应删除原订单并重新创建。
