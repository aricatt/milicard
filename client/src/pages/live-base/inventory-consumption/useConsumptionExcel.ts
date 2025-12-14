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
  categoryName: string;
  goodsName: string;
  locationName: string;
  handlerName: string;
  // 期末数量（用户填写的剩余数量）
  closingBoxQty?: number;
  closingPackQty?: number;
  closingPieceQty?: number;
  notes?: string;
}

export const useConsumptionExcel = ({ baseId, baseName, onImportSuccess }: UseConsumptionExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  /**
   * 计算单价（盒/包）
   */
  const calcUnitPrice = (record: any) => {
    const boxPrice = record.unitPricePerBox || 0;
    const packPerBox = record.packPerBox || 1;
    const piecePerPack = record.piecePerPack || 1;
    const packPrice = boxPrice / packPerBox;
    const piecePrice = packPrice / piecePerPack;
    return { boxPrice, packPrice, piecePrice };
  };

  /**
   * 计算消耗金额
   */
  const calcConsumptionAmount = (record: any) => {
    const { boxPrice, packPrice, piecePrice } = calcUnitPrice(record);
    return (
      (record.boxQuantity || 0) * boxPrice +
      (record.packQuantity || 0) * packPrice +
      (record.pieceQuantity || 0) * piecePrice
    );
  };

  /**
   * 计算库存货值（期末）
   */
  const calcInventoryValue = (record: any) => {
    const { boxPrice, packPrice, piecePrice } = calcUnitPrice(record);
    return (
      (record.closingBoxQty || 0) * boxPrice +
      (record.closingPackQty || 0) * packPrice +
      (record.closingPieceQty || 0) * piecePrice
    );
  };

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
        '品类': record.categoryName || '',
        '商品': record.goodsName || '',
        '直播间': record.locationName || '',
        '主播': record.handlerName || '',
        '期初/箱': record.openingBoxQty || 0,
        '期初/盒': record.openingPackQty || 0,
        '期初/包': record.openingPieceQty || 0,
        '期末/箱': record.closingBoxQty || 0,
        '期末/盒': record.closingPackQty || 0,
        '期末/包': record.closingPieceQty || 0,
        '消耗/箱': record.boxQuantity || 0,
        '消耗/盒': record.packQuantity || 0,
        '消耗/包': record.pieceQuantity || 0,
        '单价/箱': (record.unitPricePerBox || 0).toFixed(2),
        '消耗金额': calcConsumptionAmount(record).toFixed(2),
        '库存货值': calcInventoryValue(record).toFixed(2),
        '备注': record.notes || '',
      }));

      // 如果没有数据，创建只有列头的空表
      const headers = [
        '消耗日期', '品类', '商品', '直播间', '主播', 
        '期初/箱', '期初/盒', '期初/包',
        '期末/箱', '期末/盒', '期末/包',
        '消耗/箱', '消耗/盒', '消耗/包',
        '单价/箱', '消耗金额', '库存货值', '备注'
      ];
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
   * 导入字段与"添加消耗记录"表单规则一致：
   * - 消耗日期、商品、直播间、主播：必填
   * - 期末/箱、期末/盒、期末/包：用户填写的剩余数量
   * - 期初、消耗、单价、金额等字段由系统动态计算
   */
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        '消耗日期': '2025-01-01',
        '品类': '卡牌',
        '商品': '商品名称（必须与系统中商品名称一致）',
        '直播间': '直播间名称（必须与系统中直播间名称一致）',
        '主播': '主播姓名（必须与系统中主播姓名一致）',
        '期末/箱': 0,
        '期末/盒': 0,
        '期末/包': 0,
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
        categoryName: row['品类'] || '',
        goodsName: row['商品'] || row['商品名称'] || '',
        locationName: row['直播间'] || row['位置'] || '',
        handlerName: row['主播'] || row['经手人'] || '',
        // 期末数量（用户填写的剩余数量）
        closingBoxQty: parseInt(row['期末/箱'] || row['剩余/箱'] || row['剩余箱'] || '0') || 0,
        closingPackQty: parseInt(row['期末/盒'] || row['剩余/盒'] || row['剩余盒'] || '0') || 0,
        closingPieceQty: parseInt(row['期末/包'] || row['剩余/包'] || row['剩余包'] || '0') || 0,
        notes: row['备注'] || '',
      }));

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setImportProgress(Math.round(((i + 1) / records.length) * 100));

        // 验证必填字段
        if (!record.consumptionDate || !record.categoryName || !record.goodsName || !record.locationName || !record.handlerName) {
          failCount++;
          errors.push(`第${i + 2}行: 缺少必填字段（消耗日期、品类、商品、直播间、主播）`);
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
    handleDownloadTemplate,
  };
};
