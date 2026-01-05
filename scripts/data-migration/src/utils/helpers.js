/**
 * 数据清洗和转换工具函数
 */

/**
 * 清理字符串：去除首尾空白、换行符等
 */
function cleanString(str) {
  if (!str) return '';
  return String(str).trim().replace(/\n/g, '').replace(/\r/g, '');
}

/**
 * 解析日期：支持多种格式
 * 2025.10.15 → 2025-10-15
 * 2025/10/15 → 2025-10-15
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  const cleaned = cleanString(dateStr);
  
  // 格式：2025.10.15
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // 格式：2025/10/15
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // 已经是标准格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * 解析数字：处理各种数字格式
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  
  // 移除空格和逗号
  const cleaned = String(value).replace(/\s/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

/**
 * 解析整数
 */
function parseInt(value) {
  const num = parseNumber(value);
  return Math.floor(num);
}

/**
 * 生成随机编号
 */
function generateCode(prefix = 'CODE') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}${random}`.toUpperCase();
}

/**
 * 创建映射表：用于快速查找
 */
function createLookupMap(array, keyField) {
  const map = new Map();
  array.forEach(item => {
    const key = item[keyField];
    if (key) {
      map.set(key, item);
    }
  });
  return map;
}

/**
 * 批量处理数组
 */
async function batchProcess(array, batchSize, processor) {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    
    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
    } catch (error) {
      errors.push({
        batch: Math.floor(i / batchSize) + 1,
        error: error.message,
      });
    }
  }
  
  return { results, errors };
}

/**
 * 延迟执行
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 格式化时间
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * 验证必填字段
 */
function validateRequired(obj, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!obj[field] || obj[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing,
  };
}

/**
 * 安全的 JSON 解析
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
}

module.exports = {
  cleanString,
  parseDate,
  parseNumber,
  parseInt,
  generateCode,
  createLookupMap,
  batchProcess,
  delay,
  formatFileSize,
  formatDuration,
  validateRequired,
  safeJsonParse,
};
