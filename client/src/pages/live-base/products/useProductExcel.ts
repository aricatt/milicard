/**
 * 商品Excel导入导出Hook
 * 封装商品相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

// 商品品类枚举
enum GoodsCategory {
  CARD = 'CARD',             // 卡牌
  CARD_BRICK = 'CARD_BRICK', // 卡砖
  GIFT = 'GIFT',             // 礼物
  COLOR_PAPER = 'COLOR_PAPER', // 色纸
  FORTUNE_SIGN = 'FORTUNE_SIGN', // 上上签
  TEAR_CARD = 'TEAR_CARD',   // 撕撕乐
  TOY = 'TOY',               // 玩具
  STAMP = 'STAMP',           // 邮票
  LUCKY_CAT = 'LUCKY_CAT'    // 招财猫
}

// 品类中文映射
const GoodsCategoryLabels: Record<GoodsCategory, string> = {
  [GoodsCategory.CARD]: '卡牌',
  [GoodsCategory.CARD_BRICK]: '卡砖',
  [GoodsCategory.GIFT]: '礼物',
  [GoodsCategory.COLOR_PAPER]: '色纸',
  [GoodsCategory.FORTUNE_SIGN]: '上上签',
  [GoodsCategory.TEAR_CARD]: '撕撕乐',
  [GoodsCategory.TOY]: '玩具',
  [GoodsCategory.STAMP]: '邮票',
  [GoodsCategory.LUCKY_CAT]: '招财猫'
};

// 品类反向映射（中文 -> 枚举值）
const GoodsCategoryReverse: Record<string, GoodsCategory> = {
  '卡牌': GoodsCategory.CARD,
  '卡砖': GoodsCategory.CARD_BRICK,
  '礼物': GoodsCategory.GIFT,
  '色纸': GoodsCategory.COLOR_PAPER,
  '上上签': GoodsCategory.FORTUNE_SIGN,
  '撕撕乐': GoodsCategory.TEAR_CARD,
  '玩具': GoodsCategory.TOY,
  '邮票': GoodsCategory.STAMP,
  '招财猫': GoodsCategory.LUCKY_CAT
};

interface Product {
  id: string;
  code: string;
  name: string;
  category: GoodsCategory;
  alias?: string;
  manufacturer: string;
  retailPrice: number;
  packPrice?: number;
  purchasePrice?: number;
  boxQuantity: number;
  packPerBox: number;
  piecePerPack: number;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

interface UseProductExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useProductExcel = ({ baseId, baseName, onImportSuccess }: UseProductExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置
  const excelColumns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '商品编号', key: 'code', width: 20 },
    { header: '品类', key: 'category', width: 10 },
    { header: '商品名称', key: 'name', width: 35 },
    { header: '商品别名', key: 'alias', width: 25 },
    { header: '厂家名称', key: 'manufacturer', width: 15 },
    { header: '零售价(一箱)', key: 'retailPrice', width: 12 },
    { header: '箱数量', key: 'boxQuantity', width: 8 },
    { header: '多少盒1箱', key: 'packPerBox', width: 12 },
    { header: '多少包1盒', key: 'piecePerPack', width: 12 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出商品数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/goods`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: Product) => ({
        id: item.id,
        code: item.code,
        category: GoodsCategoryLabels[item.category] || '卡牌',
        name: item.name,
        alias: item.alias || '',
        manufacturer: item.manufacturer,
        retailPrice: item.retailPrice,
        boxQuantity: item.boxQuantity || 1,
        packPerBox: item.packPerBox,
        piecePerPack: item.piecePerPack,
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '商品列表', `商品列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入商品数据
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
      const importData = jsonData.map((row: any) => {
        const categoryStr = String(row['品类'] || '').trim();
        const category = GoodsCategoryReverse[categoryStr] || GoodsCategory.CARD;
        return {
          code: String(row['商品编号'] || '').trim() || undefined, // 保留源编号，空则自动生成
          name: String(row['商品名称'] || '').trim(),
          category,
          alias: String(row['商品别名'] || '').trim() || undefined,
          manufacturer: String(row['厂家名称'] || '').trim(),
          retailPrice: parseFloat(row['零售价(一箱)'] || '0'),
          packPerBox: parseInt(row['多少盒1箱'] || '0'),
          piecePerPack: parseInt(row['多少包1盒'] || '0'),
          boxQuantity: 1,
        };
      });

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'name', required: true, message: '商品名称不能为空' },
        { field: 'manufacturer', required: true, message: '厂家名称不能为空' },
        { field: 'retailPrice', required: true, type: 'number', min: 0, message: '零售价必须大于0' },
        { field: 'packPerBox', required: true, type: 'number', min: 1, message: '盒/箱数量必须大于0' },
        { field: 'piecePerPack', required: true, type: 'number', min: 1, message: '包/盒数量必须大于0' },
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

      // 获取现有商品列表用于去重检查
      message.loading('正在检查重复数据...', 0);
      const existingGoods = await request(`/api/v1/bases/${baseId}/goods`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      message.destroy();

      // 构建去重Map: 商品名称和商品编号都需要检查（基地内唯一）
      const existingNameMap = new Map<string, string>();
      const existingCodeMap = new Map<string, string>();
      if (existingGoods.success && existingGoods.data) {
        existingGoods.data.forEach((goods: any) => {
          existingNameMap.set(goods.name, goods.id);
          if (goods.code) {
            existingCodeMap.set(goods.code, goods.id);
          }
        });
      }

      // 批量导入
      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;
      const failedItems: string[] = [];
      const skippedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        // 检查是否重复（商品名称或编号，基地内唯一）
        if (existingNameMap.has(item.name)) {
          skipCount++;
          skippedItems.push(`第${i + 2}行：${item.name}（名称已存在）`);
          continue;
        }
        if (item.code && existingCodeMap.has(item.code)) {
          skipCount++;
          skippedItems.push(`第${i + 2}行：${item.code}（编号已存在）`);
          continue;
        }

        try {
          const result = await request(`/api/v1/bases/${baseId}/goods`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
            // 添加到去重Map，避免同一批次内的重复
            existingNameMap.set(item.name, result.data?.id || '');
            if (item.code) {
              existingCodeMap.set(item.code, result.data?.id || '');
            }
          } else {
            failCount++;
            failedItems.push(`第${i + 2}行：${item.name} - ${result.message || '创建失败'}`);
          }
        } catch (error: any) {
          failCount++;
          failedItems.push(`第${i + 2}行：${item.name} - ${error.message || '网络错误'}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0 && skipCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条商品`);
      } else {
        let content = `成功导入：${successCount} 条\n跳过重复：${skipCount} 条\n失败：${failCount} 条`;
        
        // 显示跳过的数据
        if (skipCount > 0) {
          const skippedList = skippedItems.slice(0, 5).join('\n');
          const moreSkipped = skippedItems.length > 5 ? `\n...还有 ${skippedItems.length - 5} 条重复` : '';
          content += `\n\n跳过的重复数据：\n${skippedList}${moreSkipped}`;
        }
        
        // 显示失败的数据
        if (failCount > 0) {
          const failedList = failedItems.slice(0, 5).join('\n');
          const moreFailures = failedItems.length > 5 ? `\n...还有 ${failedItems.length - 5} 条失败` : '';
          content += `\n\n失败详情：\n${failedList}${moreFailures}`;
        }
        
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
        code: '（系统自动生成）',
        category: '卡牌',
        name: '琦趣创想航海王 和之国篇',
        alias: '',
        manufacturer: '琦趣创想',
        retailPrice: 22356,
        boxQuantity: 1,
        packPerBox: 36,
        piecePerPack: 10,
        createdAt: '（系统自动生成）',
      },
      {
        id: '',
        code: '',
        category: '玩具',
        name: '名侦探柯南挂件-星绽版-第1弹',
        alias: '',
        manufacturer: '卡游',
        retailPrice: 19440,
        boxQuantity: 1,
        packPerBox: 36,
        piecePerPack: 12,
        createdAt: '',
      },
      {
        id: '',
        code: '',
        category: '卡砖',
        name: '灵魂重生收藏卡',
        alias: '',
        manufacturer: '万画云游',
        retailPrice: 24300,
        boxQuantity: 1,
        packPerBox: 24,
        piecePerPack: 15,
        createdAt: '',
      },
    ];

    downloadTemplate(templateData, excelColumns, '商品导入模板', '商品导入模板');
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
