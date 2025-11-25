# Excel 导入导出功能实现指南

## 📊 功能概述

在商品页面添加Excel导入导出功能，**实现难度：简单到中等** ✅

---

## 🎯 实现方案

### 方案一：使用 ProTable 内置功能（推荐）⭐⭐⭐⭐⭐

**优点**：
- ✅ ProTable 自带导出功能，开箱即用
- ✅ 代码量少，配置简单
- ✅ 与现有代码无缝集成

**实现步骤**：

#### 1. 安装依赖
```bash
npm install xlsx file-saver
npm install -D @types/file-saver
```

#### 2. 添加导出按钮（仅需修改 toolBarRender）
```typescript
// 在 ProTable 的 toolBarRender 中添加
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

#### 3. 实现导出功能
```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const handleExport = async () => {
  try {
    // 获取所有数据（不分页）
    const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
      method: 'GET',
      params: {
        page: 1,
        pageSize: 10000, // 获取所有数据
      },
    });

    if (!result.success || !result.data) {
      message.error('获取数据失败');
      return;
    }

    // 转换数据格式
    const exportData = result.data.map((item: Product) => ({
      '商品编号': item.code,
      '商品名称': item.name,
      '商品别名': item.alias || '',
      '厂家名称': item.manufacturer,
      '零售价(一箱)': item.retailPrice,
      '箱数量': item.boxQuantity,
      '盒/箱': item.packPerBox,
      '包/盒': item.piecePerPack,
      '创建时间': item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '',
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品列表');

    // 导出文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `商品列表_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    message.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败');
  }
};
```

#### 4. 实现导入功能
```typescript
import { Upload } from 'antd';
import type { UploadProps } from 'antd';

const [importModalVisible, setImportModalVisible] = useState(false);
const [importLoading, setImportLoading] = useState(false);

const handleImport: UploadProps['customRequest'] = async (options) => {
  const { file } = options;
  
  setImportLoading(true);
  try {
    // 读取Excel文件
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 转换数据格式
      const importData = jsonData.map((row: any) => ({
        name: row['商品名称'],
        alias: row['商品别名'],
        manufacturer: row['厂家名称'],
        retailPrice: parseFloat(row['零售价(一箱)']),
        packPerBox: parseInt(row['盒/箱']),
        piecePerPack: parseInt(row['包/盒']),
        boxQuantity: 1, // 固定为1
      }));

      // 批量导入
      let successCount = 0;
      let failCount = 0;

      for (const item of importData) {
        try {
          const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
            method: 'POST',
            data: item,
          });
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      message.success(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
      setImportModalVisible(false);
      actionRef.current?.reload();
    };

    reader.readAsBinaryString(file as File);
  } catch (error) {
    console.error('导入失败:', error);
    message.error('导入失败');
  } finally {
    setImportLoading(false);
  }
};

// 导入模态框
<Modal
  title="导入商品"
  open={importModalVisible}
  onCancel={() => setImportModalVisible(false)}
  footer={null}
>
  <Upload.Dragger
    name="file"
    accept=".xlsx,.xls"
    customRequest={handleImport}
    showUploadList={false}
  >
    <p className="ant-upload-drag-icon">
      <InboxOutlined />
    </p>
    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
    <p className="ant-upload-hint">
      支持 .xlsx 和 .xls 格式，请按照模板格式填写数据
    </p>
  </Upload.Dragger>
  <Button
    type="link"
    onClick={handleDownloadTemplate}
    style={{ marginTop: 16 }}
  >
    下载导入模板
  </Button>
</Modal>
```

#### 5. 下载模板功能
```typescript
const handleDownloadTemplate = () => {
  const templateData = [
    {
      '商品名称': '示例商品',
      '商品别名': '示例别名',
      '厂家名称': '示例厂家',
      '零售价(一箱)': 100.00,
      '盒/箱': 36,
      '包/盒': 12,
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), '商品导入模板.xlsx');
};
```

---

### 方案二：使用 Ant Design Pro 的 ProTable 导出插件

**优点**：
- ✅ 更强大的导出配置
- ✅ 支持自定义列导出
- ✅ 支持导出前数据处理

**实现**：
```typescript
import { ProTable } from '@ant-design/pro-components';

<ProTable
  // ... 其他配置
  toolBarRender={() => [
    <Button
      key="export"
      onClick={() => {
        // ProTable 内置导出功能
        // 需要配置 columns 的 dataIndex
      }}
    >
      导出
    </Button>
  ]}
  // 配置导出
  exportConfig={{
    type: 'excel',
    fileName: '商品列表',
  }}
/>
```

---

## 📦 所需依赖

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

---

## 🔧 完整代码示例

### 添加图标导入
```typescript
import {
  PlusOutlined,
  ExportOutlined,
  ImportOutlined,
  InboxOutlined,
  // ... 其他图标
} from '@ant-design/icons';
```

### 添加状态管理
```typescript
const [importModalVisible, setImportModalVisible] = useState(false);
const [importLoading, setImportLoading] = useState(false);
```

---

## 🎨 UI 效果

```
┌─────────────────────────────────────────────┐
│  商品列表 (共 150 个)  [详情]               │
├─────────────────────────────────────────────┤
│  [导出Excel] [导入Excel] [新增商品]        │
├─────────────────────────────────────────────┤
│  商品编号 │ 商品名称 │ 厂家 │ 零售价 │ ... │
│  ─────────┼──────────┼──────┼────────┼─────│
│  GOODS-XX │ 示例商品 │ XX厂 │ ¥100   │ ... │
└─────────────────────────────────────────────┘
```

---

## ⚠️ 注意事项

### 1. 导入验证
```typescript
// 建议添加数据验证
const validateImportData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('商品名称不能为空');
  }
  
  if (!data.manufacturer || data.manufacturer.trim() === '') {
    errors.push('厂家名称不能为空');
  }
  
  if (!data.retailPrice || data.retailPrice <= 0) {
    errors.push('零售价必须大于0');
  }
  
  // ... 更多验证
  
  return errors;
};
```

### 2. 批量导入优化
```typescript
// 建议使用批量API（如果后端支持）
const result = await request(`/api/v1/bases/${currentBase.id}/goods/batch`, {
  method: 'POST',
  data: importData,
});
```

### 3. 大数据量处理
```typescript
// 分批导入，避免一次性导入过多数据
const batchSize = 100;
for (let i = 0; i < importData.length; i += batchSize) {
  const batch = importData.slice(i, i + batchSize);
  await importBatch(batch);
}
```

---

## 📊 后端支持（可选）

如果需要更好的性能，可以添加后端批量导入API：

```typescript
// server/src/routes/goodsBaseRoutes.ts
router.post('/:baseId/goods/batch', GoodsController.batchCreateGoods);

