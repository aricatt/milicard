/**
 * 字段权限调试工具
 * 仅在开发环境下使用，用于在控制台显示API响应中的字段权限信息
 */

interface FieldPermissionDebugInfo {
  readable: string[];
  writable: string[];
  resource?: string;
  relatedResources?: string[];
  message: string;
}

/**
 * 在控制台打印字段权限调试信息
 */
export function logFieldPermissions(response: any, apiPath: string) {
  // 仅在开发环境下启用
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const debugInfo: FieldPermissionDebugInfo | undefined = response?._debug_fieldPermissions;
  
  if (!debugInfo) {
    return;
  }

  console.group(`🔐 字段权限调试 - ${apiPath}`);
  console.log('📋 资源:', debugInfo.resource || '未知');
  
  if (debugInfo.relatedResources && debugInfo.relatedResources.length > 0) {
    console.log('🔗 关联资源:', debugInfo.relatedResources.join(', '));
  }
  
  console.log('✅ 可读字段 (' + debugInfo.readable.length + '):', debugInfo.readable);
  console.log('✏️  可写字段 (' + debugInfo.writable.length + '):', debugInfo.writable);
  
  // 如果有数据，显示实际返回的字段
  if (response.data && Array.isArray(response.data) && response.data.length > 0) {
    const actualFields = Object.keys(response.data[0]);
    console.log('📦 实际返回字段 (' + actualFields.length + '):', actualFields);
    
    // 检查是否有字段被过滤掉
    const filteredFields = actualFields.filter(f => !debugInfo.readable.includes(f) && f !== 'id');
    if (filteredFields.length > 0) {
      console.warn('⚠️  这些字段不在可读列表中但仍然返回了:', filteredFields);
    }
  }
  
  console.log('💡', debugInfo.message);
  console.groupEnd();
}

/**
 * 创建一个包装函数，自动打印字段权限调试信息
 */
export function createDebugRequest(originalRequest: typeof import('@umijs/max').request) {
  return async function debugRequest(url: string, options?: any) {
    const response = await originalRequest(url, options);
    
    // 打印调试信息
    logFieldPermissions(response, url);
    
    return response;
  };
}
