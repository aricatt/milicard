/**
 * 采购Excel导入导出Hook
 * 封装采购相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface UseProcurementExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useProcurementExcel = ({ baseId, baseName, onImportSuccess }: UseProcurementExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用，包含所有字段）
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '采购日期', key: 'purchaseDate', width: 12 },
    { header: '采购编号', key: 'orderNo', width: 20 },
    { header: '采购名称', key: 'purchaseName', width: 35 },
    { header: '商品名称', key: 'goodsName', width: 35 },
    { header: '零售价', key: 'retailPrice', width: 12 },
    { header: '折扣%', key: 'discount', width: 10 },
    { header: '供应商', key: 'supplierName', width: 15 },
    { header: '采购箱', key: 'purchaseBoxQty', width: 10 },
    { header: '采购盒', key: 'purchasePackQty', width: 10 },
    { header: '采购包', key: 'purchasePieceQty', width: 10 },
    { header: '到货箱', key: 'arrivedBoxQty', width: 10 },
    { header: '到货盒', key: 'arrivedPackQty', width: 10 },
    { header: '到货包', key: 'arrivedPieceQty', width: 10 },
    { header: '相差箱', key: 'diffBoxQty', width: 10 },
    { header: '相差盒', key: 'diffPackQty', width: 10 },
    { header: '相差包', key: 'diffPieceQty', width: 10 },
    { header: '拿货单价箱', key: 'unitPriceBox', width: 12 },
    { header: '拿货单价盒', key: 'unitPricePack', width: 12 },
    { header: '拿货单价包', key: 'unitPricePiece', width: 12 },
    { header: '应付金额箱', key: 'amountBox', width: 12 },
    { header: '应付金额盒', key: 'amountPack', width: 12 },
    { header: '应付金额包', key: 'amountPiece', width: 12 },
    { header: '应付总金额', key: 'totalAmount', width: 12 },
    { header: '实付金额', key: 'actualAmount', width: 12 },
    { header: '未支付金额', key: 'unpaidAmount', width: 12 },
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

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式 - 动态计算字段
      const exportData = dataList.map((item: any) => {
        const retailPrice = item.retailPrice || 0;
        const unitPriceBox = item.unitPriceBox || 0;
        const unitPricePack = item.unitPricePack || 0;
        const unitPricePiece = item.unitPricePiece || 0;
        const purchaseBoxQty = item.purchaseBoxQty || 0;
        const purchasePackQty = item.purchasePackQty || 0;
        const purchasePieceQty = item.purchasePieceQty || 0;
        const totalAmount = item.totalAmount || 0;
        const actualAmount = item.actualAmount || 0;
        
        // 动态计算折扣
        const discount = retailPrice > 0 ? (unitPriceBox / retailPrice * 100) : 0;
        
        // 动态计算应付金额
        const amountBox = purchaseBoxQty * unitPriceBox;
        const amountPack = purchasePackQty * unitPricePack;
        const amountPiece = purchasePieceQty * unitPricePiece;
        
        // 动态计算未支付金额
        const unpaidAmount = totalAmount - actualAmount;
        
        return {
          id: item.id,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('zh-CN') : '',
          orderNo: item.orderNo,
          purchaseName: `${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('zh-CN').replace(/\//g, '-') : ''}${item.goodsName || ''}`,
          goodsName: item.goodsName || '',
          retailPrice,
          discount: (Math.floor(discount * 100) / 100).toFixed(2),
          supplierName: item.supplierName,
          purchaseBoxQty,
          purchasePackQty,
          purchasePieceQty,
          arrivedBoxQty: item.arrivedBoxQty || 0,
          arrivedPackQty: item.arrivedPackQty || 0,
          arrivedPieceQty: item.arrivedPieceQty || 0,
          diffBoxQty: purchaseBoxQty - (item.arrivedBoxQty || 0),
          diffPackQty: purchasePackQty - (item.arrivedPackQty || 0),
          diffPieceQty: purchasePieceQty - (item.arrivedPieceQty || 0),
          unitPriceBox,
          unitPricePack,
          unitPricePiece,
          amountBox,
          amountPack,
          amountPiece,
          totalAmount,
          actualAmount,
          unpaidAmount,
          createdAt: formatDateTime(item.createdAt),
        };
      });

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

      // Excel日期序列号转换为日期字符串
      // Excel日期从1900-01-01开始计数，但有1900年闰年bug，需要减去2天
      const excelDateToString = (value: any): string => {
        if (!value) return '';
        const strValue = String(value).trim();
        // 如果已经是日期格式字符串（包含-或/），直接返回
        if (strValue.includes('-') || strValue.includes('/')) {
          return strValue;
        }
        // 如果是数字（Excel日期序列号），转换为日期
        const num = parseFloat(strValue);
        if (!isNaN(num) && num > 0) {
          // Excel日期序列号转换：从1900-01-01开始，但Excel有个bug认为1900年是闰年
          const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
          const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return strValue;
      };

      // 转换数据格式 - 只导入必要字段，跳过动态计算字段
      // 需要导入：采购日期、采购编号、商品名称、供应商、采购箱/盒/包、拿货单价箱、实付金额
      // 跳过：ID、采购名称、零售价、折扣、到货数量、相差数量、拿货单价盒/包、应付金额、应付总金额、未支付金额、创建时间
      const importData = jsonData.map((row: any) => ({
        orderNo: String(row['采购编号'] || '').trim(),  // 用于判断更新还是新增
        purchaseDate: excelDateToString(row['采购日期']),
        goodsName: String(row['商品名称'] || '').trim(),
        supplierName: String(row['供应商'] || '').trim(),
        purchaseBoxQty: parseInt(row['采购箱'] || '0') || 0,
        purchasePackQty: parseInt(row['采购盒'] || '0') || 0,
        purchasePieceQty: parseInt(row['采购包'] || '0') || 0,
        unitPriceBox: parseFloat(row['拿货单价箱'] || '0') || 0,
        actualAmount: parseFloat(row['实付金额'] || '0') || 0,
      }));

      // 数据验证 - 只验证必要字段
      const errors = validateImportData(importData, [
        { field: 'purchaseDate', required: true, message: '采购日期不能为空' },
        { field: 'supplierName', required: true, message: '供应商不能为空' },
        { field: 'goodsName', required: true, message: '商品名称不能为空' },
        { field: 'unitPriceBox', required: true, type: 'number', min: 0, message: '拿货单价箱必须大于等于0' },
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
      let skipCount = 0;

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        const excelRowNum = i + 2; // Excel行号（第1行是表头）
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        try {
          // 构造后端API期望的数据格式
          const requestData = {
            orderNo: item.orderNo || undefined,  // 如果有采购编号则用于更新
            supplierName: item.supplierName,
            purchaseDate: item.purchaseDate,
            actualAmount: item.actualAmount,
            items: [
              {
                goodsName: item.goodsName,  // 通过商品名称关联
                boxQuantity: item.purchaseBoxQty,
                packQuantity: item.purchasePackQty,
                pieceQuantity: item.purchasePieceQty,
                unitPrice: item.unitPriceBox,
              }
            ]
          };

          const result = await request(`/api/v1/bases/${baseId}/purchase-orders/import`, {
            method: 'POST',
            data: requestData,
          });

          if (result.success) {
            successCount++;
          } else {
            // 遇到失败立即停止
            message.destroy();
            const errorContent = [
              `成功导入：${successCount} 条`,
              `跳过：${skipCount} 条`,
              `失败位置：第 ${excelRowNum} 行（Excel中）`,
              `商品名称：${item.goodsName}`,
              `失败原因：${result.message || '创建失败'}`,
            ].join('\n');
            Modal.error({
              title: '导入失败',
              content: errorContent,
              width: 500,
            });
            setImportModalVisible(false);
            setImportProgress(0);
            if (successCount > 0) {
              onImportSuccess?.();
            }
            return;
          }
        } catch (error: any) {
          // 遇到错误立即停止
          message.destroy();
          const errorContent = [
            `成功导入：${successCount} 条`,
            `跳过：${skipCount} 条`,
            `失败位置：第 ${excelRowNum} 行（Excel中）`,
            `商品名称：${item.goodsName}`,
            `失败原因：${error.message || '网络错误'}`,
          ].join('\n');
          Modal.error({
            title: '导入失败',
            content: errorContent,
            width: 500,
          });
          setImportModalVisible(false);
          setImportProgress(0);
          if (successCount > 0) {
            onImportSuccess?.();
          }
          return;
        }
      }

      message.destroy();

      // 全部成功
      message.success(`导入完成！成功导入 ${successCount} 条采购记录`);

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

  // 导入模板列配置（只包含需要导入的字段）
  const importTemplateColumns = [
    { header: '采购日期', key: 'purchaseDate', width: 12 },
    { header: '采购编号', key: 'orderNo', width: 20 },
    { header: '商品名称', key: 'goodsName', width: 35 },
    { header: '供应商', key: 'supplierName', width: 15 },
    { header: '采购箱', key: 'purchaseBoxQty', width: 10 },
    { header: '采购盒', key: 'purchasePackQty', width: 10 },
    { header: '采购包', key: 'purchasePieceQty', width: 10 },
    { header: '拿货单价箱', key: 'unitPriceBox', width: 12 },
    { header: '实付金额', key: 'actualAmount', width: 12 },
  ];

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        purchaseDate: '2025-11-17',
        orderNo: '（留空则自动生成）',
        goodsName: '名侦探柯南挂件-星绽版-第1弹',
        supplierName: '咸鱼',
        purchaseBoxQty: 0,
        purchasePackQty: 17,
        purchasePieceQty: 0,
        unitPriceBox: 9697.5,
        actualAmount: 4995,
      },
      {
        purchaseDate: '2025-11-17',
        orderNo: '',
        goodsName: '卡游柯南揭秘包1元包',
        supplierName: '江西小精灵',
        purchaseBoxQty: 1,
        purchasePackQty: 0,
        purchasePieceQty: 0,
        unitPriceBox: 10023.21,
        actualAmount: 10023.21,
      },
    ];

    downloadTemplate(templateData, importTemplateColumns, '采购导入模板', '采购导入模板');
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
