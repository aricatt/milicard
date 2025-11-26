/**
 * 采购Excel导入导出Hook
 * 封装采购相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface PurchaseOrder {
  id: string;
  orderNo: string;
  purchaseDate: string;
  purchaseName: string;
  goodsName: string;
  retailPrice: number;
  discount: number;
  supplierName: string;
  purchaseBoxes: number;
  purchasePacks: number;
  purchasePieces: number;
  arrivedBoxes: number;
  arrivedPacks: number;
  arrivedPieces: number;
  diffBoxes: number;
  diffPacks: number;
  diffPieces: number;
  unitPriceBox: number;
  unitPricePack: number;
  unitPricePiece: number;
  amountBox: number;
  amountPack: number;
  amountPiece: number;
  totalAmount: number;
  createdAt: string;
}

interface UseProcurementExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useProcurementExcel = ({ baseId, baseName, onImportSuccess }: UseProcurementExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '采购日期', key: 'purchaseDate', width: 12 },
    { header: '采购编号', key: 'orderNo', width: 20 },
    { header: '采购名称', key: 'purchaseName', width: 35 },
    { header: '商品名称', key: 'goodsName', width: 35 },
    { header: '零售价', key: 'retailPrice', width: 12 },
    { header: '折扣', key: 'discount', width: 10 },
    { header: '供应商', key: 'supplierName', width: 15 },
    { header: '采购箱', key: 'purchaseBoxes', width: 10 },
    { header: '采购盒', key: 'purchasePacks', width: 10 },
    { header: '采购包', key: 'purchasePieces', width: 10 },
    { header: '到货箱', key: 'arrivedBoxes', width: 10 },
    { header: '到货盒', key: 'arrivedPacks', width: 10 },
    { header: '到货包', key: 'arrivedPieces', width: 10 },
    { header: '相差箱', key: 'diffBoxes', width: 10 },
    { header: '相差盒', key: 'diffPacks', width: 10 },
    { header: '相差包', key: 'diffPieces', width: 10 },
    { header: '拿货单价箱', key: 'unitPriceBox', width: 12 },
    { header: '拿货单价盒', key: 'unitPricePack', width: 12 },
    { header: '拿货单价包', key: 'unitPricePiece', width: 12 },
    { header: '应付金额箱', key: 'amountBox', width: 12 },
    { header: '应付金额盒', key: 'amountPack', width: 12 },
    { header: '应付金额包', key: 'amountPiece', width: 12 },
    { header: '应付总金额', key: 'totalAmount', width: 12 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出采购数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/purchase-orders`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      if (!result.success || !result.data) {
        message.warning('没有数据可导出');
        return;
      }

      // 转换数据格式
      const exportData = result.data.map((item: PurchaseOrder) => ({
        id: item.id,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('zh-CN') : '',
        orderNo: item.orderNo,
        purchaseName: item.purchaseName || '',
        goodsName: item.goodsName || '',
        retailPrice: item.retailPrice || 0,
        discount: item.discount || 0,
        supplierName: item.supplierName,
        purchaseBoxes: item.purchaseBoxes || 0,
        purchasePacks: item.purchasePacks || 0,
        purchasePieces: item.purchasePieces || 0,
        arrivedBoxes: item.arrivedBoxes || 0,
        arrivedPacks: item.arrivedPacks || 0,
        arrivedPieces: item.arrivedPieces || 0,
        diffBoxes: item.diffBoxes || 0,
        diffPacks: item.diffPacks || 0,
        diffPieces: item.diffPieces || 0,
        unitPriceBox: item.unitPriceBox || 0,
        unitPricePack: item.unitPricePack || 0,
        unitPricePiece: item.unitPricePiece || 0,
        amountBox: item.amountBox || 0,
        amountPack: item.amountPack || 0,
        amountPiece: item.amountPiece || 0,
        totalAmount: item.totalAmount || 0,
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '采购列表', `采购列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入采购数据
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
        purchaseDate: row['采购日期'] ? String(row['采购日期']).trim() : '',
        purchaseName: String(row['采购名称'] || '').trim(),
        goodsName: String(row['商品名称'] || '').trim(),
        supplierName: String(row['供应商'] || '').trim(),
        retailPrice: parseFloat(row['零售价'] || '0'),
        discount: parseFloat(row['折扣'] || '0'),
        purchaseBoxes: parseInt(row['采购箱'] || '0'),
        purchasePacks: parseInt(row['采购盒'] || '0'),
        purchasePieces: parseInt(row['采购包'] || '0'),
        unitPriceBox: parseFloat(row['拿货单价箱'] || '0'),
        unitPricePack: parseFloat(row['拿货单价盒'] || '0'),
        unitPricePiece: parseFloat(row['拿货单价包'] || '0'),
      }));

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'purchaseDate', required: true, message: '采购日期不能为空' },
        { field: 'supplierName', required: true, message: '供应商不能为空' },
        { field: 'goodsName', required: true, message: '商品名称不能为空' },
        { field: 'retailPrice', required: true, type: 'number', min: 0, message: '零售价必须大于等于0' },
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

      // 批量导入
      let successCount = 0;
      let failCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        try {
          const result = await request(`/api/v1/bases/${baseId}/purchase-orders`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedItems.push(`第${i + 2}行：${item.goodsName} - ${result.message || '创建失败'}`);
          }
        } catch (error: any) {
          failCount++;
          failedItems.push(`第${i + 2}行：${item.goodsName} - ${error.message || '网络错误'}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条采购记录`);
      } else {
        const failedList = failedItems.slice(0, 10).join('\n');
        const moreFailures = failedItems.length > 10 ? `\n...还有 ${failedItems.length - 10} 条失败` : '';
        const content = `成功导入：${successCount} 条\n失败：${failCount} 条\n\n失败详情：\n${failedList}${moreFailures}`;
        Modal.warning({
          title: '导入完成',
          content,
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

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        id: '（导入时此列会被忽略）',
        purchaseDate: '2025-11-17',
        orderNo: '（系统自动生成）',
        purchaseName: '2025-11-17名侦探柯南挂件-星绽版-第1弹',
        goodsName: '名侦探柯南挂件-星绽版-第1弹',
        retailPrice: 19440,
        discount: 49.88,
        supplierName: '咸鱼',
        purchaseBoxes: 0,
        purchasePacks: 17,
        purchasePieces: 0,
        arrivedBoxes: 0,
        arrivedPacks: 0,
        arrivedPieces: 0,
        diffBoxes: 0,
        diffPacks: 17,
        diffPieces: 0,
        unitPriceBox: 9697.5,
        unitPricePack: 269.37,
        unitPricePiece: 22.44,
        amountBox: 0,
        amountPack: 4579.29,
        amountPiece: 0,
        totalAmount: 4579.29,
        createdAt: '（系统自动生成）',
      },
      {
        id: '',
        purchaseDate: '2025-11-17',
        orderNo: '',
        purchaseName: '2025-11-17卡游柯南揭秘包1元包',
        goodsName: '卡游柯南揭秘包1元包',
        retailPrice: 8208,
        discount: 122.12,
        supplierName: '江西小精灵',
        purchaseBoxes: 1,
        purchasePacks: 0,
        purchasePieces: 0,
        arrivedBoxes: 0,
        arrivedPacks: 0,
        arrivedPieces: 0,
        diffBoxes: 1,
        diffPacks: 0,
        diffPieces: 0,
        unitPriceBox: 10023.21,
        unitPricePack: 208.81,
        unitPricePiece: 5.8,
        amountBox: 10023.21,
        amountPack: 0,
        amountPiece: 0,
        totalAmount: 10023.21,
        createdAt: '',
      },
    ];

    downloadTemplate(templateData, excelColumns, '采购导入模板', '采购导入模板');
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
