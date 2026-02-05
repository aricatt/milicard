/**
 * 调货Excel导入导出Hook
 * 封装调货相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';
import dayjs from 'dayjs';

interface UseTransferExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useTransferExcel = ({ baseId, baseName, onImportSuccess }: UseTransferExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用，包含所有字段）
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '调货日期', key: 'transferDate', width: 12 },
    { header: '商品编号', key: 'goodsCode', width: 20 },
    { header: '品类', key: 'categoryName', width: 10 },
    { header: '商品', key: 'goodsName', width: 35 },
    { header: '调出直播间', key: 'sourceLocationName', width: 15 },
    { header: '调出主播', key: 'sourceHandlerName', width: 10 },
    { header: '调入直播间', key: 'destinationLocationName', width: 15 },
    { header: '调入主播', key: 'destinationHandlerName', width: 10 },
    { header: '调货箱', key: 'boxQuantity', width: 10 },
    { header: '调货盒', key: 'packQuantity', width: 10 },
    { header: '调货包', key: 'pieceQuantity', width: 10 },
    { header: '备注', key: 'notes', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出调货数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/transfers`, {
        method: 'GET',
        params: { current: 1, pageSize: 10000 },
      });

      message.destroy();

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: any) => ({
        id: item.id,
        transferDate: item.transferDate ? item.transferDate.split('T')[0] : '',
        goodsCode: item.goodsCode || '',
        categoryName: item.categoryName || '',
        goodsName: item.goodsName || '',
        sourceLocationName: item.sourceLocationName || '',
        sourceHandlerName: item.sourceHandlerName || '',
        destinationLocationName: item.destinationLocationName || '',
        destinationHandlerName: item.destinationHandlerName || '',
        boxQuantity: item.boxQuantity || 0,
        packQuantity: item.packQuantity || 0,
        pieceQuantity: item.pieceQuantity || 0,
        notes: item.notes || '',
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '调货列表', `调货列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入调货数据
  const handleImport: UploadProps['customRequest'] = async (options) => {
    const { file } = options;
    setImportLoading(true);
    setImportProgress(0);

    try {
      // 读取Excel文件
      const jsonData = await readExcelFile(file as File);

      if (jsonData.length === 0) {
        message.warning('Excel文件中没有数据');
        setImportLoading(false);
        return;
      }

      message.loading(`准备导入 ${jsonData.length} 条数据...`, 0);

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
      const importData = jsonData.map((row: any) => ({
        transferDate: excelDateToString(row['调货日期']),
        categoryName: String(row['品类'] || '').trim(),
        goodsName: String(row['商品'] || '').trim(),
        sourceLocationName: String(row['调出直播间'] || '').trim(),
        sourceHandlerName: String(row['调出主播'] || '').trim(),
        destinationLocationName: String(row['调入直播间'] || '').trim(),
        destinationHandlerName: String(row['调入主播'] || '').trim(),
        boxQuantity: parseInt(row['调货箱'] || '0') || 0,
        packQuantity: parseInt(row['调货盒'] || '0') || 0,
        pieceQuantity: parseInt(row['调货包'] || '0') || 0,
        notes: String(row['备注'] || '').trim(),
      }));

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'transferDate', required: true, message: '调货日期不能为空' },
        { field: 'categoryName', required: true, message: '品类不能为空' },
        { field: 'goodsName', required: true, message: '商品不能为空' },
        { field: 'sourceLocationName', required: true, message: '调出直播间不能为空' },
        { field: 'sourceHandlerName', required: true, message: '调出主播不能为空' },
        { field: 'destinationLocationName', required: true, message: '调入直播间不能为空' },
        { field: 'destinationHandlerName', required: true, message: '调入主播不能为空' },
      ]);

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

      // 批量导入 - 从第一行开始按顺序导入
      let successCount = 0;
      let failCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        const excelRowNum = i + 2; // Excel行号（第1行是表头）
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        try {
          const result = await request(`/api/v1/bases/${baseId}/transfers/import`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedItems.push(`第${excelRowNum}行：${item.goodsName} - ${result.message || '创建失败'}`);
          }
        } catch (error: any) {
          failCount++;
          const errorMsg = error?.response?.data?.message || error.message || '网络错误';
          failedItems.push(`第${excelRowNum}行：${item.goodsName} - ${errorMsg}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条调货记录`);
      } else {
        const failedList = failedItems.slice(0, 10).join('\n');
        const moreFailures = failedItems.length > 10 ? `\n...还有 ${failedItems.length - 10} 条失败` : '';
        const content = `成功导入：${successCount} 条\n失败：${failCount} 条\n\n失败详情：\n${failedList}${moreFailures}`;
        Modal.warning({
          title: '导入完成',
          content: content,
          width: 600,
        });
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

  // 导入模板列配置
  const importTemplateColumns = [
    { header: '调货日期', key: 'transferDate', width: 12 },
    { header: '品类', key: 'categoryName', width: 10 },
    { header: '商品', key: 'goodsName', width: 35 },
    { header: '调出直播间', key: 'sourceLocationName', width: 15 },
    { header: '调出主播', key: 'sourceHandlerName', width: 10 },
    { header: '调入直播间', key: 'destinationLocationName', width: 15 },
    { header: '调入主播', key: 'destinationHandlerName', width: 10 },
    { header: '调货箱', key: 'boxQuantity', width: 10 },
    { header: '调货盒', key: 'packQuantity', width: 10 },
    { header: '调货包', key: 'pieceQuantity', width: 10 },
    { header: '备注', key: 'notes', width: 20 },
  ];

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        transferDate: '2025-11-24',
        categoryName: '卡牌',
        goodsName: '商品名称示例',
        sourceLocationName: 'Live Room 1',
        sourceHandlerName: 'Lin',
        destinationLocationName: 'Live Room 2',
        destinationHandlerName: 'Sai',
        boxQuantity: 1,
        packQuantity: 0,
        pieceQuantity: 0,
        notes: '',
      },
      {
        transferDate: '2025-11-25',
        categoryName: '卡砖',
        goodsName: '另一个商品',
        sourceLocationName: 'Live Room 2',
        sourceHandlerName: 'Sai',
        destinationLocationName: 'Live Room 1',
        destinationHandlerName: 'Nice',
        boxQuantity: 0,
        packQuantity: 5,
        pieceQuantity: 0,
        notes: '测试备注',
      },
    ];

    downloadTemplate(templateData, importTemplateColumns, '调货导入模板', '调货导入模板');
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
