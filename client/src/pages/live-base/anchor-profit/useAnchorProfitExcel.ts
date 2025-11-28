import { useState } from 'react';
import { message } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface UseAnchorProfitExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

interface ImportRecord {
  profitDate: string;
  handlerName: string;
  gmvAmount: number;
  refundAmount: number;
  waterAmount: number;
  consumptionAmount: number;
  adSpendAmount: number;
  platformFeeRate: number;
  notes?: string;
}

export const useAnchorProfitExcel = ({ baseId, baseName, onImportSuccess }: UseAnchorProfitExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  /**
   * 导出利润记录
   */
  const handleExport = async () => {
    if (!baseId) {
      message.warning('请先选择基地');
      return;
    }

    try {
      message.loading({ content: '正在导出...', key: 'export' });

      const result = await request(`/api/v1/bases/${baseId}/anchor-profits`, {
        method: 'GET',
        params: { pageSize: 10000 },
      });

      if (!result.success || !result.data?.length) {
        message.warning({ content: '没有可导出的数据', key: 'export' });
        return;
      }

      const exportData = result.data.map((record: any) => ({
        '日期': dayjs(record.profitDate).format('YYYY-MM-DD'),
        '主播': record.handlerName || '',
        'GMV金额': record.gmvAmount || 0,
        '退款金额': record.refundAmount || 0,
        '走水金额': record.waterAmount || 0,
        '当日销售额': record.salesAmount || 0,
        '消耗金额': record.consumptionAmount || 0,
        '投流金额': record.adSpendAmount || 0,
        '平台扣点金额': record.platformFeeAmount || 0,
        '利润金额': record.profitAmount || 0,
        '毛利率%': record.profitRate || 0,
        '备注': record.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '主播利润');

      const fileName = `主播利润_${baseName}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
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
        '日期': '2025-01-01',
        '主播': '主播姓名（必须与系统中主播姓名一致）',
        'GMV金额': 10000,
        '退款金额': 500,
        '走水金额': 200,
        '消耗金额': 2000,
        '投流金额': 500,
        '平台扣点比例%': 17,
        '备注': '备注信息（可选）',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '主播利润模板');

    XLSX.writeFile(wb, '主播利润导入模板.xlsx');
    message.success('模板下载成功');
  };

  /**
   * 处理导入
   */
  const handleImport: UploadProps['customRequest'] = async (options) => {
    const file = options.file as File;
    
    if (!baseId) {
      message.warning('请先选择基地');
      options.onError?.(new Error('请先选择基地'));
      return;
    }

    setImportLoading(true);
    setImportProgress(0);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        message.warning('Excel文件中没有数据');
        setImportLoading(false);
        return;
      }

      // 转换数据格式
      const records: ImportRecord[] = jsonData.map((row) => ({
        profitDate: row['日期'] || '',
        handlerName: row['主播'] || '',
        gmvAmount: parseFloat(row['GMV金额']) || 0,
        refundAmount: parseFloat(row['退款金额']) || 0,
        waterAmount: parseFloat(row['走水金额']) || 0,
        consumptionAmount: parseFloat(row['消耗金额']) || 0,
        adSpendAmount: parseFloat(row['投流金额']) || 0,
        platformFeeRate: parseFloat(row['平台扣点比例%']) || 17,
        notes: row['备注'] || '',
      }));

      // 批量导入
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setImportProgress(Math.round(((i + 1) / records.length) * 100));

        try {
          // 计算字段
          const salesAmount = record.gmvAmount + record.waterAmount - record.refundAmount;
          const platformFeeAmount = (record.gmvAmount - record.refundAmount) * (record.platformFeeRate / 100);
          const profitAmount = salesAmount - record.consumptionAmount - record.adSpendAmount - platformFeeAmount;
          const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

          const result = await request(`/api/v1/bases/${baseId}/anchor-profits/import`, {
            method: 'POST',
            data: {
              ...record,
              salesAmount,
              platformFeeAmount,
              profitAmount,
              profitRate,
            },
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

      if (successCount > 0) {
        message.success(`导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
        onImportSuccess?.();
        options.onSuccess?.({});
      } else {
        message.error('导入失败，请检查数据格式');
        options.onError?.(new Error('导入失败'));
      }

      setImportModalVisible(false);
    } catch (error) {
      console.error('导入失败:', error);
      message.error('导入失败，请检查文件格式');
      options.onError?.(error as Error);
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
    handleDownloadTemplate,
  };
};
