# 商品库存阈值功能实现文档

## 功能概述
为每个商品设置独立的库存阈值，用于判断"库存不足"状态。支持用户选择单位（箱/盒/包）。

## 数据结构

### 1. GoodsLocalSetting 表
添加字段：`stock_threshold` (JSONB)

```json
{
  "value": 5,           // 阈值数值
  "unit": "box",        // 单位: "box" | "pack" | "piece"
  "enabled": true       // 是否启用
}
```

### 2. GlobalSetting 配置
配置项：`stock.low_quantity_threshold`
- 类型：JSON
- 用途：全局默认库存阈值
- 数据结构：与商品阈值相同

## 判断优先级

```typescript
function isLowStock(goods, stock) {
  // 1. 优先使用商品自定义阈值（如果启用）
  if (goods.stockThreshold?.enabled) {
    const totalInUnit = convertToUnit(stock, goods.stockThreshold.unit);
    return totalInUnit < goods.stockThreshold.value;
  }
  
  // 2. 其次使用全局默认阈值
  const globalThreshold = await getGlobalSetting('stock.low_quantity_threshold');
  if (globalThreshold?.enabled) {
    const totalInUnit = convertToUnit(stock, globalThreshold.unit);
    return totalInUnit < globalThreshold.value;
  }
  
  // 3. 最后使用硬编码默认值
  return stock.box < 5;
}
```

## 实施进度

### ✅ 已完成
1. 数据库迁移 - 添加 `stock_threshold` 字段到 `goods_local_settings` 表
2. TypeScript 类型定义 - `StockThreshold`, `StockThresholdUnit`
3. GoodsService 更新 - 支持阈值的读写

### 🚧 进行中
4. GlobalSetting 添加默认阈值配置
5. StockService 更新 - 使用阈值判断库存不足

### ⏳ 待完成
6. 商品页面 UI - 添加阈值配置表单
7. 实时库存页面 - 使用新的阈值判断逻辑
8. 系统设置页面 - 添加全局默认阈值配置

## 文件修改清单

### 后端
- ✅ `server/prisma/schema.prisma` - 添加字段
- ✅ `server/prisma/migrations/xxx/migration.sql` - 迁移文件
- ✅ `server/src/types/goods.ts` - 类型定义
- ✅ `server/src/services/goodsService.ts` - 支持阈值读写
- ⏳ `server/src/services/stockService.ts` - 使用阈值判断
- ⏳ `server/src/services/globalSettingService.ts` - 默认阈值配置

### 前端
- ⏳ `client/src/pages/live-base/products/index.tsx` - 商品列表页面
- ⏳ `client/src/pages/live-base/products/components/GoodsForm.tsx` - 商品表单
- ⏳ `client/src/pages/live-base/real-time-stock/index.tsx` - 实时库存页面
- ⏳ `client/src/pages/offline-region/real-time-stock/index.tsx` - 线下区域实时库存
- ⏳ `client/src/pages/system/global-settings/index.tsx` - 系统设置页面

## 使用示例

### 设置商品阈值（商品页面）
```typescript
// 编辑商品时设置阈值
{
  ...otherFields,
  stockThreshold: {
    value: 10,
    unit: 'pack',
    enabled: true
  }
}
```

### 判断库存状态（实时库存页面）
```typescript
// 前端显示
if (record.stockBox === 0 && record.stockPack === 0 && record.stockPiece === 0) {
  return <Tag color="red">无库存</Tag>;
}
if (isLowStock(record)) {
  return <Tag color="warning">库存不足</Tag>;
}
return <Tag color="green">正常</Tag>;
```

## 注意事项

1. **不区分仓库**：阈值是商品级别的，不区分不同仓库
2. **无变更历史**：不记录阈值的变更历史
3. **默认无阈值**：新商品默认没有阈值，使用全局默认值
4. **暂不通知**：库存低于阈值时暂不发送通知

## 下一步工作

1. 实现 StockService 中的阈值判断逻辑
2. 在商品页面添加阈值配置 UI
3. 更新实时库存页面使用新的判断逻辑
4. 在系统设置中添加全局默认阈值配置
