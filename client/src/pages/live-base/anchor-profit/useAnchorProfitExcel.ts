import { useState } from 'react';
import { message, Modal } from 'antd';
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
  consumptionDate: string;
  categoryName: string;
  goodsName: string;
  locationName: string;
  handlerName: string;
  gmvAmount: number;
  refundAmount: number;
  cancelOrderAmount: number;
  shopOrderAmount: number;
  waterAmount: number;
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

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      const exportData = dataList.map((record: any) => ({
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

      // 如果没有数据，创建只有列头的空表
      const headers = ['日期', '主播', 'GMV金额', '退款金额', '走水金额', '当日销售额', '消耗金额', '投流金额', '平台扣点金额', '利润金额', '毛利率%', '备注'];
      const ws = exportData.length > 0 
        ? XLSX.utils.json_to_sheet(exportData)
        : XLSX.utils.aoa_to_sheet([headers]);
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
        '消耗日期': '2025-01-01',
        '品类': '卡牌',
        '商品': '宫崎骏卡牌',
        '直播间': '直播间A',
        '主播': '张三',
        'GMV金额': 10000,
        '退款金额': 500,
        '取消订单': 200,
        '店铺订单': 300,
        '走水金额': 200,
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
  const handleImport = async (options: any) => {
    if (!baseId) {
      message.warning('请先选择基地');
      options.onError?.(new Error('请先选择基地'));
      return;
    }

    // 从 customRequest 参数中提取 file 对象
    const file = options.file as File;
    if (!file) {
      message.error('未找到文件');
      options.onError?.(new Error('未找到文件'));
      return;
    }

    setImportLoading(true);
    setImportProgress(0);

    try {
      // 兼容性处理：某些浏览器可能不支持 file.arrayBuffer()
      let data: ArrayBuffer;
      if (typeof file.arrayBuffer === 'function') {
        data = await file.arrayBuffer();
      } else {
        // 使用 FileReader 作为兼容方案
        data = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
              resolve(e.target.result);
            } else {
              reject(new Error('读取文件失败'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });
      }

      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        message.warning('Excel文件中没有数据');
        setImportLoading(false);
        return;
      }

      // Excel日期序列号转换为日期字符串
      const excelDateToString = (value: any): string => {
        if (!value) return '';
        const strValue = String(value).trim();
        
        // 如果已经是日期格式字符串（包含-或/），使用dayjs解析并标准化为YYYY-MM-DD格式
        if (strValue.includes('-') || strValue.includes('/')) {
          const parsed = dayjs(strValue);
          if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
          }
          return strValue;
        }
        
        // 如果是数字（Excel日期序列号），转换为日期
        const num = parseFloat(strValue);
        if (!isNaN(num) && num > 0) {
          // Excel日期序列号转换：从1900-01-01开始，但Excel有个bug认为1900年是闰年
          // 使用UTC时间避免时区问题
          const excelEpoch = Date.UTC(1899, 11, 30); // 1899-12-30 UTC
          const timestamp = excelEpoch + num * 24 * 60 * 60 * 1000;
          const date = new Date(timestamp);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return strValue;
      };

      // 转换数据格式
      const records: ImportRecord[] = jsonData.map((row) => ({
        profitDate: excelDateToString(row['日期']),
        consumptionDate: excelDateToString(row['消耗日期']),
        categoryName: String(row['品类'] || '').trim(),
        goodsName: String(row['商品'] || '').trim(),
        locationName: String(row['直播间'] || '').trim(),
        handlerName: String(row['主播'] || '').trim(),
        gmvAmount: parseFloat(row['GMV金额']) || 0,
        refundAmount: parseFloat(row['退款金额']) || 0,
        cancelOrderAmount: parseFloat(row['取消订单']) || 0,
        shopOrderAmount: parseFloat(row['店铺订单']) || 0,
        waterAmount: parseFloat(row['走水金额']) || 0,
        platformFeeRate: parseFloat(row['平台扣点比例%']) || 17,
        notes: row['备注'] || '',
      }));

      // 批量导入
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      const validationErrors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setImportProgress(Math.round(((i + 1) / records.length) * 100));

        try {
          // 后端会根据消耗记录自动计算消耗金额、销售额、平台扣点、利润等字段
          const result = await request(`/api/v1/bases/${baseId}/anchor-profits/import`, {
            method: 'POST',
            data: record,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            const errorMsg = `第${i + 2}行: ${result.message || '导入失败'}`;
            errors.push(errorMsg);
            // 如果是验证错误或重复记录错误，添加到验证错误列表
            if (result.message?.includes('已关联') || result.message?.includes('重复') || result.message?.includes('未找到')) {
              validationErrors.push(errorMsg);
            }
          }
        } catch (error: any) {
          failCount++;
          const errorMessage = error?.data?.message || error?.message || '导入失败';
          const errorMsg = `第${i + 2}行: ${errorMessage}`;
          errors.push(errorMsg);
          // 如果是验证错误或重复记录错误，添加到验证错误列表
          if (errorMessage?.includes('已关联') || errorMessage?.includes('重复') || errorMessage?.includes('未找到')) {
            validationErrors.push(errorMsg);
          }
        }
      }

      // 如果有验证错误，显示详细的错误弹窗
      if (validationErrors.length > 0) {
        const errorList = validationErrors.slice(0, 10).join('\n');
        const moreErrors = validationErrors.length > 10 ? `\n...还有 ${validationErrors.length - 10} 个错误` : '';
        Modal.error({
          title: '数据验证失败',
          content: errorList + moreErrors,
          width: 600,
        });
      }

      if (successCount > 0) {
        message.success(`导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
        onImportSuccess?.();
        options.onSuccess?.({});
      } else if (validationErrors.length === 0 && errors.length > 0) {
        // 如果没有验证错误但有其他错误，显示简单的错误提示
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
