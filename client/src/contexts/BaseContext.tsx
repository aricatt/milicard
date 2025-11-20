import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';

// 基地信息接口
export interface BaseInfo {
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 基地上下文接口
interface BaseContextType {
  currentBase: BaseInfo | null;
  baseList: BaseInfo[];
  loading: boolean;
  setCurrentBase: (base: BaseInfo | null) => void;
  refreshBaseList: () => Promise<void>;
  clearBaseContext: () => void;
}

// 创建上下文
const BaseContext = createContext<BaseContextType | undefined>(undefined);

// 本地存储键名
const STORAGE_KEY = 'milicard_current_base';

// 基地上下文提供者组件
export const BaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBase, setCurrentBaseState] = useState<BaseInfo | null>(null);
  const [baseList, setBaseList] = useState<BaseInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 从本地存储恢复基地信息
  useEffect(() => {
    const savedBase = localStorage.getItem(STORAGE_KEY);
    if (savedBase) {
      try {
        const base = JSON.parse(savedBase);
        setCurrentBaseState(base);
      } catch (error) {
        console.error('恢复基地信息失败:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // 设置当前基地
  const setCurrentBase = (base: BaseInfo | null) => {
    setCurrentBaseState(base);
    if (base) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 获取基地列表
  const refreshBaseList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/live-base/bases', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setBaseList(result.data || []);
      } else {
        throw new Error(result.message || '获取基地列表失败');
      }
    } catch (error) {
      console.error('获取基地列表失败:', error);
      message.error('获取基地列表失败，请稍后重试');
      setBaseList([]);
    } finally {
      setLoading(false);
    }
  };

  // 清除基地上下文
  const clearBaseContext = () => {
    setCurrentBase(null);
    setBaseList([]);
  };

  // 初始化时获取基地列表
  useEffect(() => {
    refreshBaseList();
  }, []);

  const value: BaseContextType = {
    currentBase,
    baseList,
    loading,
    setCurrentBase,
    refreshBaseList,
    clearBaseContext,
  };

  return <BaseContext.Provider value={value}>{children}</BaseContext.Provider>;
};

// 使用基地上下文的Hook
export const useBase = (): BaseContextType => {
  const context = useContext(BaseContext);
  if (context === undefined) {
    throw new Error('useBase must be used within a BaseProvider');
  }
  return context;
};

// 检查是否有基地上下文的Hook
export const useRequireBase = (): BaseInfo => {
  const { currentBase } = useBase();
  if (!currentBase) {
    throw new Error('当前没有选择基地，请先选择一个基地');
  }
  return currentBase;
};
