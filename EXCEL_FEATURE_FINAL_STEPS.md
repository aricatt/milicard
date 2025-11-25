# Excel 导入导出功能 - 最后步骤

## 🎯 当前状态

✅ 依赖已安装（xlsx, file-saver）
✅ 导入已添加（Upload, Progress, Alert, Spin, 图标等）
✅ 状态已添加（importModalVisible, importLoading, importProgress）
❌ 缺少：Excel功能函数（handleExport, handleImport, handleDownloadTemplate）
❌ 缺少：handleEdit 函数
❌ 缺少：工具栏按钮更新
❌ 缺少：导入模态框UI

---

## 📝 需要添加的代码

### 1. 在删除函数后添加 handleEdit 函数（第278行后）

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

  /**
   * 导出商品数据到Excel
   */
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);
      const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      message.destroy();
      if (!result.success || !result.data || result.data.length === 0) {
        message.warning('没有数据可导出');
        return;
      }
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
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 20 }, { wch: 35 }, { wch: 25 }, { wch: 15 },
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '商品列表');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `商品列表_${currentBase.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
      message.success(`成功导出 ${exportData.length} 条商品数据`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  /**
   * 处理Excel导入
   */
  const handleImport: UploadProps['customRequest'] = async (options) => {
    const { file } = options;
    setImportLoading(true);
    setImportProgress(0);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          if (jsonData.length === 0) {
            message.warning('Excel文件中没有数据');
            setImportLoading(false);
            return;
          }
          message.loading(`准备导入 ${jsonData.length} 条数据...`, 0);
          const importData = jsonData.map((row: any) => ({
            name: String(row['商品名称'] || '').trim(),
            alias: String(row['商品别名'] || '').trim() || undefined,
            manufacturer: String(row['厂家名称'] || '').trim(),
            retailPrice: parseFloat(row['零售价(一箱)'] || '0'),
            packPerBox: parseInt(row['多少盒1箱'] || '0'),
            piecePerPack: parseInt(row['多少包1盒'] || '0'),
            boxQuantity: 1,
          }));
          const errors: string[] = [];
          importData.forEach((item, index) => {
            const rowNum = index + 2;
            if (!item.name) errors.push(`第${rowNum}行：商品名称不能为空`);
            if (!item.manufacturer) errors.push(`第${rowNum}行：厂家名称不能为空`);
            if (!item.retailPrice || item.retailPrice <= 0) errors.push(`第${rowNum}行：零售价必须大于0`);
            if (!item.packPerBox || item.packPerBox < 1) errors.push(`第${rowNum}行：盒/箱数量必须大于0`);
            if (!item.piecePerPack || item.piecePerPack < 1) errors.push(`第${rowNum}行：包/盒数量必须大于0`);
          });
          if (errors.length > 0) {
            message.destroy();
            Modal.error({
              title: '数据验证失败',
              content: (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {errors.slice(0, 10).map((err, idx) => (<div key={idx}>{err}</div>))}
                  {errors.length > 10 && <div>...还有 {errors.length - 10} 个错误</div>}
                </div>
              ),
              width: 600,
            });
            setImportLoading(false);
            return;
          }
          let successCount = 0, failCount = 0;
          const failedItems: string[] = [];
          for (let i = 0; i < importData.length; i++) {
            const item = importData[i];
            setImportProgress(Math.round(((i + 1) / importData.length) * 100));
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
                      {failedItems.slice(0, 10).map((item, idx) => (<div key={idx} style={{ fontSize: 12 }}>{item}</div>))}
                      {failedItems.length > 10 && (<div style={{ fontSize: 12 }}>...还有 {failedItems.length - 10} 条失败</div>)}
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
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), '商品导入模板.xlsx');
    message.success('模板下载成功');
  };
```

### 2. 更新工具栏按钮（第652行）

将：
```typescript
        toolBarRender={() => [
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

改为：
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

### 3. 在编辑模态框后添加导入模态框（第1018行后）

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

## 🚀 快速实现方式

由于文件较大且有多处修改，建议：

**方式1：手动复制粘贴**
1. 打开 `client/src/pages/live-base/products/index.tsx`
2. 在第278行（删除函数后）粘贴所有Excel函数
3. 在第652行更新工具栏按钮
4. 在第1018行后添加导入模态框

**方式2：使用我提供的完整代码**
我可以创建一个完整的新文件，您直接替换即可。

---

## ✅ 完成后的效果

- 工具栏显示：[导出Excel] [导入Excel] [新增商品]
- 点击"导出Excel"：下载包含所有商品的Excel文件
- 点击"导入Excel"：打开导入对话框
- 点击"下载导入模板"：下载包含示例数据的模板

---

**需要我创建完整的文件吗？** 🚀