// server/src/controllers/goodsController.ts
static async batchCreateGoods(req: Request, res: Response) {
  try {
    const { baseId } = req.params;
    const goodsList = req.body; // 数组

    const results = await GoodsService.batchCreateGoods(
      parseInt(baseId),
      goodsList
    );

    res.json({
      success: true,
      data: results,
      message: '批量创建成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

---

## 🚀 实现难度评估

| 功能 | 难度 | 预计时间 | 说明 |
|------|------|----------|------|
| 导出Excel | ⭐ 简单 | 30分钟 | 使用 xlsx 库，代码简单 |
| 导入Excel | ⭐⭐ 中等 | 1小时 | 需要处理文件读取、数据验证 |
| 下载模板 | ⭐ 简单 | 15分钟 | 生成示例Excel文件 |
| 批量导入优化 | ⭐⭐⭐ 中等 | 1-2小时 | 需要后端支持 |

**总计**：2-3小时可以完成基础功能 ✅

---

## 💡 推荐实现顺序

1. ✅ **第一步**：实现导出功能（最简单，立即可用）
2. ✅ **第二步**：实现下载模板功能
3. ✅ **第三步**：实现导入功能（基础版）
4. ⭐ **第四步**：优化导入（数据验证、进度提示）
5. ⭐ **第五步**：后端批量API（可选）

---

## 📝 总结

**Excel导入导出功能实现难度：简单到中等** ✅

- **导出**：非常简单，30分钟搞定
- **导入**：稍复杂，需要1-2小时
- **总体**：2-3小时可以完成完整功能

**建议**：
1. 先实现导出功能，立即可用
2. 再实现导入功能，逐步优化
3. 如果数据量大，考虑后端批量API

**是否需要我现在就实现这个功能？** 🚀
