/**
 * Excel 导入导出工具函数
 * 提供通用的Excel数据处理功能
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { message } from 'antd';

/**
 * 导出数据到Excel
 * @param data 要导出的数据数组
 * @param columns 列配置数组 [{header: '列名', key: 'dataKey', width: 20}]
 * @param sheetName 工作表名称
 * @param fileName 文件名（不含扩展名）
 */
export const exportToExcel = (
  data: any[],
  columns: Array<{ header: string; key: string; width?: number }>,
  sheetName: string,
  fileName: string
) => {
  try {
    let ws: XLSX.WorkSheet;

    if (!data || data.length === 0) {
      // 没有数据时导出只有列头的空表（可作为导入模板使用）
      const headers = columns.map((col) => col.header);
      ws = XLSX.utils.aoa_to_sheet([headers]);
    } else {
      // 转换数据格式
      const exportData = data.map((item) => {
        const row: any = {};
        columns.forEach((col) => {
          row[col.header] = item[col.key] ?? '';
        });
        return row;
      });
      ws = XLSX.utils.json_to_sheet(exportData);
    }

    // 设置列宽
    if (columns.some((col) => col.width)) {
      ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 导出文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    const fullFileName = `${fileName}_${timestamp}.xlsx`;
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fullFileName);

    if (data && data.length > 0) {
      message.success(`成功导出 ${data.length} 条数据`);
    } else {
      message.success('已导出空表模板');
    }
    return true;
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请重试');
    return false;
  }
};

/**
 * 读取Excel文件
 * @param file 文件对象
 * @returns Promise<any[]> 解析后的数据数组
 */
export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Excel文件格式错误'));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * 生成Excel模板
 * @param templateData 模板数据数组
 * @param columns 列配置
 * @param sheetName 工作表名称
 * @param fileName 文件名
 */
export const downloadTemplate = (
  templateData: any[],
  columns: Array<{ header: string; key: string; width?: number }>,
  sheetName: string,
  fileName: string
) => {
  try {
    // 转换模板数据
    const exportData = templateData.map((item) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.header] = item[col.key] ?? '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    if (columns.some((col) => col.width)) {
      ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${fileName}.xlsx`);

    message.success('模板下载成功');
    return true;
  } catch (error) {
    console.error('模板下载失败:', error);
    message.error('模板下载失败');
    return false;
  }
};

/**
 * 验证导入数据
 * @param data 数据数组
 * @param rules 验证规则 [{field: 'name', required: true, message: '名称不能为空'}]
 * @returns 错误信息数组
 */
export const validateImportData = (
  data: any[],
  rules: Array<{
    field: string;
    required?: boolean;
    min?: number;
    max?: number;
    type?: 'string' | 'number';
    message: string;
  }>
): string[] => {
  const errors: string[] = [];

  data.forEach((item, index) => {
    const rowNum = index + 2; // Excel行号从2开始（第1行是标题）

    rules.forEach((rule) => {
      const value = item[rule.field];

      // 必填验证
      if (rule.required && (!value || String(value).trim() === '')) {
        errors.push(`第${rowNum}行：${rule.message}`);
        return;
      }

      // 类型验证
      if (value && rule.type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`第${rowNum}行：${rule.message}`);
          return;
        }
        if (rule.min !== undefined && num < rule.min) {
          errors.push(`第${rowNum}行：${rule.message}`);
          return;
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push(`第${rowNum}行：${rule.message}`);
          return;
        }
      }

      // 字符串长度验证
      if (value && rule.type === 'string') {
        const str = String(value);
        if (rule.min !== undefined && str.length < rule.min) {
          errors.push(`第${rowNum}行：${rule.message}`);
          return;
        }
        if (rule.max !== undefined && str.length > rule.max) {
          errors.push(`第${rowNum}行：${rule.message}`);
          return;
        }
      }
    });
  });

  return errors;
};

/**
 * 格式化日期时间
 * @param date 日期对象或字符串
 * @returns 格式化后的字符串 YYYY-MM-DD HH:mm:ss
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-');
  } catch (error) {
    return '';
  }
};
