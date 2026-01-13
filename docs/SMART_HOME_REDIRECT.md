# 智能首页跳转功能

## 功能概述

当用户选择基地后，系统会根据用户的权限智能选择首页，而不是硬编码跳转到固定页面。如果用户没有默认页面的访问权限，系统会自动跳转到第一个有权限的页面。

## 问题背景

### 原有问题
- 用户选择基地后，系统会跳转到固定的默认页面：
  - **直播基地** → `/live-base/locations`（直播间/仓库页）
  - **线下区域** → `/offline-region/sub-districts`（小区页）
- 如果用户没有这些页面的访问权限，会显示 **404 或空白页面**
- 用户体验不佳，需要手动寻找有权限的页面

### 解决方案
实现智能首页跳转机制：
1. 根据基地类型获取所有可能的页面列表
2. 按优先级顺序检查用户权限
3. 跳转到第一个有权限的页面
4. 如果没有任何权限，显示友好的错误提示

## 技术实现

### 1. 路由辅助工具 (`routeHelper.ts`)

**文件位置**: `client/src/utils/routeHelper.ts`

**核心功能**:
```typescript
// 获取第一个有权限的路由
getFirstAccessibleRoute(baseType: BaseType, access: any): { path: string; name: string } | null

// 获取默认首页路径（向后兼容）
getDefaultHomePath(baseType: BaseType): string
```

**路由优先级**:

#### 直播基地路由（按优先级排序）
1. 直播间/仓库 (`/live-base/locations`)
2. 基地列表 (`/live-base/base-data/bases`)
3. 商品设置 (`/live-base/products`)
4. 供应商 (`/live-base/suppliers`)
5. 采购管理 (`/live-base/procurement`)
6. 到货管理 (`/live-base/arrivals`)
7. 调货管理 (`/live-base/transfers`)
8. 库存消耗 (`/live-base/inventory-consumption`)
9. 主播利润 (`/live-base/anchor-profit`)
10. 出库管理 (`/live-base/stock-out`)
11. 实时库存 (`/live-base/real-time-stock`)
12. 应付管理 (`/live-base/payables`)
13. 应收管理 (`/live-base/receivables`)
14. 人员管理 (`/live-base/personnel`)

#### 线下区域路由（按优先级排序）
1. 小区/仓库 (`/offline-region/sub-districts`)
2. 大区管理 (`/offline-region/districts`)
3. 商品设置 (`/offline-region/products`)
4. 供应商 (`/offline-region/suppliers`)
5. 采购管理 (`/offline-region/procurement`)
6. 到货管理 (`/offline-region/arrivals`)
7. 出库管理 (`/offline-region/stock-out`)
8. 实时库存 (`/offline-region/real-time-stock`)
9. 应付管理 (`/offline-region/payables`)
10. 应收管理 (`/offline-region/receivables`)
11. 仓管人员 (`/offline-region/warehouse-keepers`)
12. 点位管理 (`/offline-region/point-info/points`)
13. 点位订单 (`/offline-region/point-info/point-orders`)
14. 点位利润 (`/offline-region/point-info/location-profit`)

### 2. 基地选择器优化 (`BaseSelector.tsx`)

**修改内容**:
- 导入智能路由选择工具
- 修改 `handleSelectBase` 函数使用智能路由选择
- 添加无权限时的友好提示

**核心逻辑**:
```typescript
const handleSelectBase = (base: BaseInfo) => {
  // 保存基地到 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  
  // 智能选择首页
  const accessibleRoute = getFirstAccessibleRoute(base.type, access);
  
  if (!accessibleRoute) {
    // 没有任何可访问的页面
    Modal.error({
      title: '无访问权限',
      content: `您当前没有访问基地"${base.name}"任何页面的权限。请联系管理员为您分配相应的权限。`,
    });
    return;
  }
  
  // 跳转到有权限的页面
  message.success(`已选择基地：${base.name}，正在进入${accessibleRoute.name}...`);
  window.location.href = `${window.location.origin}${accessibleRoute.path}`;
};
```

### 3. 权限重定向组件 (`AccessRedirect`)

**文件位置**: `client/src/components/AccessRedirect/index.tsx`

