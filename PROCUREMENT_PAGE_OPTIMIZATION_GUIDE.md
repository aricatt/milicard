# 采购页面优化指南

## 🎯 优化目标

根据CSV数据结构和表单截图，完善采购页面的字段展示和录入功能。

---

## 📊 CSV字段分析

### **CSV包含27个字段**：
```
ID, 采购日期, 采购编号, 采购名称, 商品名称, 零售价, 折扣, 供应商,
采购箱, 采购盒, 采购包,
到货箱, 到货盒, 到货包,
相差箱, 相差盒, 相差包,
拿货单价箱, 拿货单价盒, 拿货单价包,
应付金额箱, 应付金额盒, 应付金额包,
应付总金额(重复3次), 创建时间
```

### **当前页面缺失字段**：
- ❌ 商品名称、零售价、折扣
- ❌ 采购箱/盒/包
- ❌ 拿货单价箱/盒/包
- ❌ 应付金额箱/盒/包（需自动计算）

---

## 📝 表单截图分析

### **表单必填字段**：
1. **日期** - 采购日期
2. **商品** - 下拉选择（关联商品表）
3. **供应商** - 下拉选择（关联供应商表）
4. **拿货单价/箱** + **采购箱**
5. **采购盒**
6. **采购包**
7. **实付金额** - 自动计算

### **关键逻辑**：
- 商品和供应商是**下拉选择**
- 选择商品时，保存商品编号（code），显示商品名称（name）
- 选择供应商时，保存供应商编号（code），显示供应商名称（name）
- 实付金额 = (单价箱 × 采购箱) + (单价盒 × 采购盒) + (单价包 × 采购包)

---

## 🔧 需要修改的文件

### **1. 类型定义更新**

```typescript
interface PurchaseOrder {
  id: string;
  orderNo: string;              // 采购编号
  orderName?: string;           // 采购名称
  purchaseDate: string;         // 采购日期
  goodsCode: string;            // 商品编号（关联商品表）
  goodsName: string;            // 商品名称
  retailPrice?: number;         // 零售价
  discount?: number;            // 折扣
  supplierCode: string;         // 供应商编号（关联供应商表）
  supplierName: string;         // 供应商名称
  purchaseBoxQty: number;       // 采购箱
  purchasePackQty: number;      // 采购盒
  purchasePieceQty: number;     // 采购包
  unitPriceBox?: number;        // 拿货单价箱
  unitPricePack?: number;       // 拿货单价盒
  unitPricePiece?: number;      // 拿货单价包
  amountBox?: number;           // 应付金额箱
  amountPack?: number;          // 应付金额盒
  amountPiece?: number;         // 应付金额包
  totalAmount: number;          // 应付总金额
  baseId: number;
  createdAt: string;
}
```

### **2. ProTable列定义更新**

添加以下列：

```typescript
{
  title: '商品名称',
  dataIndex: 'goodsName',
  width: 200,
  ellipsis: true,
},
{
  title: '零售价',
  dataIndex: 'retailPrice',
  width: 100,
  render: (_, record) => record.retailPrice ? `¥${record.retailPrice.toFixed(2)}` : '-',
},
{
  title: '折扣',
  dataIndex: 'discount',
  width: 80,
  render: (_, record) => record.discount ? `${record.discount}%` : '-',
},
{
  title: '采购箱',
  dataIndex: 'purchaseBoxQty',
  width: 80,
  align: 'right',
},
{
  title: '采购盒',
  dataIndex: 'purchasePackQty',
  width: 80,
  align: 'right',
},
{
  title: '采购包',
  dataIndex: 'purchasePieceQty',
  width: 80,
  align: 'right',
},
{
  title: '拿货单价/箱',
  dataIndex: 'unitPriceBox',
  width: 110,
  render: (_, record) => record.unitPriceBox ? `¥${record.unitPriceBox.toFixed(2)}` : '-',
},
{
  title: '拿货单价/盒',
  dataIndex: 'unitPricePack',
  width: 110,
  render: (_, record) => record.unitPricePack ? `¥${record.unitPricePack.toFixed(2)}` : '-',
},
{
  title: '拿货单价/包',
  dataIndex: 'unitPricePiece',
  width: 110,
  render: (_, record) => record.unitPricePiece ? `¥${record.unitPricePiece.toFixed(2)}` : '-',
},
```

