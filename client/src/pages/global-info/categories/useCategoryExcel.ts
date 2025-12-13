/**
 * 商品品类Excel导入导出Hook
 * 用于管理商品品类的导入导出操作
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
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCategoryExcelProps {
  onImportSuccess?: () => void;
}

export const useCategoryExcel = ({ onImportSuccess }: UseCategoryExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用）
  const exportColumns = [
    { header: '品类编码', key: 'code', width: 15 },
    { header: '品类名称', key: 'name', width: 20 },
    { header: '描述', key: 'description', width: 30 },
    { header: '排序', key: 'sortOrder', width: 10 },
    { header: '状态', key: 'status', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导入模板列配置
  const importColumns = [
    { header: '品类编码', key: 'code', width: 15 },
    { header: '品类名称', key: 'name', width: 20 },
    { header: '描述', key: 'description', width: 30 },
    { header: '排序', key: 'sortOrder', width: 10 },
  ];

  // 导出品类数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request('/api/v1/categories', {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      const dataList = result.data || [];

      // 转换数据格式
      const exportData = dataList.map((item: Category) => ({
        code: item.code,
        name: item.name,
        description: item.description || '',
        sortOrder: item.sortOrder,
        status: item.isActive ? '启用' : '禁用',
        createdAt: formatDateTime(item.createdAt),
      }));

      const exportResult = exportToExcel(exportData, exportColumns, '商品品类列表', '商品品类列表');
      if (exportResult.success) {
        message.success(`成功导出 ${exportData.length} 条品类数据`);
      } else {
        message.error(exportResult.error || '导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入品类数据
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
        code: String(row['品类编码'] || '').trim().toUpperCase(),
        name: String(row['品类名称'] || '').trim(),
        description: String(row['描述'] || '').trim() || undefined,
        sortOrder: parseInt(row['排序'] || '0') || 0,
        isActive: true,
      }));

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'code', required: true, message: '品类编码不能为空' },
        { field: 'name', required: true, message: '品类名称不能为空' },
      ]);

      // 验证编码格式
      importData.forEach((item, index) => {
        if (item.code && !/^[A-Z_]+$/.test(item.code)) {
          errors.push(`第${index + 2}行：品类编码只能包含大写字母和下划线`);
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

      // 获取现有品类列表用于去重检查
      message.loading('正在检查重复数据...', 0);
      const existingCategories = await request('/api/v1/categories/all', {
        method: 'GET',
      });
      message.destroy();

      // 构建去重Map
      const existingCodeMap = new Map<string, number>();
      const existingNameMap = new Map<string, number>();
      if (existingCategories) {
        existingCategories.forEach((cat: Category) => {
          existingCodeMap.set(cat.code, cat.id);
          existingNameMap.set(cat.name, cat.id);
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
        if (existingCodeMap.has(item.code)) {
          skipCount++;
          skippedItems.push(`第${i + 2}行：${item.code}（编码已存在）`);
          continue;
        }
        if (existingNameMap.has(item.name)) {
          skipCount++;
          skippedItems.push(`第${i + 2}行：${item.name}（名称已存在）`);
          continue;
        }

        try {
          const result = await request('/api/v1/categories', {
            method: 'POST',
            data: item,
          });

          if (result.id) {
            successCount++;
            existingCodeMap.set(item.code, result.id);
            existingNameMap.set(item.name, result.id);
          } else {
            failCount++;
            failedItems.push(`第${i + 2}行：${item.name} - 创建失败`);
          }
        } catch (error: any) {
          failCount++;
          failedItems.push(`第${i + 2}行：${item.name} - ${error?.response?.data?.error || error.message || '网络错误'}`);
        }
      }

      message.destroy();

      // 显示导入结果
      if (failCount === 0 && skipCount === 0) {
        message.success(`导入完成！成功导入 ${successCount} 条品类`);
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
        code: 'CARD',
        name: '卡牌',
        description: '各类卡牌商品',
        sortOrder: 1,
      },
      {
        code: 'TOY',
        name: '玩具',
        description: '玩具类商品',
        sortOrder: 2,
      },
      {
        code: 'GIFT',
        name: '礼品',
        description: '礼品类商品',
        sortOrder: 3,
      },
    ];

    const result = downloadTemplate(
      templateData, 
      importColumns, 
      '商品品类导入模板', 
      '商品品类导入模板'
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
