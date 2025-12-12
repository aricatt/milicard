/**
 * 供应商Excel导入导出Hook
 * 封装供应商相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
  isActive: boolean | string | number;
  createdAt: string;
}

interface UseSupplierExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

export const useSupplierExcel = ({ baseId, baseName, onImportSuccess }: UseSupplierExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用）
  const excelColumns = [
    { header: '供应商编号', key: 'code', width: 20 },
    { header: '供应商名称', key: 'name', width: 25 },
    { header: '联系人', key: 'contactPerson', width: 15 },
    { header: '联系电话', key: 'phone', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
    { header: '地址', key: 'address', width: 40 },
    { header: '备注', key: 'notes', width: 30 },
    { header: '状态', key: 'isActive', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出供应商数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/suppliers`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      // 允许导出空表（可作为导入模板使用）
      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式（不导出ID）
      const exportData = dataList.map((item: Supplier) => ({
        code: item.code,
        name: item.name,
        contactPerson: item.contactPerson || '',
        phone: item.phone || '',
        email: item.email || '',
        address: item.address || '',
        notes: item.notes || '',
        isActive: item.isActive ? '启用' : '禁用',
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '供应商列表', `供应商列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入供应商数据
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
        const isActiveStr = String(row['状态'] || '').trim();
        // 状态为空时默认启用
        const isActive = isActiveStr === '' || isActiveStr === '启用' || isActiveStr === '1' || isActiveStr === 'true';
        return {
          code: String(row['供应商编号'] || '').trim() || undefined, // 保留源编号，空则自动生成
          name: String(row['供应商名称'] || '').trim(),
          contactPerson: String(row['联系人'] || '').trim() || undefined,
          phone: String(row['联系电话'] || '').trim() || undefined,
          email: String(row['邮箱'] || '').trim() || undefined,
          address: String(row['地址'] || '').trim() || undefined,
          notes: String(row['备注'] || '').trim() || undefined,
          isActive,
        };
      });

      // 数据验证（只有供应商名称是必填的）
      const errors = validateImportData(importData, [
        { field: 'name', required: true, message: '供应商名称不能为空' },
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

      // 获取现有供应商列表用于去重检查
      message.loading('正在检查重复数据...', 0);
      const existingSuppliers = await request(`/api/v1/bases/${baseId}/suppliers`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      message.destroy();

      // 构建去重Map: 供应商名称和编号都需要检查（基地内唯一）
      const existingNameMap = new Map<string, string>();
      const existingCodeMap = new Map<string, string>();
      if (existingSuppliers.success && existingSuppliers.data) {
        existingSuppliers.data.forEach((supplier: any) => {
          existingNameMap.set(supplier.name, supplier.id);
          if (supplier.code) {
            existingCodeMap.set(supplier.code, supplier.id);
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

        // 检查是否重复（供应商名称或编号，基地内唯一）
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
          const result = await request(`/api/v1/bases/${baseId}/suppliers`, {
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
        message.success(`导入完成！成功导入 ${successCount} 条供应商`);
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
    // 导入模板列配置（不含创建时间）
    const templateColumns = [
      { header: '供应商编号', key: 'code', width: 20 },
      { header: '供应商名称', key: 'name', width: 25 },
      { header: '联系人', key: 'contactPerson', width: 15 },
      { header: '联系电话', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '地址', key: 'address', width: 40 },
      { header: '备注', key: 'notes', width: 30 },
      { header: '状态', key: 'isActive', width: 10 },
    ];

    const templateData = [
      {
        code: '（可留空，系统自动生成）',
        name: '示例供应商A',
        contactPerson: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        address: '北京市朝阳区XX路XX号',
        notes: '优质供应商',
        isActive: '启用',
      },
      {
        code: '',
        name: '示例供应商B',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        isActive: '',
      },
      {
        code: '',
        name: '示例供应商C',
        contactPerson: '王五',
        phone: '13700137000',
        email: '',
        address: '广州市天河区XX路XX号',
        notes: '新合作供应商',
        isActive: '启用',
      },
    ];

    downloadTemplate(templateData, templateColumns, '供应商导入模板', '供应商导入模板');
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
