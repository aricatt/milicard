/**
 * 人员Excel导入导出Hook
 * 封装人员相关的Excel操作逻辑
 */
import { useState } from 'react';
import { message, Modal } from 'antd';
import type { UploadProps } from 'antd';
import { request } from '@umijs/max';
import { exportToExcel, readExcelFile, downloadTemplate, validateImportData, formatDateTime } from '@/utils/excelUtils';

interface Personnel {
  id: string;
  code: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
  operatorId?: string;
  operatorName?: string;
  isActive: boolean | string | number;
  createdAt: string;
}

interface UsePersonnelExcelProps {
  baseId: number;
  baseName: string;
  onImportSuccess?: () => void;
}

// 角色映射
const ROLE_MAP: Record<string, string> = {
  'ANCHOR': '主播',
  'WAREHOUSE_KEEPER': '仓管',
  'OPERATOR': '运营',
};

const ROLE_REVERSE_MAP: Record<string, string> = {
  '主播': 'ANCHOR',
  '仓管': 'WAREHOUSE_KEEPER',
  '运营': 'OPERATOR',
};

export const usePersonnelExcel = ({ baseId, baseName, onImportSuccess }: UsePersonnelExcelProps) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Excel列配置（导出用）
  const excelColumns = [
    { header: '人员编号', key: 'code', width: 20 },
    { header: '姓名', key: 'name', width: 20 },
    { header: '角色', key: 'role', width: 15 },
    { header: '对应运营', key: 'operatorName', width: 20 },
    { header: '联系电话', key: 'phone', width: 15 },
    { header: '邮箱', key: 'email', width: 25 },
    { header: '备注', key: 'notes', width: 30 },
    { header: '状态', key: 'isActive', width: 10 },
    { header: '创建时间', key: 'createdAt', width: 20 },
  ];

  // 导出人员数据
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);

      const result = await request(`/api/v1/bases/${baseId}/personnel`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });

      message.destroy();

      const dataList = result.success && result.data ? result.data : [];

      // 转换数据格式
      const exportData = dataList.map((item: Personnel) => ({
        code: item.code,
        name: item.name,
        role: ROLE_MAP[item.role] || item.role,
        operatorName: item.operatorName || '',
        phone: item.phone || '',
        email: item.email || '',
        notes: item.notes || '',
        isActive: item.isActive ? '启用' : '禁用',
        createdAt: formatDateTime(item.createdAt),
      }));

      exportToExcel(exportData, excelColumns, '人员列表', `人员列表_${baseName}`);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 导入人员数据
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

      // 获取所有运营人员用于匹配
      const operatorsResult = await request(`/api/v1/bases/${baseId}/personnel`, {
        method: 'GET',
        params: { role: 'OPERATOR', page: 1, pageSize: 1000 },
      });
      
      const operatorsMap = new Map<string, string>();
      if (operatorsResult.success && operatorsResult.data) {
        operatorsResult.data.forEach((op: Personnel) => {
          operatorsMap.set(op.name, op.id);
        });
      }

      // 转换数据格式
      const importData = jsonData.map((row: any) => {
        const isActiveStr = String(row['状态'] || '').trim();
        const isActive = isActiveStr === '' || isActiveStr === '启用' || isActiveStr === '1' || isActiveStr === 'true';
        
        const roleStr = String(row['角色'] || '').trim();
        const role = ROLE_REVERSE_MAP[roleStr] || roleStr;
        
        const operatorName = String(row['对应运营'] || '').trim();
        const operatorId = operatorName ? operatorsMap.get(operatorName) : undefined;

        return {
          code: String(row['人员编号'] || '').trim() || undefined,
          name: String(row['姓名'] || '').trim(),
          role: role,
          operatorId: operatorId,
          phone: String(row['联系电话'] || '').trim() || undefined,
          email: String(row['邮箱'] || '').trim() || undefined,
          notes: String(row['备注'] || '').trim() || undefined,
          isActive,
        };
      });

      // 数据验证
      const errors = validateImportData(importData, [
        { field: 'name', required: true, message: '姓名不能为空' },
        { field: 'role', required: true, message: '角色不能为空' },
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

      // 获取现有人员列表用于去重检查
      message.loading('正在检查重复数据...', 0);
      const existingPersonnel = await request(`/api/v1/bases/${baseId}/personnel`, {
        method: 'GET',
        params: { page: 1, pageSize: 10000 },
      });
      message.destroy();

      // 构建去重Map
      const existingNameMap = new Map<string, string>();
      const existingCodeMap = new Map<string, string>();
      if (existingPersonnel.success && existingPersonnel.data) {
        existingPersonnel.data.forEach((person: any) => {
          existingNameMap.set(person.name, person.id);
          if (person.code) {
            existingCodeMap.set(person.code, person.id);
          }
        });
      }

      // 批量导入
      let createCount = 0;
      let updateCount = 0;
      let failCount = 0;
      let skipCount = 0;
      const failedItems: string[] = [];
      const skippedItems: string[] = [];
      const updatedItems: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(Math.round(((i + 1) / importData.length) * 100));

        // 检查是否通过编号匹配到已存在的人员（用于更新）
        const existingIdByCode = item.code ? existingCodeMap.get(item.code) : undefined;
        
        if (existingIdByCode) {
          // 编号已存在，执行更新操作
          try {
            const result = await request(`/api/v1/bases/${baseId}/personnel/${existingIdByCode}`, {
              method: 'PUT',
              data: item,
            });

            if (result.success) {
              updateCount++;
              updatedItems.push(`第${i + 2}行：${item.code} - ${item.name}`);
            } else {
              failCount++;
              failedItems.push(`第${i + 2}行：${item.name} - ${result.message || '更新失败'}`);
            }
          } catch (error: any) {
            failCount++;
            failedItems.push(`第${i + 2}行：${item.name} - ${error.message || '网络错误'}`);
          }
          continue;
        }

        // 检查名称是否重复（无编号的情况下）
        if (existingNameMap.has(item.name)) {
          skipCount++;
          skippedItems.push(`第${i + 2}行：${item.name}（名称已存在，无编号无法更新）`);
          continue;
        }

        // 新建人员
        try {
          const result = await request(`/api/v1/bases/${baseId}/personnel`, {
            method: 'POST',
            data: item,
          });

          if (result.success) {
            createCount++;
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
        if (updateCount > 0) {
          message.success(`导入完成！新建 ${createCount} 条，更新 ${updateCount} 条人员`);
        } else {
          message.success(`导入完成！成功导入 ${createCount} 条人员`);
        }
      } else {
        let content = `新建：${createCount} 条\n更新：${updateCount} 条\n跳过：${skipCount} 条\n失败：${failCount} 条`;
        
        if (updateCount > 0) {
          const updatedList = updatedItems.slice(0, 5).join('\n');
          const moreUpdated = updatedItems.length > 5 ? `\n...还有 ${updatedItems.length - 5} 条更新` : '';
          content += `\n\n更新的人员：\n${updatedList}${moreUpdated}`;
        }
        
        if (skipCount > 0) {
          const skippedList = skippedItems.slice(0, 5).join('\n');
          const moreSkipped = skippedItems.length > 5 ? `\n...还有 ${skippedItems.length - 5} 条跳过` : '';
          content += `\n\n跳过的数据：\n${skippedList}${moreSkipped}`;
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
    const templateColumns = [
      { header: '人员编号', key: 'code', width: 20 },
      { header: '姓名', key: 'name', width: 20 },
      { header: '角色', key: 'role', width: 15 },
      { header: '对应运营', key: 'operatorName', width: 20 },
      { header: '联系电话', key: 'phone', width: 15 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '备注', key: 'notes', width: 30 },
      { header: '状态', key: 'isActive', width: 10 },
    ];

    const templateData = [
      {
        code: 'ANCHOR-XXXXXXXXXXX',
        name: '张三',
        role: '主播',
        operatorName: '李四',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        notes: '优秀主播',
        isActive: '启用',
      },
      {
        code: '',
        name: '王五',
        role: '仓管',
        operatorName: '',
        phone: '13700137000',
        email: 'wangwu@example.com',
        notes: '负责仓库管理',
        isActive: '启用',
      },
      {
        code: '',
        name: '赵六',
        role: '运营',
        operatorName: '',
        phone: '13600136000',
        email: 'zhaoliu@example.com',
        notes: '负责主播管理',
        isActive: '',
      },
    ];

    downloadTemplate(templateData, templateColumns, '人员导入模板', '人员导入模板');
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
