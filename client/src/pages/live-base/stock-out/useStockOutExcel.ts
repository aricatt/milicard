/**
 * 出库Excel导入导出Hook
 * 封装出库相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';
import dayjs from 'dayjs';

interface UseStockOutExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useStockOutExcel = ({ baseId, baseName, onImportSuccess }: UseStockOutExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用，包含所有字段）
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '出库日期', key: 'date', width: 12 },
    { header: '出库类型', key: 'typeName', width: 12 },
    { header: '商品编号', key: 'goodsCode', width: 20 },
    { header: '品类', key: 'categoryName', width: 10 },
    { header: '商品', key: 'goodsName', width: 35 },
    { header: '出库位置', key: 'locationName', width: 15 },
    { header: '目标/对象', key: 'targetName', width: 20 },
    { header: '关联单号', key: 'relatedOrderCode', width: 20 },
    { header: '出库箱', key: 'boxQuantity', width: 10 },
    { header: '出库盒', key: 'packQuantity', width: 10 },
    { header: '出库包', key: 'pieceQuantity', width: 10 },
    { header: '备注', key: 'remark', width: 30 },
    { header: '创建人', key: 'creatorName', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 出库类型映射
  const typeMap: Record<string, string> = {
    'POINT_ORDER': '点单出库',
    'TRANSFER': '调拨出库',
    'MANUAL': '手动出库',
  };

  // 导出出库数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/stock-outs`, {
        method: 'GET',
        params: { current: 1, pageSize: 10000 },
      });

      message.destroy();

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: any) => ({
        id: item.id,
        date: item.date ? item.date.split('T')[0] : '',
        typeName: typeMap[item.type] || item.type,
        goodsCode: item.goods?.code || '',
        categoryName: item.goods?.category?.name || '',
        goodsName: item.goods?.name || '',
        locationName: item.location?.name || '',
        targetName: item.targetName || '',
        relatedOrderCode: item.relatedOrderCode || '',
        boxQuantity: item.boxQuantity || 0,
        packQuantity: item.packQuantity || 0,
        pieceQuantity: item.pieceQuantity || 0,
        remark: item.remark || '',
        creatorName: item.creator?.name || '',
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '出库列表', `出库列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入出库数据
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

      // 转换数据格式（强制设置为手动出库）
      const importData = jsonData.map((row: any) => ({
        date: excelDateToString(row['出库日期']),
        type: '手动出库', // 强制设置为手动出库
        goodsCode: String(row['商品编号'] || '').trim(),
        categoryName: String(row['品类名称'] || '').trim(),
        goodsName: String(row['商品名称'] || '').trim(),
        locationName: String(row['出库位置'] || '').trim(),
        targetName: String(row['目标/对象'] || '').trim(),
        relatedOrderCode: String(row['关联单号'] || '').trim(),
        boxQuantity: parseInt(row['出库箱'] || '0') || 0,
        packQuantity: parseInt(row['出库盒'] || '0') || 0,
        pieceQuantity: parseInt(row['出库包'] || '0') || 0,
        remark: String(row['备注'] || '').trim(),
      }));

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'date', required: true, message: '出库日期不能为空' },
        { field: 'locationName', required: true, message: '出库位置不能为空' },
      ]);

      // 自定义验证：必须提供商品编号，或者同时提供品类名称和商品名称
      importData.forEach((item: any, index: number) => {
        if (!item.goodsCode && !(item.categoryName && item.goodsName)) {
          errors.push(`第${index + 2}行：必须提供商品编号，或者同时提供品类名称和商品名称`);
        }
      });

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
          const result = await request(`/api/v1/bases/${baseId}/stock-outs/import`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedItems.push(`第${excelRowNum}行：${item.goodsCode} - ${result.message || '创建失败'}`);
          }
        } catch (error: any) {
          failCount++;
          const errorMsg = error?.response?.data?.message || error.message || '网络错误';
          failedItems.push(`第${excelRowNum}行：${item.goodsCode} - ${errorMsg}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条出库记录`);
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

  // 导入模板列配置（移除出库类型列，因为只能导入手动出库）
  const importTemplateColumns = [
    { header: '出库日期', key: 'date', width: 12 },
    { header: '商品编号', key: 'goodsCode', width: 20 },
    { header: '品类名称', key: 'categoryName', width: 20 },
    { header: '商品名称', key: 'goodsName', width: 35 },
    { header: '出库位置', key: 'locationName', width: 15 },
    { header: '目标/对象', key: 'targetName', width: 20 },
    { header: '关联单号', key: 'relatedOrderCode', width: 20 },
    { header: '出库箱', key: 'boxQuantity', width: 10 },
    { header: '出库盒', key: 'packQuantity', width: 10 },
    { header: '出库包', key: 'pieceQuantity', width: 10 },
    { header: '备注', key: 'remark', width: 30 },
  ];

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        date: '2026-01-15',
        goodsCode: '',
        categoryName: '',
        goodsName: '',
        locationName: 'G层仓库',
        targetName: '【3L】-A',
        relatedOrderCode: '',
        boxQuantity: 2,
        packQuantity: 0,
        pieceQuantity: 0,
        remark: '使用商品编号的示例',
      },
      {
        date: '2026-01-15',
        goodsCode: '',
        categoryName: '卡牌',
        goodsName: '创造营亚洲第二季·星光熠梦收藏卡',
        locationName: 'G层仓库',
        targetName: '损耗',
        relatedOrderCode: '',
        boxQuantity: 0,
        packQuantity: 5,
        pieceQuantity: 0,
        remark: '使用品类名称+商品名称的示例',
      },
    ];

    downloadTemplate(templateData, importTemplateColumns, '出库导入模板', '出库导入模板');
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
