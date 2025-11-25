# 商品 Excel 导入导出功能实现方案

## 📊 Excel 文件结构分析

根据提供的 `商品.xlsx` 文件，Excel 结构如下：

### 列定义
| 列名 | 字段 | 类型 | 说明 |
|------|------|------|------|
| ID | id | 数字 | 商品ID（导入时忽略，导出时包含） |
| 商品编号 | code | 字符串 | 自动生成（GOODS-XXXXXXXXXXX） |
| 商品名称 | name | 字符串 | 必填 |
| 商品别名 | alias | 字符串 | 选填 |
| 厂家名称 | manufacturer | 字符串 | 必填 |
| 零售价(一箱) | retailPrice | 数字 | 必填 |
| 箱数量 | boxQuantity | 数字 | 固定为1 |
| 多少盒1箱 | packPerBox | 数字 | 必填 |
| 多少包1盒 | piecePerPack | 数字 | 必填 |
| 创建时间 | createdAt | 日期时间 | 自动生成 |

### 示例数据
```
琦趣创想航海王 和之国篇,,琦趣创想,22356,1,36,10
名侦探柯南挂件-星绽版-第1弹,,卡游,19440,1,36,12
灵魂重生收藏卡,,万画云游,24300,1,24,15
```

---

## 🚀 完整实现代码

### 1. 安装依赖

```bash
cd client
npm install xlsx file-saver
npm install -D @types/file-saver
```

### 2. 添加图标导入

在 `client/src/pages/live-base/products/index.tsx` 中：

```typescript
import {
  PlusOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  InboxOutlined,
  // ... 其他图标
} from '@ant-design/icons';
```

### 3. 添加状态管理

```typescript
const [importModalVisible, setImportModalVisible] = useState(false);
const [importLoading, setImportLoading] = useState(false);
const [importProgress, setImportProgress] = useState(0);
```

### 4. 导出功能实现

```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 导出商品数据到Excel
 */
const handleExport = async () => {
  try {
    message.loading('正在导出数据...', 0);
    
    // 获取所有数据（不分页）
    const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
      method: 'GET',
      params: {
        page: 1,
        pageSize: 10000, // 获取所有数据
      },
    });

    message.destroy();

    if (!result.success || !result.data || result.data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    // 转换数据格式 - 完全匹配Excel结构
    const exportData = result.data.map((item: Product) => ({
      'ID': item.id,
      '商品编号': item.code,
      '商品名称': item.name,
      '商品别名': item.alias || '',
      '厂家名称': item.manufacturer,
      '零售价(一箱)': item.retailPrice,
      '箱数量': item.boxQuantity || 1,
      '多少盒1箱': item.packPerBox,
      '多少包1盒': item.piecePerPack,
      '创建时间': item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-') : '',
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },   // ID
      { wch: 20 },  // 商品编号
      { wch: 35 },  // 商品名称
      { wch: 25 },  // 商品别名
      { wch: 15 },  // 厂家名称
      { wch: 12 },  // 零售价(一箱)
      { wch: 8 },   // 箱数量
      { wch: 12 },  // 多少盒1箱
      { wch: 12 },  // 多少包1盒
      { wch: 20 },  // 创建时间
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品列表');

    // 导出文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `商品列表_${currentBase.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);

    message.success(`成功导出 ${exportData.length} 条商品数据`);
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请重试');
  }
};
```

### 5. 导入功能实现

```typescript
import { Upload } from 'antd';
import type { UploadProps } from 'antd';

/**
 * 处理Excel导入
 */
