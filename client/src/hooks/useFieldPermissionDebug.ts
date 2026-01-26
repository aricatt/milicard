/**
 * 字段权限调试Hook
 * 用于在开发环境下捕获和显示API响应中的字段权限调试信息
 */
import { useState, useCallback } from 'react';

interface FieldPermissionDebugInfo {
  readable: string[];
  writable: string[];
  resource?: string;
  relatedResources?: string[];
  message: string;
}

interface DebugState {
  debugInfo?: FieldPermissionDebugInfo;
  actualFields?: string[];
  apiPath?: string;
}

export function useFieldPermissionDebug() {
  const [debugState, setDebugState] = useState<DebugState>({});

  /**
   * 从API响应中提取调试信息
   */
  const captureDebugInfo = useCallback((response: any, apiPath: string) => {
    // 仅在开发环境下启用
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const debugInfo = response?._debug_fieldPermissions;
    
    if (!debugInfo) {
      return;
    }

    // 提取实际返回的字段
    let actualFields: string[] = [];
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      actualFields = Object.keys(response.data[0]);
    } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
      actualFields = Object.keys(response.data);
    }

    setDebugState({
      debugInfo,
      actualFields,
      apiPath,
    });

    // 同时在控制台打印
    console.group(`🔐 字段权限调试 - ${apiPath}`);
    console.log('📋 资源:', debugInfo.resource || '未知');
    
    if (debugInfo.relatedResources && debugInfo.relatedResources.length > 0) {
      console.log('🔗 关联资源:', debugInfo.relatedResources.join(', '));
    }
    
    console.log('✅ 可读字段:', debugInfo.readable);
    console.log('✏️  可写字段:', debugInfo.writable);
    
    if (actualFields.length > 0) {
      console.log('📦 实际返回字段:', actualFields);
      
      const shouldBeFiltered = actualFields.filter(
        f => !debugInfo.readable.includes(f) && !debugInfo.readable.includes('*') && f !== 'id'
      );
      
      if (shouldBeFiltered.length > 0) {
        console.warn('⚠️  这些字段不在可读列表中但仍然返回了:', shouldBeFiltered);
      }
    }
    
    console.log('💡', debugInfo.message);
    console.groupEnd();
  }, []);

  return {
    debugState,
    captureDebugInfo,
  };
}
