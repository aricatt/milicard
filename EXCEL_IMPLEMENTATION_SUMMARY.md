# Excel 导入导出功能实现总结

## 🎉 已完成的工作

### 1. ✅ 创建共用工具函数
**文件**: `client/src/utils/excelUtils.ts`

**功能**：
- `exportToExcel()` - 通用Excel导出
- `readExcelFile()` - 读取Excel文件
- `downloadTemplate()` - 下载模板
- `validateImportData()` - 数据验证
- `formatDateTime()` - 日期格式化

**特点**：
- 完全通用，可被所有页面复用
- 支持自定义列配置
- 内置数据验证逻辑
- 统一的错误处理

### 2. ✅ 创建商品专用Hook
**文件**: `client/src/pages/live-base/products/useProductExcel.ts`

**功能**：
- `handleExport()` - 导出商品数据
- `handleImport()` - 导入商品数据
- `handleDownloadTemplate()` - 下载商品模板
- 状态管理（importModalVisible, importLoading, importProgress）

**特点**：
- 封装了商品特定的业务逻辑
- 自动处理数据转换和验证
- 提供进度反馈
- 详细的错误提示

### 3. ✅ 安装必要依赖
```bash
npm install xlsx file-saver
npm install -D @types/file-saver
```

---

## 📝 如何在商品页面中使用

### 步骤1：导入Hook
在 `client/src/pages/live-base/products/index.tsx` 顶部添加：

```typescript
import { useProductExcel } from './useProductExcel';
import { Upload, Progress, Alert, Spin } from 'antd';
import { ExportOutlined, ImportOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons';
```

### 步骤2：使用Hook
在组件内部添加：

```typescript
const ProductManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  
  // 使用Excel Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useProductExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => actionRef.current?.reload(),
  });
  
  // ... 其他代码
```

### 步骤3：更新工具栏按钮
找到 `toolBarRender`，修改为：

```typescript
toolBarRender={() => [
  <Button
    key="export"
    icon={<ExportOutlined />}
    onClick={handleExport}
  >
    导出Excel
  </Button>,
  <Button
    key="import"
    icon={<ImportOutlined />}
    onClick={() => setImportModalVisible(true)}
  >
    导入Excel
  </Button>,
  <Button
    key="create"
    type="primary"
    icon={<PlusOutlined />}
    onClick={() => setCreateModalVisible(true)}
  >
    新增商品
  </Button>,
]}
```

### 步骤4：添加导入模态框
在编辑模态框后面添加：

```typescript
{/* 导入商品模态框 */}
<Modal
  title="导入商品数据"
  open={importModalVisible}
  onCancel={() => {
    if (!importLoading) {
      setImportModalVisible(false);
    }
  }}
  footer={null}
  width={600}
  closable={!importLoading}
  maskClosable={!importLoading}
>
  <div style={{ marginBottom: 16 }}>
    <Alert
      message="导入说明"
      description={
        <div>
          <p>1. 请使用提供的模板文件，保持列名不变</p>
          <p>2. ID、商品编号、创建时间由系统自动生成，导入时会被忽略</p>
          <p>3. 商品名称、厂家名称、零售价、盒/箱、包/盒为必填项</p>
          <p>4. 箱数量固定为1，无需填写</p>
          <p>5. 支持批量导入，建议每次不超过500条</p>
        </div>
      }
      type="info"
      showIcon
    />
  </div>

  {importLoading ? (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>
        正在导入数据，请稍候...
      </div>
      {importProgress > 0 && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={importProgress} status="active" />
        </div>
      )}
    </div>
  ) : (
    <>
      <Upload.Dragger
        name="file"
        accept=".xlsx,.xls"
        customRequest={handleImport}
        showUploadList={false}
        disabled={importLoading}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 .xlsx 和 .xls 格式，请按照模板格式填写数据
        </p>
      </Upload.Dragger>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
        >
          下载导入模板
        </Button>
      </div>
    </>
  )}
</Modal>
```

