import { useState } from 'react';
import { message } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface UseAdsRecordExcelProps {
  baseId: number;
  baseName: string;
  selectedMonth: dayjs.Dayjs;
  selectedHandlers: string[];
  selectedDates: string[];
  onImportSuccess?: () => void;
}

interface ImportRecord {
  month: string;
  handlerName: string;
  [key: string]: string | number;
}

export const useAdsRecordExcel = ({ baseId, baseName, selectedMonth, selectedHandlers, selectedDates, onImportSuccess }: UseAdsRecordExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  /**
   * 导出投流记录
   */
  const handleExport = async () => {
    if (!baseId) {
      message.warning('请先选择基地');
      return;
    }

    try {
      message.loading({ content: '正在导出...', key: 'export' });

      const monthStr = selectedMonth.format('YYYY-MM');
      
      // 构建查询参数
      const queryParams: any = { month: monthStr };
      
      if (selectedHandlers && selectedHandlers.length > 0) {
        queryParams.handlerIds = selectedHandlers.join(',');
      }
      
      if (selectedDates && selectedDates.length > 0) {
        queryParams.selectedDates = selectedDates.join(',');
      }
      
      const result = await request(`/api/v1/anchor-gmv-ads/${baseId}/stats`, {
        method: 'GET',
        params: queryParams,
      });

      const dataList = result.success && result.data ? result.data : [];

      // 构建导出数据
      const exportData = dataList.map((record: any) => {
        const row: any = {
          '月份': monthStr,
          '主播': record.handlerName || '',
          '总GMV': record.totalGmv || 0,
          '总投流': record.totalAds || 0,
          '投流比(%)': record.adsRatio ? record.adsRatio.toFixed(2) : '0.00',
          '直播天数': record.liveDays || 0,
          '日均GMV': record.avgDailyGmv || 0,
        };

        // 添加每日GMV和投流金额列（1-31号）
        const daysInMonth = selectedMonth.daysInMonth();
        for (let day = 1; day <= daysInMonth; day++) {
          const gmvFieldName = `day${day}Gmv`;
          const adsFieldName = `day${day}Ads`;
          row[`${day}号GMV`] = record[gmvFieldName] || 0;
          row[`${day}号投流`] = record[adsFieldName] || 0;
        }

        return row;
      });

      // 如果没有数据，创建只有列头的空表
      const daysInMonth = selectedMonth.daysInMonth();
      const headers = ['月份', '主播', '总GMV', '总投流', '投流比(%)', '直播天数', '日均GMV'];
      for (let day = 1; day <= daysInMonth; day++) {
        headers.push(`${day}号GMV`);
        headers.push(`${day}号投流`);
      }

      const ws = exportData.length > 0 
        ? XLSX.utils.json_to_sheet(exportData)
        : XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '投流记录');

      const fileName = `投流记录_${baseName}_${monthStr}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
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
    const monthStr = selectedMonth.format('YYYY-MM');
    const daysInMonth = selectedMonth.daysInMonth();

    const templateRow: any = {
      '月份': monthStr,
      '主播': '主播姓名（必须与系统中主播姓名一致）',
    };

    // 添加每日投流金额列
    for (let day = 1; day <= daysInMonth; day++) {
      templateRow[`${day}号`] = day === 1 ? 1000 : 0;
    }

    const templateData = [templateRow];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '投流记录模板');

    XLSX.writeFile(wb, `投流记录导入模板_${monthStr}.xlsx`);
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

      // 批量导入
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));

        try {
          const month = row['月份'] || selectedMonth.format('YYYY-MM');
          const handlerName = row['主播'] || '';

          if (!handlerName) {
            failCount++;
            continue;
          }

          // 提取每日投流金额
          const dailyAds: any = {};
          for (let day = 1; day <= 31; day++) {
            const value = row[`${day}号`];
            if (value !== undefined && value !== null && value !== '') {
              dailyAds[`day${day}Ads`] = parseFloat(value) || 0;
            }
          }

          const result = await request(`/api/v1/bases/${baseId}/anchor-gmv-ads/import`, {
            method: 'POST',
            data: {
              month,
              handlerName,
              ...dailyAds,
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