### **3. 表单字段更新**

#### **添加商品和供应商选项状态**：
```typescript
const [goodsOptions, setGoodsOptions] = useState<{code: string, name: string, retailPrice: number}[]>([]);
const [supplierOptions, setSupplierOptions] = useState<{code: string, name: string}[]>([]);
```

#### **加载商品列表**：
```typescript
const loadGoods = async () => {
  const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
    method: 'GET',
    params: { page: 1, pageSize: 1000 },
  });
  
  if (result.success && result.data) {
    const options = result.data.map((item: any) => ({
      code: item.code,
      name: item.name,
      retailPrice: item.retailPrice,
    }));
    setGoodsOptions(options);
  }
};
```

#### **加载供应商列表**：
```typescript
const loadSuppliers = async () => {
  const result = await request(`/api/v1/bases/${currentBase.id}/suppliers`, {
    method: 'GET',
    params: { page: 1, pageSize: 1000 },
  });
  
  if (result.success && result.data) {
    const options = result.data.map((item: any) => ({
      code: item.code,
      name: item.name,
    }));
    setSupplierOptions(options);
  }
};
```

#### **表单字段**：
```tsx
<Form.Item
  label="采购日期"
  name="purchaseDate"
  rules={[{ required: true, message: '请选择采购日期' }]}
>
  <DatePicker style={{ width: '100%' }} />
</Form.Item>

<Form.Item
  label="商品"
  name="goodsCode"
  rules={[{ required: true, message: '请选择商品' }]}
>
  <Select
    showSearch
    placeholder="请选择商品"
    optionFilterProp="children"
    onChange={(value) => {
      const goods = goodsOptions.find(g => g.code === value);
      if (goods) {
        form.setFieldsValue({
          goodsName: goods.name,
          retailPrice: goods.retailPrice,
        });
      }
    }}
  >
    {goodsOptions.map(goods => (
      <Option key={goods.code} value={goods.code}>
        {goods.name}
      </Option>
    ))}
  </Select>
</Form.Item>

<Form.Item name="goodsName" hidden>
  <Input />
</Form.Item>

<Form.Item name="retailPrice" hidden>
  <InputNumber />
</Form.Item>

<Form.Item
  label="供应商"
  name="supplierCode"
  rules={[{ required: true, message: '请选择供应商' }]}
>
  <Select
    showSearch
    placeholder="请选择供应商"
    optionFilterProp="children"
    onChange={(value) => {
      const supplier = supplierOptions.find(s => s.code === value);
      if (supplier) {
        form.setFieldsValue({
          supplierName: supplier.name,
        });
      }
    }}
  >
    {supplierOptions.map(supplier => (
      <Option key={supplier.code} value={supplier.code}>
        {supplier.name}
      </Option>
    ))}
  </Select>
</Form.Item>

<Form.Item name="supplierName" hidden>
  <Input />
</Form.Item>

<Row gutter={16}>
  <Col span={12}>
    <Form.Item
      label="拿货单价/箱"
      name="unitPriceBox"
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="单价/箱"
        min={0}
        precision={2}
        addonBefore="¥"
      />
    </Form.Item>
  </Col>
  <Col span={12}>
    <Form.Item
      label="采购箱"
      name="purchaseBoxQty"
      initialValue={0}
      rules={[{ required: true }]}
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="箱数"
        min={0}
        precision={0}
      />
    </Form.Item>
  </Col>
</Row>

<Row gutter={16}>
  <Col span={12}>
    <Form.Item
      label="拿货单价/盒"
      name="unitPricePack"
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="单价/盒"
        min={0}
        precision={2}
        addonBefore="¥"
      />
    </Form.Item>
  </Col>
  <Col span={12}>
    <Form.Item
      label="采购盒"
      name="purchasePackQty"
      initialValue={0}
      rules={[{ required: true }]}
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="盒数"
        min={0}
        precision={0}
      />
    </Form.Item>
  </Col>
</Row>

<Row gutter={16}>
  <Col span={12}>
    <Form.Item
      label="拿货单价/包"
      name="unitPricePiece"
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="单价/包"
        min={0}
        precision={2}
        addonBefore="¥"
      />
    </Form.Item>
  </Col>
  <Col span={12}>
    <Form.Item
      label="采购包"
      name="purchasePieceQty"
      initialValue={0}
      rules={[{ required: true }]}
    >
      <InputNumber
        style={{ width: '100%' }}
        placeholder="包数"
        min={0}
        precision={0}
      />
    </Form.Item>
  </Col>
</Row>

<Form.Item
  label="实付总金额"
  shouldUpdate={(prevValues, currentValues) =>
    prevValues.unitPriceBox !== currentValues.unitPriceBox ||
    prevValues.purchaseBoxQty !== currentValues.purchaseBoxQty ||
    prevValues.unitPricePack !== currentValues.unitPricePack ||
    prevValues.purchasePackQty !== currentValues.purchasePackQty ||
    prevValues.unitPricePiece !== currentValues.unitPricePiece ||
    prevValues.purchasePieceQty !== currentValues.purchasePieceQty
  }
>
  {({ getFieldValue }) => {
    const amountBox = (getFieldValue('unitPriceBox') || 0) * (getFieldValue('purchaseBoxQty') || 0);
    const amountPack = (getFieldValue('unitPricePack') || 0) * (getFieldValue('purchasePackQty') || 0);
    const amountPiece = (getFieldValue('unitPricePiece') || 0) * (getFieldValue('purchasePieceQty') || 0);
    const total = amountBox + amountPack + amountPiece;
    return (
      <div style={{ 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#f5222d',
        padding: '10px',
        background: '#fff1f0',
        borderRadius: 4,
        textAlign: 'center'
      }}>
        ¥{total.toFixed(2)}
      </div>
    );
  }}
</Form.Item>
```

