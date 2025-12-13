/**
 * 全局商品Excel导入导出Hook
 * 用于管理全局商品的导入导出操作
 * 
 * 全局商品包含：商品编码、名称、品类、厂商、拆分关系等基础信息
 * 不包含：价格、别名等基地级设置（这些在基地商品页管理）
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface Category {
  id: number;
  code: string;
  name: string;
}

interface GlobalProduct {
  id: string;
  code: string;
  name: string;
  category?: string;
  categoryId?: number;
  categoryName?: string;
  manufacturer: string;
  description?: string;
  packPerBox: number;
  piecePerPack: number;
  imageUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface UseGlobalProductExcelProps {
  onImportSuccess?: () => void;
}

export const useGlobalProductExcel = ({ onImportSuccess }: UseGlobalProductExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  // Excel列配置（导出用，包含所有字段，不包含品类编码）
  const exportColumns = [
    { header: '商品编码', key: 'code', width: 20 },
    { header: '品类', key: 'categoryName', width: 12 },
    { header: '商品名称', key: 'name', width: 35 },
    { header: '厂家名称', key: 'manufacturer', width: 15 },
    { header: '多少盒1箱', key: 'packPerBox', width: 12 },
    { header: '多少包1盒', key: 'piecePerPack', width: 12 },
    { header: '描述', key: 'description', width: 30 },
    { header: '状态', key: 'status', width: 8 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导入模板列配置（只包含导入需要的字段，不包含品类编码）
  const importColumns = [
    { header: '商品编码', key: 'code', width: 20 },
    { header: '品类', key: 'categoryName', width: 12 },
    { header: '商品名称', key: 'name', width: 35 },
    { header: '厂家名称', key: 'manufacturer', width: 15 },
    { header: '多少盒1箱', key: 'packPerBox', width: 12 },
    { header: '多少包1盒', key: 'piecePerPack', width: 12 },
    { header: '描述', key: 'description', width: 30 },
  ];

  // 获取品类列表
  const fetchCategories = async (): Promise<Category[]> => {
    try {
      const result = await request('/api/v1/categories/all', { method: 'GET' });
      const cats = result || [];
      setCategories(cats);
      return cats;
    } catch (error) {
      console.error('获取品类列表失败:', error);
      return [];
    }
  };

  // 导出商品数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      // 获取品类列表
      const cats = await fetchCategories();
      const categoryMap = new Map(cats.map(c => [c.id, { code: c.code, name: c.name }]));

      const result = await request('/api/v1/global-goods', {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式（使用后端返回的品类关联信息）
      const exportData = dataList.map((item: any) => {
        return {
          code: item.code,
          categoryName: item.category?.name || '',
          name: item.name,
          manufacturer: item.manufacturer,
          packPerBox: item.packPerBox,
          piecePerPack: item.piecePerPack,
          description: item.description || '',
          status: item.isActive ? '启用' : '禁用',
          createdAt: formatDateTime(item.createdAt),
        };
      });

      const exportResult = exportToExcel(exportData, exportColumns, '全局商品列表', '全局商品列表');
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

      // 获取品类列表
      const cats = await fetchCategories();
      const categoryCodeMap = new Map(cats.map(c => [c.code, c.id]));
      const categoryNameMap = new Map(cats.map(c => [c.name, c.id]));

      // 检查是否有新品类
      const newCategories: string[] = [];
      jsonData.forEach((row: any) => {
        const categoryCode = String(row['品类编码'] || '').trim();
        const categoryName = String(row['品类名称'] || '').trim();
        if (categoryCode && !categoryCodeMap.has(categoryCode)) {
          if (!newCategories.includes(categoryCode)) {
            newCategories.push(categoryCode);
          }
        } else if (!categoryCode && categoryName && !categoryNameMap.has(categoryName)) {
          if (!newCategories.includes(categoryName)) {
            newCategories.push(categoryName);
          }
        }
      });

      if (newCategories.length > 0) {
        message.destroy();
        Modal.error({
          title: '发现新品类',
          content: `以下品类在系统中不存在，请先到「商品品类」页面添加后再导入：\n\n${newCategories.join('\n')}`,
          width: 500,
        });
        setImportLoading(false);
        return;
      }

      // 转换数据格式
      const importData = jsonData.map((row: any) => {
        const categoryCode = String(row['品类编码'] || '').trim();
        const categoryName = String(row['品类名称'] || '').trim();
        let categoryId = categoryCodeMap.get(categoryCode) || categoryNameMap.get(categoryName);
        
        return {
          code: String(row['商品编码'] || '').trim() || undefined,
          name: String(row['商品名称'] || '').trim(),
          categoryId,
          manufacturer: String(row['厂家名称'] || '').trim(),
          packPerBox: parseInt(row['多少盒1箱'] || '0'),
          piecePerPack: parseInt(row['多少包1盒'] || '0'),
          description: String(row['描述'] || '').trim() || undefined,
          boxQuantity: 1,
        };
      });

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'name', required: true, message: '商品名称不能为空' },
        { field: 'manufacturer', required: true, message: '厂家名称不能为空' },
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
      const existingGoods = await request('/api/v1/global-goods', {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      message.destroy();

      // 构建去重Map
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

        // 检查是否重复
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
          const result = await request('/api/v1/global-goods', {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            successCount++;
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
        
        if (skipCount > 0) {
          const skippedList = skippedItems.slice(0, 5).join('\n');
          const moreSkipped = skippedItems.length > 5 ? `\n...还有 ${skippedItems.length - 5} 条重复` : '';
          content += `\n\n跳过的重复数据：\n${skippedList}${moreSkipped}`;
        }
        
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
        code: '',
        categoryCode: 'CARD',
        categoryName: '卡牌',
        name: '琦趣创想航海王 和之国篇',
        manufacturer: '琦趣创想',
        packPerBox: 36,
        piecePerPack: 10,
        description: '',
      },
      {
        code: '',
        categoryCode: 'TOY',
        categoryName: '玩具',
        name: '名侦探柯南挂件-星绽版-第1弹',
        manufacturer: '卡游',
        packPerBox: 36,
        piecePerPack: 12,
        description: '',
      },
      {
        code: '',
        categoryCode: 'CARD_BRICK',
        categoryName: '卡砖',
        name: '灵魂重生收藏卡',
        manufacturer: '万画云游',
        packPerBox: 24,
        piecePerPack: 15,
        description: '',
      },
    ];

    const result = downloadTemplate(
      templateData, 
      importColumns, 
      '全局商品导入模板', 
      '全局商品导入模板'
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