**功能**: 额外的保护层，当用户直接访问没有权限的页面时自动重定向

**使用方式**（可选）:
```tsx
// 在 app.tsx 或布局组件中包裹
<AccessRedirect>
  {children}
</AccessRedirect>
```

## 权限映射

系统使用以下权限键名来控制页面访问：

| 页面 | 权限键名 |
|------|---------|
| 直播间/仓库、小区/仓库 | `canAccessLocations` |
| 基地列表、大区管理 | `canAccessBases` |
| 商品设置 | `canAccessProducts` |
| 供应商 | `canAccessSuppliers` |
| 采购管理 | `canAccessProcurement` |
| 到货管理 | `canAccessArrivals` |
| 调货管理 | `canAccessTransfers` |
| 库存消耗 | `canAccessInventoryConsumption` |
| 主播利润、点位利润 | `canAccessAnchorProfit` |
| 出库管理 | `canAccessStockOut` |
| 实时库存 | `canAccessStock` |
| 应付管理 | `canAccessPayables` |
| 应收管理 | `canAccessReceivables` |
| 人员管理、仓管人员 | `canAccessPersonnel` |
| 点位管理 | `canAccessPoint` |
| 点位订单 | `canAccessPointOrder` |

## 用户体验

### 场景 1: 有默认页面权限
```
用户选择基地 → 跳转到默认首页（直播间/仓库 或 小区/仓库）
提示: "已选择基地：XXX，正在进入直播间/仓库..."
```

### 场景 2: 没有默认页面权限，但有其他页面权限
```
用户选择基地 → 自动跳转到第一个有权限的页面
提示: "已选择基地：XXX，正在进入商品设置..."
```

### 场景 3: 没有任何页面权限
```
用户选择基地 → 显示错误对话框，不进行跳转
提示: "您当前没有访问基地"XXX"任何页面的权限。请联系管理员为您分配相应的权限。"
```

## 优势

1. **智能化**: 自动根据权限选择合适的首页
2. **用户友好**: 避免 404 错误，提供清晰的权限提示
3. **灵活性**: 支持不同角色有不同的默认首页
4. **可维护性**: 集中管理路由优先级，易于调整
5. **向后兼容**: 保留默认路径作为后备方案

## 测试建议

### 测试用例

1. **超级管理员**
   - 应该跳转到默认首页（直播间/仓库 或 小区/仓库）

2. **只有商品权限的用户**
   - 应该跳转到商品设置页
   - 提示: "正在进入商品设置..."

3. **只有采购权限的用户**
   - 应该跳转到采购管理页
   - 提示: "正在进入采购管理..."

4. **没有任何权限的用户**
   - 显示错误对话框
   - 不进行跳转

5. **有多个权限的用户**
   - 跳转到优先级最高的页面

## 配置说明

### 调整路由优先级

如需调整路由优先级，修改 `routeHelper.ts` 中的路由列表顺序：

```typescript
const LIVE_BASE_ROUTES: RouteConfig[] = [
  // 将最优先的路由放在最前面
  { path: '/live-base/products', access: 'canAccessProducts', name: '商品设置' },
  { path: '/live-base/locations', access: 'canAccessLocations', name: '直播间/仓库' },
  // ...
];
```

### 添加新路由

在路由列表中添加新的路由配置：

```typescript
{
  path: '/live-base/new-page',
  access: 'canAccessNewPage',
  name: '新页面'
}
```

## 相关文件

- `client/src/utils/routeHelper.ts` - 路由辅助工具
- `client/src/pages/BaseSelector.tsx` - 基地选择器
- `client/src/components/AccessRedirect/index.tsx` - 权限重定向组件
- `client/src/access.ts` - 权限配置
- `client/config/routes.ts` - 路由配置

## 注意事项

1. 确保 `access.ts` 中的权限键名与路由配置中的 `access` 字段一致
2. 新增页面时，记得在 `routeHelper.ts` 中添加对应的路由配置
3. 路由优先级会影响用户的默认首页，请谨慎调整
4. 管理员（ADMIN、SUPER_ADMIN）默认拥有所有权限

## 更新日志

- **2026-01-13**: 初始版本，实现智能首页跳转功能