### **4. 提交时计算金额**：
```typescript
const handleCreate = async (values: any) => {
  // 计算应付金额
  const amountBox = (values.unitPriceBox || 0) * (values.purchaseBoxQty || 0);
  const amountPack = (values.unitPricePack || 0) * (values.purchasePackQty || 0);
  const amountPiece = (values.unitPricePiece || 0) * (values.purchasePieceQty || 0);
  const totalAmount = amountBox + amountPack + amountPiece;

  const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
    method: 'POST',
    data: {
      ...values,
      purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
      amountBox,
      amountPack,
      amountPiece,
      totalAmount,
    },
  });
  
  // ...
};
```

---

## ✅ 优化清单

- [x] 更新PurchaseOrder类型定义，添加所有CSV字段
- [ ] 更新ProTable列定义，显示商品、采购数量、单价等字段
- [ ] 添加商品和供应商下拉选择功能
- [ ] 实现表单中的自动计算实付金额
- [ ] 添加商品选择时自动填充零售价
- [ ] 添加供应商选择时自动填充供应商名称
- [ ] 更新创建/编辑表单，包含所有必填字段
- [ ] 测试表单提交和数据展示

---

## 🎯 关键要点

1. **商品和供应商关联**：
   - 保存：goodsCode / supplierCode（编号）
   - 显示：goodsName / supplierName（名称）
   - 通过下拉选择，自动填充隐藏字段

2. **金额自动计算**：
   - 应付金额箱 = 拿货单价箱 × 采购箱
   - 应付金额盒 = 拿货单价盒 × 采购盒
   - 应付金额包 = 拿货单价包 × 采购包
   - 实付总金额 = 应付金额箱 + 应付金额盒 + 应付金额包

3. **表单实时更新**：
   - 使用 `shouldUpdate` 监听字段变化
   - 实时显示计算后的金额

---

**由于文件较大且改动较多，建议您根据此指南逐步修改现有文件，或者我可以帮您创建一个完整的新版本文件。**
