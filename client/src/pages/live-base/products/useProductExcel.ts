/**
 * 基地商品Excel导入导出Hook
 * 
 * 重要说明：
 * 商品数据已分离为两部分：
 * 1. 全局商品（Goods）：商品编码、名称、品类、厂商、拆分关系等 - 在"所有商品"页管理
 * 2. 基地级设置（GoodsLocalSetting）：价格、别名等 - 在本页管理
 * 
 * 本页导入功能：
 * - 商品匹配规则（按优先级）：
 *   1. 如果提供了商品编号，优先按编号精确匹配
 *   2. 如果没有编号或编号匹配失败，按「品类 + 商品名称」组合匹配
 * - 只更新/创建基地级设置（价格、别名）
 * - 如果全局商品不存在，提示用户先在"所有商品"页添加
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  categoryName?: string;
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
  isActive: boolean;
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

  // Excel列配置（导出用，包含所有字段）
  const exportColumns = [
    { header: '商品编号', key: 'code', width: 20 },
    { header: '品类', key: 'categoryName', width: 12 },
    { header: '商品名称', key: 'name', width: 35 },
    { header: '厂家名称', key: 'manufacturer', width: 15 },
    { header: '商品别名', key: 'alias', width: 25 },
    { header: '零售价(一箱)', key: 'retailPrice', width: 14 },
    { header: '采购价(一箱)', key: 'purchasePrice', width: 14 },
    { header: '多少盒1箱', key: 'packPerBox', width: 12 },
    { header: '多少包1盒', key: 'piecePerPack', width: 12 },
    { header: '状态', key: 'status', width: 8 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导入模板列配置（只包含导入需要的字段）
  const importColumns = [
    { header: '商品编号', key: 'code', width: 20 },
    { header: '品类', key: 'categoryName', width: 12 },
    { header: '商品名称', key: 'name', width: 35 },
    { header: '商品别名', key: 'alias', width: 25 },
    { header: '零售价(一箱)', key: 'retailPrice', width: 14 },
    { header: '采购价(一箱)', key: 'purchasePrice', width: 14 },
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

      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: Product) => ({
        code: item.code,
        name: item.name,
        categoryName: item.categoryName || item.category || '',
        manufacturer: item.manufacturer,
        alias: item.alias || '',
        retailPrice: item.retailPrice,
        purchasePrice: item.purchasePrice || '',
        packPerBox: item.packPerBox,
        piecePerPack: item.piecePerPack,
        status: item.isActive ? '启用' : '禁用',
        createdAt: formatDateTime(item.createdAt),
      }));

      const exportResult = exportToExcel(exportData, exportColumns, '基地商品列表', `商品列表_${baseName}`);
      if (exportResult.success) {
        message.success(`成功导出 ${exportData.length} 条商品数据`);
      } else {
        message.error(exportResult.error || '导出失败');
      }
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

      // 获取全局商品列表用于匹配
      const globalGoodsResult = await request('/api/v1/global-goods', {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      const globalGoods: any[] = globalGoodsResult.success && globalGoodsResult.data ? globalGoodsResult.data : [];
      // 按编号索引
      const globalGoodsCodeMap = new Map<string, any>(globalGoods.map((g) => [g.code, g]));
      // 按「品类+名称」组合索引
      const globalGoodsCategoryNameMap = new Map<string, any>(globalGoods.map((g) => {
        const categoryName = g.categoryName || g.category?.name || '';
        const key = `${categoryName}|${g.name}`;
        return [key, g];
      }));

      // 获取当前基地已有的商品
      const existingGoodsResult = await request(`/api/v1/bases/${baseId}/goods`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      const existingGoods = existingGoodsResult.success && existingGoodsResult.data ? existingGoodsResult.data : [];
      const existingGoodsIdSet = new Set(existingGoods.map((g: any) => g.id));

      // 检查是否有不存在的全局商品
      const missingGoods: string[] = [];
      const importData: any[] = [];

      jsonData.forEach((row: any, index: number) => {
        const code = String(row['商品编号'] || '').trim();
        const categoryName = String(row['品类'] || '').trim();
        const name = String(row['商品名称'] || '').trim();
        
        // 匹配规则：
        // 1. 如果有商品编号，优先按编号精确匹配
        // 2. 如果没有编号或编号匹配失败，按「品类 + 商品名称」组合匹配
        let globalProduct = code ? globalGoodsCodeMap.get(code) : null;
        if (!globalProduct && categoryName && name) {
          const categoryNameKey = `${categoryName}|${name}`;
          globalProduct = globalGoodsCategoryNameMap.get(categoryNameKey);
        }

        if (!globalProduct) {
          const identifier = code || (categoryName && name ? `[${categoryName}]${name}` : name || '(空)');
          missingGoods.push(`第${index + 2}行：${identifier}`);
        } else {
          importData.push({
            globalGoodsId: globalProduct.id,
            globalGoodsCode: globalProduct.code,
            globalGoodsName: globalProduct.name,
            alias: String(row['商品别名'] || '').trim() || undefined,
            retailPrice: parseFloat(row['零售价(一箱)'] || '0'),
            purchasePrice: parseFloat(row['采购价(一箱)'] || '0') || undefined,
            isNew: !existingGoodsIdSet.has(globalProduct.id),
          });
        }
      });

      if (missingGoods.length > 0) {
        message.destroy();
        const missingList = missingGoods.slice(0, 10).join('\n');
        const moreCount = missingGoods.length > 10 ? `\n...还有 ${missingGoods.length - 10} 条` : '';
        Modal.error({
          title: '发现不存在的商品',
          content: `以下商品在全局商品库中不存在，请先到「全局信息 > 所有商品」页面添加后再导入：\n\n${missingList}${moreCount}`,
          width: 600,
        });
        setImportLoading(false);
        return;
      }

      // 数据验证
      const errors = validateImportData(importData, [
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

      message.destroy();

      // 批量导入
      let successCount = 0;
      let updateCount = 0;
      let failCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        try {
          if (item.isNew) {
            // 新增：关联全局商品到当前基地
            const result = await request(`/api/v1/bases/${baseId}/goods`, {
              method: 'POST',
              data: {
                globalGoodsId: item.globalGoodsId,
                alias: item.alias,
                retailPrice: item.retailPrice,
                purchasePrice: item.purchasePrice,
              },
            });

            if (result.success) {
              successCount++;
            } else {
              failCount++;
              failedItems.push(`${item.globalGoodsName} - ${result.message || '创建失败'}`);
            }
          } else {
            // 更新：更新基地级设置
            const result = await request(`/api/v1/bases/${baseId}/goods/${item.globalGoodsId}`, {
              method: 'PUT',
              data: {
                alias: item.alias,
                retailPrice: item.retailPrice,
                purchasePrice: item.purchasePrice,
              },
            });

            if (result.success) {
              updateCount++;
            } else {
              failCount++;
              failedItems.push(`${item.globalGoodsName} - ${result.message || '更新失败'}`);
            }
          }
        } catch (error: any) {
          failCount++;
          failedItems.push(`${item.globalGoodsName} - ${error.message || '网络错误'}`);
        }
      }

      // 显示导入结果
      if (failCount === 0) {
        message.success(`导入完成！新增 ${successCount} 条，更新 ${updateCount} 条`);
      } else {
        let content = `新增：${successCount} 条\n更新：${updateCount} 条\n失败：${failCount} 条`;
        
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
        code: 'GOODS-J37SVPYQEXJ',
        categoryName: '卡牌',
        name: '琦趣创想航海王 和之国篇',
        alias: '航海王和之国',
        retailPrice: 22356,
        purchasePrice: 18000,
      },
      {
        code: '',
        categoryName: '礼物',
        name: '名侦探柯南挂件-星绽版-第1弹',
        alias: '',
        retailPrice: 19440,
        purchasePrice: 15000,
      },
    ];

    // 添加导入说明
    const instructions = [
      '【导入说明】',
      '1. 商品匹配规则（按优先级）：',
      '   - 如果填写了「商品编号」，优先按编号精确匹配全局商品',
      '   - 如果没有编号或编号匹配失败，按「品类 + 商品名称」组合匹配',
      '2. 必填字段：「品类」和「商品名称」至少需要填写（除非有商品编号）',
      '3. 商品必须先在「全局信息 > 所有商品」页面添加后才能导入',
      '4. 本导入只更新基地级设置（零售价、采购价、别名），不会修改全局商品信息',
    ];

    const result = downloadTemplate(
      templateData, 
      importColumns, 
      '基地商品导入模板', 
      `商品导入模板_${baseName}`,
      instructions
    );
    if (result.success) {
      message.success('模板下载成功');
    } else {
      message.error(result.error || '模板下载失败');
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