### 步骤5：添加handleEdit函数
在删除函数后添加：

```typescript
/**
 * 编辑商品
 */
const handleEdit = (record: Product) => {
  setEditingProduct(record);
  editForm.setFieldsValue({
    name: record.name,
    alias: record.alias,
    manufacturer: record.manufacturer,
    description: record.description,
    retailPrice: typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice as any || '0'),
    packPrice: typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice as any || '0'),
    purchasePrice: typeof record.purchasePrice === 'number' ? record.purchasePrice : parseFloat(record.purchasePrice as any || '0'),
    packPerBox: record.packPerBox,
    piecePerPack: record.piecePerPack,
    imageUrl: record.imageUrl,
    notes: record.notes,
  });
  setEditModalVisible(true);
};
```

---

## 🔄 如何在其他页面复用

### 示例：供应商页面

#### 1. 创建供应商专用Hook
`client/src/pages/live-base/suppliers/useSupplierExcel.ts`:

```typescript
import { useProductExcel } from '../products/useProductExcel';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData } from '@/utils/excelUtils';

export const useSupplierExcel = ({ baseId, baseName, onImportSuccess }) => {
  // 定义供应商的列配置
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '供应商编号', key: 'code', width: 20 },
    { header: '供应商名称', key: 'name', width: 30 },
    { header: '联系人', key: 'contactPerson', width: 15 },
    { header: '联系电话', key: 'phone', width: 15 },
    // ... 更多列
  ];

  // 定义验证规则
  const validationRules = [
    { field: 'name', required: true, message: '供应商名称不能为空' },
    { field: 'contactPerson', required: true, message: '联系人不能为空' },
    // ... 更多规则
  ];

  // 实现导出、导入、下载模板逻辑
  // ...
};
```

#### 2. 在页面中使用
```typescript
const { handleExport, handleImport, ... } = useSupplierExcel({
  baseId: currentBase?.id || 0,
  baseName: currentBase?.name || '',
  onImportSuccess: () => actionRef.current?.reload(),
});
```

---

## 🎯 优势总结

### 1. 代码复用性
- ✅ 通用工具函数可被所有页面使用
- ✅ Hook模式便于封装业务逻辑
- ✅ 减少重复代码，提高开发效率

### 2. 可维护性
- ✅ 逻辑分离，职责清晰
- ✅ 统一的错误处理
- ✅ 易于测试和调试

### 3. 扩展性
- ✅ 新页面只需创建专用Hook
- ✅ 通用功能无需重复开发
- ✅ 支持自定义列配置和验证规则

### 4. 用户体验
- ✅ 进度提示
- ✅ 详细的错误信息
- ✅ 模板下载功能
- ✅ 拖拽上传支持

---

## 📊 文件结构

```
client/src/
├── utils/
│   └── excelUtils.ts                    # ✅ 通用Excel工具
├── pages/
│   └── live-base/
│       ├── products/
│       │   ├── index.tsx                # ⚠️ 需要集成Hook
│       │   └── useProductExcel.ts       # ✅ 商品Excel Hook
│       ├── suppliers/
│       │   ├── index.tsx
│       │   └── useSupplierExcel.ts      # 🔜 待创建
│       └── ...
```

---

## ✅ 下一步操作

1. **在商品页面集成** - 按照上面的步骤1-5操作
2. **测试功能** - 导出、导入、模板下载
3. **复制到其他页面** - 供应商、采购等页面

---

## 💡 关键点

1. **通用工具** (`excelUtils.ts`) - 所有页面共用
2. **专用Hook** (`useProductExcel.ts`) - 每个页面一个
3. **UI组件** - 导入模态框可复用
4. **数据验证** - 在Hook中定义规则

---

**Excel功能已经完全模块化，可以轻松复用到所有页面！** 🎉
