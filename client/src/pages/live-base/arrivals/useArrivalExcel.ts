/**
 * 到货Excel导入导出Hook
 * 封装到货相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface UseArrivalExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useArrivalExcel = ({ baseId, baseName, onImportSuccess }: UseArrivalExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用，包含所有字段）
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '到货日期', key: 'arrivalDate', width: 12 },
    { header: '采购编号', key: 'purchaseOrderNo', width: 20 },
    { header: '采购名称', key: 'purchaseName', width: 35 },
    { header: '商品编号', key: 'goodsCode', width: 20 },
    { header: '商品', key: 'goodsName', width: 35 },
    { header: '直播间', key: 'locationName', width: 15 },
    { header: '主播', key: 'handlerName', width: 10 },
    { header: '到货箱', key: 'boxQuantity', width: 10 },
    { header: '到货盒', key: 'packQuantity', width: 10 },
    { header: '到货包', key: 'pieceQuantity', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出到货数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/arrivals`, {
        method: 'GET',
        params: { current: 1, pageSize: 10000 },
      });

      message.destroy();

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: any) => {
        const purchaseDate = item.purchaseDate ? item.purchaseDate.split('T')[0] : '';
        return {
          id: item.id,
          arrivalDate: item.arrivalDate ? item.arrivalDate.split('T')[0] : '',
          purchaseOrderNo: item.purchaseOrderNo,
          purchaseName: `${purchaseDate}${item.goodsName || ''}`,
          goodsCode: item.goodsCode || '',
          goodsName: item.goodsName || '',
          locationName: item.locationName || '',
          handlerName: item.handlerName || '',
          boxQuantity: item.boxQuantity || 0,
          packQuantity: item.packQuantity || 0,
          pieceQuantity: item.pieceQuantity || 0,
          createdAt: formatDateTime(item.createdAt),
        };
      });

      exportToExcel(exportData, excelColumns, '到货列表', `到货列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入到货数据
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

      // 转换数据格式
      const importData = jsonData.map((row: any) => ({
        arrivalDate: row['到货日期'] ? String(row['到货日期']).trim() : '',
        purchaseOrderNo: String(row['采购编号'] || '').trim(),
        locationName: String(row['直播间'] || '').trim(),
        handlerName: String(row['主播'] || '').trim(),
        boxQuantity: parseInt(row['到货箱'] || '0') || 0,
        packQuantity: parseInt(row['到货盒'] || '0') || 0,
        pieceQuantity: parseInt(row['到货包'] || '0') || 0,
      }));

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'arrivalDate', required: true, message: '到货日期不能为空' },
        { field: 'purchaseOrderNo', required: true, message: '采购编号不能为空' },
        { field: 'locationName', required: true, message: '直播间不能为空' },
        { field: 'handlerName', required: true, message: '主播不能为空' },
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
          const result = await request(`/api/v1/bases/${baseId}/arrivals/import`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedItems.push(`第${excelRowNum}行：${item.purchaseOrderNo} - ${result.message || '创建失败'}`);
          }
        } catch (error: any) {
          failCount++;
          const errorMsg = error?.response?.data?.message || error.message || '网络错误';
          failedItems.push(`第${excelRowNum}行：${item.purchaseOrderNo} - ${errorMsg}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条到货记录`);
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
    { header: '到货日期', key: 'arrivalDate', width: 12 },
    { header: '采购编号', key: 'purchaseOrderNo', width: 20 },
    { header: '直播间', key: 'locationName', width: 15 },
    { header: '主播', key: 'handlerName', width: 10 },
    { header: '到货箱', key: 'boxQuantity', width: 10 },
    { header: '到货盒', key: 'packQuantity', width: 10 },
    { header: '到货包', key: 'pieceQuantity', width: 10 },
  ];

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        arrivalDate: '2025-11-24',
        purchaseOrderNo: 'PUSH-1CLM4AT5542',
        locationName: '泰国仓库 1',
        handlerName: 'Lin',
        boxQuantity: 2,
        packQuantity: 0,
        pieceQuantity: 0,
      },
      {
        arrivalDate: '2025-11-19',
        purchaseOrderNo: 'PUSH-G93W3714HRQ',
        locationName: '泰国仓库 1',
        handlerName: 'Lin',
        boxQuantity: 0,
        packQuantity: 17,
        pieceQuantity: 0,
      },
    ];

    downloadTemplate(templateData, importTemplateColumns, '到货导入模板', '到货导入模板');
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
