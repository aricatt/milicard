import { useState } from 'react';
import { message, Modal } from 'antd';
import * as XLSX from 'xlsx';
import { request } from '@umijs/max';

interface LocationExcelRow {
  '地点编号': string;
  '地点名称': string;
  '地点类型': string;
  '联系人'?: string;
  '联系电话'?: string;
  '地址'?: string;
  '备注'?: string;
}

interface LocationImportData {
  code?: string;
  name: string;
  type: string;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  description?: string;
  isNew: boolean;
}

const LOCATION_TYPE_MAP: Record<string, string> = {
  '总仓库': 'MAIN_WAREHOUSE',
  '仓库': 'WAREHOUSE',
  '直播间': 'LIVE_ROOM',
};

const LOCATION_TYPE_REVERSE_MAP: Record<string, string> = {
  'MAIN_WAREHOUSE': '总仓库',
  'WAREHOUSE': '仓库',
  'LIVE_ROOM': '直播间',
};

export const useLocationExcel = (baseId: number | undefined, onImportSuccess?: () => void) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleExport = async () => {
    if (!baseId) {
      message.error('请先选择基地');
      return;
    }

    try {
      message.loading({ content: '正在导出...', key: 'export' });

      const response = await request(`/api/v1/bases/${baseId}/locations`, {
        method: 'GET',
        params: {
          current: 1,
          pageSize: 10000,
        },
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || '获取数据失败');
      }

      const locations = response.data;

      const excelData = locations.map((location: any) => ({
        '地点编号': location.code || '',
        '地点名称': location.name || '',
        '地点类型': LOCATION_TYPE_REVERSE_MAP[location.type] || location.type,
        '联系人': location.contactPerson || '',
        '联系电话': location.contactPhone || '',
        '地址': location.address || '',
        '备注': location.description || '',
        '状态': location.isActive ? '启用' : '停用',
        '创建时间': location.createdAt ? new Date(location.createdAt).toLocaleString('zh-CN') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '直播间仓库');

      const colWidths = [
        { wch: 20 }, // 地点编号
        { wch: 25 }, // 地点名称
        { wch: 12 }, // 地点类型
        { wch: 15 }, // 联系人
        { wch: 15 }, // 联系电话
        { wch: 30 }, // 地址
        { wch: 30 }, // 备注
        { wch: 10 }, // 状态
        { wch: 20 }, // 创建时间
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `直播间仓库_${new Date().toLocaleDateString('zh-CN')}.xlsx`);

      message.success({ content: `成功导出 ${locations.length} 条数据`, key: 'export' });
    } catch (error) {
      console.error('导出失败:', error);
      message.error({ content: error instanceof Error ? error.message : '导出失败，请重试', key: 'export' });
    }
  };

  const handleImport = async (file: File) => {
    if (!baseId) {
      message.error('请先选择基地');
      return;
    }

    setImportLoading(true);
    setImportProgress(0);

    try {
      message.loading({ content: '正在读取文件...', key: 'import', duration: 0 });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: LocationExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        message.destroy();
        message.warning('文件中没有数据');
        setImportLoading(false);
        return;
      }

      message.loading({ content: '正在验证数据...', key: 'import', duration: 0 });

      const existingLocationsResponse = await request(`/api/v1/bases/${baseId}/locations`, {
        method: 'GET',
        params: {
          current: 1,
          pageSize: 10000,
        },
      });

      const existingLocations = existingLocationsResponse.success ? existingLocationsResponse.data || [] : [];
      const existingCodeSet = new Set(existingLocations.map((loc: any) => loc.code));
      const existingNameSet = new Set(existingLocations.map((loc: any) => loc.name));

      const importData: LocationImportData[] = [];
      const errors: string[] = [];
      const typeErrors: string[] = [];

      jsonData.forEach((row, index) => {
        const rowNum = index + 2;

        if (!row['地点名称']) {
          errors.push(`第 ${rowNum} 行：地点名称不能为空`);
          return;
        }

        if (!row['地点类型']) {
          errors.push(`第 ${rowNum} 行：地点类型不能为空`);
          return;
        }

        const typeKey = String(row['地点类型']).trim();
        const mappedType = LOCATION_TYPE_MAP[typeKey];

        if (!mappedType) {
          typeErrors.push(`第 ${rowNum} 行：地点类型 "${typeKey}" 无效，必须是：总仓库、仓库、直播间`);
          return;
        }

        const code = String(row['地点编号'] || '').trim();
        const name = String(row['地点名称']).trim();

        let isNew = true;
        if (code && existingCodeSet.has(code)) {
          isNew = false;
        } else if (existingNameSet.has(name)) {
          errors.push(`第 ${rowNum} 行：地点名称 "${name}" 已存在，请使用不同的名称或提供正确的地点编号进行更新`);
          return;
        }

        importData.push({
          code: code || undefined,
          name,
          type: mappedType,
          contactPerson: String(row['联系人'] || '').trim() || undefined,
          contactPhone: String(row['联系电话'] || '').trim() || undefined,
          address: String(row['地址'] || '').trim() || undefined,
          description: String(row['备注'] || '').trim() || undefined,
          isNew,
        });
      });

      if (typeErrors.length > 0) {
        message.destroy();
        const errorList = typeErrors.slice(0, 10).join('\n');
        const moreErrors = typeErrors.length > 10 ? `\n...还有 ${typeErrors.length - 10} 个错误` : '';
        Modal.error({
          title: '地点类型错误',
          content: `请使用正确的地点类型：\n\n${errorList}${moreErrors}`,
          width: 600,
        });
        setImportLoading(false);
        return;
      }

      if (errors.length > 0) {
        message.destroy();
        const errorList = errors.slice(0, 10).join('\n');
        const moreErrors = errors.length > 10 ? `\n...还有 ${errors.length - 10} 个错误` : '';
        Modal.error({
          title: '数据验证失败',
          content: errorList + moreErrors,
          width: 600,
        });
        setImportLoading(false);
        return;
      }

      message.destroy();

      let successCount = 0;
      let updateCount = 0;
      let failCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        try {
          if (item.isNew) {
            const result = await request(`/api/v1/bases/${baseId}/locations`, {
              method: 'POST',
              data: {
                name: item.name,
                type: item.type,
                contactPerson: item.contactPerson,
                contactPhone: item.contactPhone,
                address: item.address,
                description: item.description,
              },
            });

            if (result.success) {
              successCount++;
            } else {
              failCount++;
              failedItems.push(`${item.name} - ${result.message || '创建失败'}`);
            }
          } else {
            const existingLocation = existingLocations.find((loc: any) => loc.code === item.code);
            if (existingLocation) {
              const result = await request(`/api/v1/bases/${baseId}/locations/${existingLocation.id}`, {
                method: 'PUT',
                data: {
                  name: item.name,
                  type: item.type,
                  contactPerson: item.contactPerson,
                  contactPhone: item.contactPhone,
                  address: item.address,
                  description: item.description,
                },
              });

              if (result.success) {
                updateCount++;
              } else {
                failCount++;
                failedItems.push(`${item.name} - ${result.message || '更新失败'}`);
              }
            }
          }
        } catch (error) {
          failCount++;
          failedItems.push(`${item.name} - ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      let resultMessage = '';
      if (successCount > 0) resultMessage += `成功创建 ${successCount} 条`;
      if (updateCount > 0) resultMessage += `${resultMessage ? '，' : ''}更新 ${updateCount} 条`;
      if (failCount > 0) resultMessage += `${resultMessage ? '，' : ''}失败 ${failCount} 条`;

      if (failCount > 0) {
        Modal.warning({
          title: '导入完成（部分失败）',
          content: (
            <div>
              <p>{resultMessage}</p>
              <p style={{ marginTop: 16, marginBottom: 8 }}>失败项目：</p>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                {failedItems.map((item, idx) => (
                  <div key={idx} style={{ color: '#ff4d4f', fontSize: 12 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ),
          width: 600,
        });
      } else {
        message.success(resultMessage || '导入完成');
      }

      setImportModalVisible(false);
      setImportProgress(0);
      onImportSuccess?.();
    } catch (error) {
      console.error('导入失败:', error);
      message.error(error instanceof Error ? error.message : '导入失败，请重试');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '地点编号': 'WAREHOUSE-XXXXXXXXXXX',
        '地点名称': '总仓库',
        '地点类型': '总仓库',
        '联系人': '张三',
        '联系电话': '13800138000',
        '地址': '越南胡志明市第一郡',
        '备注': '主仓库，负责所有商品的入库和存储',
      },
      {
        '地点编号': '',
        '地点名称': '小王的直播间',
        '地点类型': '直播间',
        '联系人': '小王',
        '联系电话': '13800138001',
        '地址': '',
        '备注': '主播小王的直播间',
      },
      {
        '地点编号': '',
        '地点名称': '备用仓库',
        '地点类型': '仓库',
        '联系人': '李四',
        '联系电话': '13800138002',
        '地址': '越南胡志明市第二郡',
        '备注': '备用仓库，用于存放临时商品',
      },
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 创建模板数据工作表
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    wsTemplate['!cols'] = [
      { wch: 25 }, // 地点编号
      { wch: 25 }, // 地点名称
      { wch: 12 }, // 地点类型
      { wch: 15 }, // 联系人
      { wch: 15 }, // 联系电话
      { wch: 30 }, // 地址
      { wch: 40 }, // 备注
    ];

    // 添加模板工作表
    XLSX.utils.book_append_sheet(wb, wsTemplate, '直播间仓库模板');

    XLSX.writeFile(wb, '直播间仓库导入模板.xlsx');
    message.success('模板下载成功');
  };

  return {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  };
};
