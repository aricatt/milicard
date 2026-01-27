# 库存阈值功能 - 前端实现指南

## 已完成的后端工作

✅ 数据库迁移 - 添加 `stock_threshold` 字段
✅ TypeScript 类型定义
✅ GoodsService - 支持阈值读写
✅ StockService - 实现阈值判断逻辑
✅ GlobalSetting - 添加全局默认阈值

## 前端待实现内容

### 1. 商品页面 - 添加阈值配置

**文件**: `client/src/pages/live-base/products/index.tsx`

**需要添加的代码**（在编辑表单中，packPrice 字段后面）:

```tsx
{/* 库存阈值配置 */}
<Form.Item label="库存预警设置">
  <Space direction="vertical" style={{ width: '100%' }}>
    <Form.Item
      name={['stockThreshold', 'enabled']}
      valuePropName="checked"
      noStyle
    >
      <Checkbox>启用库存预警</Checkbox>
    </Form.Item>
    
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue }) => {
        const enabled = getFieldValue(['stockThreshold', 'enabled']);
        return enabled ? (
          <Space>
            <span>当库存少于</span>
            <Form.Item
              name={['stockThreshold', 'value']}
              noStyle
              rules={[
                { required: true, message: '请输入阈值' },
                { type: 'number', min: 0, message: '阈值不能小于0' }
              ]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: 100 }}
                placeholder="阈值"
              />
            </Form.Item>
            <Form.Item
              name={['stockThreshold', 'unit']}
              noStyle
              rules={[{ required: true, message: '请选择单位' }]}
            >
              <Select style={{ width: 80 }}>
                <Select.Option value="box">箱</Select.Option>
                <Select.Option value="pack">盒</Select.Option>
                <Select.Option value="piece">包</Select.Option>
              </Select>
            </Form.Item>
            <span>时显示预警</span>
          </Space>
        ) : null;
      }}
    </Form.Item>
  </Space>
</Form.Item>
```

**修改 handleEdit 函数**（设置初始值）:

```tsx
const handleEdit = (record: ProductSetting) => {
  setEditingSetting(record);
  editForm.setFieldsValue({
    retailPrice: typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice as any || '0'),
    packPrice: record.packPrice ? (typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice as any)) : undefined,
    purchasePrice: record.purchasePrice ? (typeof record.purchasePrice === 'number' ? record.purchasePrice : parseFloat(record.purchasePrice as any)) : undefined,
    alias: record.alias || undefined,
    // 添加库存阈值初始值
    stockThreshold: record.stockThreshold || {
      enabled: false,
      value: 5,
      unit: 'box'
    },
  });
  setEditModalVisible(true);
};
```

**修改 ProductSetting 接口**（添加类型定义）:

```tsx
interface ProductSetting {
  id: string;
  goods: GlobalProduct;
  retailPrice: number | string;
  packPrice?: number | string | null;
  purchasePrice?: number | string | null;
  alias?: string | null;
  stockThreshold?: {
    value: number;
    unit: 'box' | 'pack' | 'piece';
    enabled: boolean;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 2. 实时库存页面 - 使用阈值判断

**文件**: `client/src/pages/live-base/real-time-stock/index.tsx`

**修改 RealTimeStock 接口**:

```tsx
interface RealTimeStock {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  goodsNameI18n?: NameI18n | null;
  categoryCode?: string;
  categoryName?: string;
  categoryNameI18n?: NameI18n | null;
  packPerBox: number;
  piecePerPack: number;
  stockBox: number;
  stockPack: number;
  stockPiece: number;
  warehouseNames?: string;
  isLowStock?: boolean;  // 新增字段
  avgPricePerBox: number;
  avgPricePerPack: number;
  avgPricePerPiece: number;
  totalValue: number;
}
```

**修改状态列的 render 函数**:

```tsx
{
  title: intl.formatMessage({ id: 'table.column.status' }),
  key: 'status',
  width: 80,
  search: false,
  render: (_, record) => {
    // 检查是否无库存（箱、盒、包都为0）
    if (record.stockBox === 0 && record.stockPack === 0 && record.stockPiece === 0) {
      return <Tag color="red">无库存</Tag>;
    }
    // 使用后端返回的 isLowStock 标志
    if (record.isLowStock) {
      return <Tag color="warning">库存不足</Tag>;
    }
    return <Tag color="green">{intl.formatMessage({ id: 'inventory.status.normal' })}</Tag>;
  },
},
```

### 3. 线下区域实时库存页面

**文件**: `client/src/pages/offline-region/real-time-stock/index.tsx`

与直播基地实时库存页面的修改完全相同：
1. 添加 `isLowStock` 字段到接口
2. 修改状态列使用 `isLowStock` 判断

### 4. 系统设置页面（可选）

**文件**: `client/src/pages/system/global-settings/index.tsx`

如果需要在系统设置中配置全局默认阈值，可以添加一个专门的配置项。

**配置项示例**:

```tsx
{
  key: 'stock.low_quantity_threshold',
  label: '库存不足预警阈值（全局默认）',
  type: 'json',
  component: (
    <Space>
      <InputNumber min={0} precision={0} placeholder="阈值" />
      <Select style={{ width: 80 }}>
        <Select.Option value="box">箱</Select.Option>
        <Select.Option value="pack">盒</Select.Option>
        <Select.Option value="piece">包</Select.Option>
      </Select>
      <Checkbox>启用</Checkbox>
    </Space>
  )
}
```

## 测试步骤

### 1. 测试商品阈值设置

1. 进入商品管理页面 `/live-base/products`
2. 点击编辑某个商品
3. 勾选"启用库存预警"
4. 设置阈值，例如：10 盒
5. 保存并验证数据已保存

### 2. 测试实时库存显示

1. 进入实时库存页面 `/live-base/real-time-stock`
2. 查看商品状态列：
   - 库存为0的商品显示红色"无库存"
   - 库存低于阈值的商品显示黄色"库存不足"
   - 其他商品显示绿色"正常"

### 3. 测试全局默认阈值

1. 进入系统设置页面
2. 找到"库存不足预警阈值"配置项
3. 修改全局默认值
4. 验证未设置阈值的商品使用全局默认值

## API 响应示例

### 商品详情 API

```json
{
  "id": "xxx",
  "code": "GOODS-XXX",
  "name": "商品名称",
  "stockThreshold": {
    "value": 10,
    "unit": "pack",
    "enabled": true
  },
  ...
}
```

### 实时库存 API

```json
{
  "data": [
    {
      "goodsId": "xxx",
      "goodsCode": "GOODS-XXX",
      "goodsName": "商品名称",
      "stockBox": 3,
      "stockPack": 5,
      "stockPiece": 10,
      "isLowStock": true,
      ...
    }
  ],
  "total": 100
}
```

## 注意事项

1. **类型安全**: 确保 TypeScript 类型定义正确
2. **表单验证**: 启用阈值时，value 和 unit 必填
3. **默认值**: 新商品默认不启用阈值
4. **性能**: 阈值判断在后端完成，前端只需显示结果
5. **兼容性**: 旧数据没有 stockThreshold 字段，需要处理 null/undefined

## 完成标志

- [ ] 商品编辑表单添加阈值配置
- [ ] 商品列表显示阈值信息（可选）
- [ ] 实时库存页面使用 isLowStock 标志
- [ ] 线下区域实时库存页面同步更新
- [ ] 系统设置页面添加全局配置（可选）
- [ ] 测试所有功能正常工作
