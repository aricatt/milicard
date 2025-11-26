# 采购页面新文件说明

## 📁 已创建的文件

### 1. **types.ts** ✅
路径：`client/src/pages/live-base/procurement/types.ts`

包含所有类型定义：
- `PurchaseOrder` - 采购订单（27个字段，对应CSV）
- `PurchaseStats` - 统计数据
- `GoodsOption` - 商品选项
- `SupplierOption` - 供应商选项
- `ProcurementFormValues` - 表单值类型

### 2. **ProcurementForm.tsx** ✅
路径：`client/src/pages/live-base/procurement/ProcurementForm.tsx`

独立的表单组件，包含：
- 采购日期选择
- 商品下拉选择（关联商品表）
- 供应商下拉选择（关联供应商表）
- 采购箱/盒/包数量输入
- 拿货单价箱/盒/包输入
- 实时计算应付金额
- 自动填充商品名称、零售价、供应商名称

---

## 🔧 需要完成的工作

### 3. **主页面文件 index_new.tsx** (待创建)

由于主页面文件较大（约600行），我已经创建了第1部分。

您有两个选择：

#### **选项A：我继续创建完整文件**
我将创建包含以下内容的完整主页面：
- ProTable配置（15+列）
- 统计信息Popover
- 创建/编辑模态框
- Excel导入导出按钮
- 删除确认
- 完整的CRUD操作

#### **选项B：使用优化指南手动完成**
参考 `PROCUREMENT_PAGE_OPTIMIZATION_GUIDE.md` 中的代码示例，将：
1. ProTable列定义添加到现有文件
2. 替换表单为 `<ProcurementForm />` 组件
3. 添加商品和供应商加载逻辑

---

## 📋 ProTable列定义（需要添加）

```typescript
const columns: ProColumns<PurchaseOrder>[] = [
  {
    title: '采购编号',
    dataIndex: 'orderNo',
    width: 180,
    fixed: 'left',
    copyable: true,
  },
  {
    title: '采购日期',
    dataIndex: 'purchaseDate',
    width: 120,
    valueType: 'date',
  },
  {
    title: '商品名称',
    dataIndex: 'goodsName',
    width: 200,
    ellipsis: true,
  },
  {
    title: '供应商',
    dataIndex: 'supplierName',
    width: 150,
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
  {
    title: '应付总金额',
    dataIndex: 'totalAmount',
    width: 120,
    render: (_, record) => (
      <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
        ¥{record.totalAmount.toFixed(2)}
      </span>
    ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    width: 160,
    valueType: 'dateTime',
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定删除此采购订单吗？"
          onConfirm={() => handleDelete(record)}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
```

---

## 🎯 使用新组件的示例

```tsx
{/* 创建采购订单模态框 */}
<Modal
  title="创建采购订单"
  open={createModalVisible}
  onOk={() => createForm.submit()}
  onCancel={() => {
    setCreateModalVisible(false);
    createForm.resetFields();
  }}
  confirmLoading={createLoading}
  width={700}
>
  <ProcurementForm
    form={createForm}
    goodsOptions={goodsOptions}
    supplierOptions={supplierOptions}
    goodsLoading={goodsLoading}
    supplierLoading={supplierLoading}
    onFinish={handleCreate}
  />
</Modal>
```

---

## ✅ 下一步

**请告诉我您的选择**：

1. **选项A**：我继续创建完整的 `index_new.tsx` 文件（推荐）
2. **选项B**：您根据优化指南和已创建的组件自行完成

如果选择选项A，我会创建一个完整可用的主页面文件。
