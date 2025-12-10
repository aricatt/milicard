import { useState } from 'react';
import { message } from 'antd';
import { request } from '@umijs/max';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface UseConsumptionExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

interface ImportRecord {
  consumptionDate: string;
  goodsName: string;
  locationName: string;
  handlerName: string;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  notes?: string;
}

export const useConsumptionExcel = ({ baseId, baseName, onImportSuccess }: UseConsumptionExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  /**
   * 导出消耗记录
   */
  const handleExport = async () => {
    if (!baseId) {
      message.warning('请先选择基地');
      return;
    }

    try {
      message.loading({ content: '正在导出...', key: 'export' });

      const result = await request(`/api/v1/bases/${baseId}/consumptions`, {
        method: 'GET',
        params: { pageSize: 10000 },
      });

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      const exportData = dataList.map((record: any) => ({
        '消耗日期': dayjs(record.consumptionDate).format('YYYY-MM-DD'),
        '商品': record.goodsName || '',
        '直播间': record.locationName || '',
        '主播': record.handlerName || '',
        '消耗箱': record.boxQuantity || 0,
        '消耗盒': record.packQuantity || 0,
        '消耗包': record.pieceQuantity || 0,
        '备注': record.notes || '',
      }));

      // 如果没有数据，创建只有列头的空表
      const headers = ['消耗日期', '商品', '直播间', '主播', '消耗箱', '消耗盒', '消耗包', '备注'];
      const ws = exportData.length > 0 
        ? XLSX.utils.json_to_sheet(exportData)
        : XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '消耗记录');

      const fileName = `消耗记录_${baseName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      message.success({ content: `导出成功: ${exportData.length} 条记录`, key: 'export' });
    } catch (error) {
      console.error('导出失败:', error);
      message.error({ content: '导出失败', key: 'export' });
    }
  };

  /**
   * 下载导入模板
   */
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '消耗日期': '2025-01-01',
        '商品': '商品名称（必须与系统中商品名称一致）',
        '直播间': '直播间名称（必须与系统中直播间名称一致）',
        '主播': '主播姓名（必须与系统中主播姓名一致）',
        '消耗箱': 0,
        '消耗盒': 1,
        '消耗包': 0,
        '备注': '备注信息（可选）',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '消耗记录模板');

    XLSX.writeFile(wb, '消耗记录导入模板.xlsx');
    message.success('模板下载成功');
  };

  /**
   * 处理导入
   */
  const handleImport = async (file: File): Promise<boolean> => {
    if (!baseId) {
      message.warning('请先选择基地');
      return false;
    }

    setImportLoading(true);
    setImportProgress(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        message.warning('Excel文件中没有数据');
        return false;
      }

      const records: ImportRecord[] = jsonData.map((row) => ({
        consumptionDate: row['消耗日期'] || row['日期'] || '',
        goodsName: row['商品'] || row['商品名称'] || '',
        locationName: row['直播间'] || row['位置'] || '',
        handlerName: row['主播'] || row['经手人'] || '',
        boxQuantity: parseInt(row['消耗箱'] || row['箱'] || '0') || 0,
        packQuantity: parseInt(row['消耗盒'] || row['盒'] || '0') || 0,
        pieceQuantity: parseInt(row['消耗包'] || row['包'] || '0') || 0,
        notes: row['备注'] || '',
      }));

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setImportProgress(Math.round(((i + 1) / records.length) * 100));

        // 验证必填字段
        if (!record.consumptionDate || !record.goodsName || !record.locationName || !record.handlerName) {
          failCount++;
          errors.push(`第${i + 2}行: 缺少必填字段（消耗日期、商品、直播间、主播）`);
          continue;
        }

        try {
          const result = await request(`/api/v1/bases/${baseId}/consumptions/import`, {
            method: 'POST',
            data: record,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`第${i + 2}行: ${result.message || '导入失败'}`);
          }
        } catch (error: any) {
          failCount++;
          errors.push(`第${i + 2}行: ${error.message || '导入失败'}`);
        }
      }

      if (successCount > 0) {
        message.success(`导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
        onImportSuccess?.();
      } else {
        message.error(`导入失败: ${errors.slice(0, 3).join('; ')}`);
      }

      return successCount > 0;
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请检查文件格式');
      return false;
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };

  return {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
  };
};