const handleImport: UploadProps['customRequest'] = async (options) => {
  const { file } = options;
  
  setImportLoading(true);
  setImportProgress(0);
  
  try {
    // 读取Excel文件
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          message.warning('Excel文件中没有数据');
          setImportLoading(false);
          return;
        }

        message.loading(`准备导入 ${jsonData.length} 条数据...`, 0);

        // 转换数据格式
        const importData = jsonData.map((row: any) => {
          // 数据验证和转换
          const name = String(row['商品名称'] || '').trim();
          const alias = String(row['商品别名'] || '').trim();
          const manufacturer = String(row['厂家名称'] || '').trim();
          const retailPrice = parseFloat(row['零售价(一箱)'] || '0');
          const packPerBox = parseInt(row['多少盒1箱'] || '0');
          const piecePerPack = parseInt(row['多少包1盒'] || '0');

          return {
            name,
            alias: alias || undefined,
            manufacturer,
            retailPrice,
            packPerBox,
            piecePerPack,
            boxQuantity: 1, // 固定为1
          };
        });

        // 数据验证
        const errors: string[] = [];
        importData.forEach((item, index) => {
          const rowNum = index + 2; // Excel行号（从2开始，因为第1行是标题）
          
          if (!item.name) {
            errors.push(`第${rowNum}行：商品名称不能为空`);
          }
          if (!item.manufacturer) {
            errors.push(`第${rowNum}行：厂家名称不能为空`);
          }
          if (!item.retailPrice || item.retailPrice <= 0) {
            errors.push(`第${rowNum}行：零售价必须大于0`);
          }
          if (!item.packPerBox || item.packPerBox < 1) {
            errors.push(`第${rowNum}行：盒/箱数量必须大于0`);
          }
          if (!item.piecePerPack || item.piecePerPack < 1) {
            errors.push(`第${rowNum}行：包/盒数量必须大于0`);
          }
        });

        if (errors.length > 0) {
          message.destroy();
          Modal.error({
            title: '数据验证失败',
            content: (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {errors.slice(0, 10).map((err, idx) => (
                  <div key={idx}>{err}</div>
                ))}
                {errors.length > 10 && <div>...还有 {errors.length - 10} 个错误</div>}
              </div>
            ),
            width: 600,
          });
          setImportLoading(false);
          return;
        }

        // 批量导入
        let successCount = 0;
        let failCount = 0;
        const failedItems: string[] = [];

        for (let i = 0; i < importData.length; i++) {
          const item = importData[i];
          const progress = Math.round(((i + 1) / importData.length) * 100);
          setImportProgress(progress);

          try {
            const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
              method: 'POST',
              data: item,
            });
            
            if (result.success) {
              successCount++;
            } else {
              failCount++;
              failedItems.push(`第${i + 2}行：${item.name} - ${result.message || '创建失败'}`);
            }
          } catch (error: any) {
            failCount++;
            failedItems.push(`第${i + 2}行：${item.name} - ${error.message || '网络错误'}`);
          }
        }

        message.destroy();

        // 显示导入结果
        if (failCount === 0) {
          message.success(`导入完成！成功导入 ${successCount} 条商品`);
        } else {
          Modal.warning({
            title: '导入完成',
            content: (
              <div>
                <p>成功导入：{successCount} 条</p>
                <p style={{ color: '#ff4d4f' }}>失败：{failCount} 条</p>
                {failedItems.length > 0 && (
                  <div style={{ maxHeight: 300, overflow: 'auto', marginTop: 10 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 5 }}>失败详情：</div>
                    {failedItems.slice(0, 10).map((item, idx) => (
                      <div key={idx} style={{ fontSize: 12 }}>{item}</div>
                    ))}
                    {failedItems.length > 10 && (
                      <div style={{ fontSize: 12 }}>...还有 {failedItems.length - 10} 条失败</div>
                    )}
                  </div>
                )}
              </div>
            ),
            width: 600,
          });
        }

        setImportModalVisible(false);
        setImportProgress(0);
        actionRef.current?.reload();
        
      } catch (error) {
        console.error('解析Excel失败:', error);
        message.error('Excel文件格式错误，请检查文件');
      } finally {
        setImportLoading(false);
      }
    };

    reader.onerror = () => {
      message.error('文件读取失败');
      setImportLoading(false);
    };

    reader.readAsBinaryString(file as File);
    
  } catch (error) {
    console.error('导入失败:', error);
    message.error('导入失败，请重试');
    setImportLoading(false);
  }
};
```

### 6. 下载模板功能

```typescript
/**
 * 下载导入模板
 */
const handleDownloadTemplate = () => {
  const templateData = [
    {
      'ID': '（导入时此列会被忽略）',
      '商品编号': '（系统自动生成）',
      '商品名称': '琦趣创想航海王 和之国篇',
      '商品别名': '',
      '厂家名称': '琦趣创想',
      '零售价(一箱)': 22356,
      '箱数量': 1,
      '多少盒1箱': 36,
      '多少包1盒': 10,
      '创建时间': '（系统自动生成）',
    },
    {
      'ID': '',
      '商品编号': '',
      '商品名称': '名侦探柯南挂件-星绽版-第1弹',
      '商品别名': '',
      '厂家名称': '卡游',
      '零售价(一箱)': 19440,
      '箱数量': 1,
      '多少盒1箱': 36,
      '多少包1盒': 12,
      '创建时间': '',
    },
    {
      'ID': '',
      '商品编号': '',
      '商品名称': '灵魂重生收藏卡',
      '商品别名': '',
      '厂家名称': '万画云游',
      '零售价(一箱)': 24300,
      '箱数量': 1,
      '多少盒1箱': 24,
      '多少包1盒': 15,
      '创建时间': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 25 },  // ID
    { wch: 20 },  // 商品编号
    { wch: 35 },  // 商品名称
    { wch: 25 },  // 商品别名
    { wch: 15 },  // 厂家名称
    { wch: 12 },  // 零售价(一箱)
    { wch: 8 },   // 箱数量
    { wch: 12 },  // 多少盒1箱
    { wch: 12 },  // 多少包1盒
    { wch: 20 },  // 创建时间
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), '商品导入模板.xlsx');
  
  message.success('模板下载成功');
};
```

### 7. UI 组件

#### 工具栏按钮

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

#### 导入模态框

```typescript
{/* 导入商品模态框 */}
<Modal
  title="导入商品数据"
  open={importModalVisible}
  onCancel={() => {
    if (!importLoading) {
      setImportModalVisible(false);
      setImportProgress(0);
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

---

## 📝 完整代码集成位置

在 `client/src/pages/live-base/products/index.tsx` 中：

### 1. 导入部分（文件顶部）
```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Upload, Progress, Alert, Spin } from 'antd';
import type { UploadProps } from 'antd';
```

### 2. 状态管理（组件内部）
```typescript
const [importModalVisible, setImportModalVisible] = useState(false);
const [importLoading, setImportLoading] = useState(false);
const [importProgress, setImportProgress] = useState(0);
```

### 3. 函数定义（组件内部）
- `handleExport` - 导出功能
- `handleImport` - 导入功能
- `handleDownloadTemplate` - 下载模板

### 4. UI 组件（render 部分）
- 修改 `toolBarRender` 添加按钮
- 添加导入模态框

---

## 🎯 实现效果

### 导出效果
```
点击"导出Excel" → 生成文件：商品列表_示例基地_2025-11-26.xlsx
包含所有商品数据，格式与原Excel完全一致
```

### 导入效果
```
1. 点击"导入Excel"
2. 下载模板或使用现有Excel
3. 拖拽或选择文件上传
4. 显示导入进度
5. 显示导入结果（成功/失败统计）
```

---

## ⚠️ 注意事项

### 1. 数据验证
- ✅ 必填字段验证
- ✅ 数据类型验证
- ✅ 数值范围验证
- ✅ 详细错误提示

### 2. 性能优化
- ✅ 分批导入（当前逐条，可优化为批量API）
- ✅ 进度显示
- ✅ 错误收集

### 3. 用户体验
- ✅ 导入说明
- ✅ 模板下载
- ✅ 进度提示
- ✅ 结果反馈

---

## 🚀 下一步优化（可选）

### 1. 后端批量导入API
```typescript
// server/src/routes/goodsBaseRoutes.ts
router.post('/:baseId/goods/batch', GoodsController.batchCreateGoods);
```

### 2. 导入历史记录
- 记录每次导入的时间、数量、结果
- 支持查看历史导入记录

### 3. 导出筛选
- 支持导出当前筛选结果
- 支持自定义导出列

---

**准备好了吗？我现在就可以将这些代码集成到商品页面中！** 🚀

需要我立即实现吗？
