import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { request } from '@umijs/max';
import { getCurrencyConfig, getCurrencySymbol, formatCurrency, type CurrencyConfig } from '@/utils/currency';
import { getLanguageConfig, type LanguageConfig } from '@/utils/language';

// 基地类型枚举
export enum BaseType {
  LIVE_BASE = 'LIVE_BASE',           // 直播基地
  OFFLINE_REGION = 'OFFLINE_REGION'  // 线下区域
}

// 基地类型选项（用于前端下拉选择）
export const BASE_TYPE_OPTIONS = [
  { value: BaseType.LIVE_BASE, label: '直播基地' },
  { value: BaseType.OFFLINE_REGION, label: '线下区域' },
];

// 获取基地类型标签
export const getBaseTypeLabel = (type: BaseType | string): string => {
  const option = BASE_TYPE_OPTIONS.find(opt => opt.value === type);
  return option?.label || type;
};

// 基地信息接口
export interface BaseInfo {
  id: number;
  code: string;
  name: string;
  // 基地类型：LIVE_BASE(直播基地), OFFLINE_REGION(线下区域)
  type: BaseType;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  // 货币代码：CNY(人民币), VND(越南盾), THB(泰铢), USD(美元)
  currency: string;
  // 语言代码：zh-CN(简体中文), zh-TW(繁体中文), vi(越南语), th(泰语), en(英语)
  language: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 货币汇率信息
interface CurrencyRateInfo {
  currencyCode: string;
  currencyName: string | null;
  fixedRate: number;
  liveRate: number | null;
}

// 基地上下文接口
interface BaseContextType {
  currentBase: BaseInfo | null;
  baseList: BaseInfo[];
  loading: boolean;
  initialized: boolean; // 标识 Context 是否已完成初始化
  currencyRate: CurrencyRateInfo | null; // 当前基地的货币汇率
  setCurrentBase: (base: BaseInfo | null) => void;
  refreshBaseList: () => Promise<void>;
  refreshCurrencyRate: () => Promise<void>; // 刷新当前基地的货币汇率
  clearBaseContext: () => void;
}

// 创建上下文
export const BaseContext = createContext<BaseContextType | undefined>(undefined);

// 本地存储键名
const STORAGE_KEY = 'milicard_current_base';

// 基地上下文提供者组件
export const BaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBase, setCurrentBaseState] = useState<BaseInfo | null>(null);
  const [baseList, setBaseList] = useState<BaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currencyRate, setCurrencyRate] = useState<CurrencyRateInfo | null>(null);

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
    setInitialized(true);
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
      const result = await request('/api/v1/live-base/bases', {
        method: 'GET',
      });

      if (result.success) {
        const newBaseList = result.data || [];
        setBaseList(newBaseList);
        
        // 如果当前有选中的基地，从新列表中更新它的信息（确保货币等设置是最新的）
        if (currentBase) {
          const updatedBase = newBaseList.find((b: BaseInfo) => b.id === currentBase.id);
          if (updatedBase) {
            // 只有当数据有变化时才更新，避免不必要的重渲染
            if (JSON.stringify(updatedBase) !== JSON.stringify(currentBase)) {
              setCurrentBase(updatedBase);
            }
          }
        }
      } else {
        throw new Error(result.message || '获取基地列表失败');
      }
    } catch (error) {
      console.error('获取基地列表失败:', error);
      // 不在 Context 中显示 message，避免静态方法警告
      // 调用者可以根据 baseList 为空来处理错误状态
      setBaseList([]);
    } finally {
      setLoading(false);
    }
  };

  // 清除基地上下文
  const clearBaseContext = () => {
    setCurrentBase(null);
    setBaseList([]);
    setCurrencyRate(null);
  };

  // 获取当前基地货币的汇率
  const fetchCurrencyRate = async (currencyCode: string) => {
    if (!currencyCode || currencyCode === 'CNY') {
      // 人民币汇率固定为1
      setCurrencyRate({
        currencyCode: 'CNY',
        currencyName: '人民币',
        fixedRate: 1,
        liveRate: 1,
      });
      return;
    }
    try {
      const result = await request('/api/v1/currency-rates/with-live-rates', {
        method: 'GET',
      });
      if (result.success && result.data) {
        const rate = result.data.find((r: CurrencyRateInfo) => r.currencyCode === currencyCode);
        if (rate) {
          setCurrencyRate(rate);
        } else {
          // 未找到该货币的汇率配置
          setCurrencyRate(null);
        }
      }
    } catch (error) {
      console.error('获取货币汇率失败:', error);
      setCurrencyRate(null);
    }
  };

  // 当基地变化时，获取对应货币的汇率
  useEffect(() => {
    if (currentBase?.currency) {
      fetchCurrencyRate(currentBase.currency);
    } else {
      setCurrencyRate(null);
    }
  }, [currentBase?.currency]);

  // 初始化时获取基地列表
  useEffect(() => {
    refreshBaseList();
  }, []);

  // 刷新当前基地的货币汇率
  const refreshCurrencyRate = async () => {
    if (currentBase?.currency) {
      await fetchCurrencyRate(currentBase.currency);
    }
  };

  const value: BaseContextType = {
    currentBase,
    baseList,
    loading,
    initialized,
    currencyRate,
    setCurrentBase,
    refreshBaseList,
    refreshCurrencyRate,
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

// 可选的基地上下文Hook（如果不在Provider中返回null）
export const useBaseOptional = (): BaseContextType | null => {
  const context = useContext(BaseContext);
  return context || null;
};

// 检查是否有基地上下文的Hook（带初始化状态）
export const useRequireBase = (): { base: BaseInfo | null; initialized: boolean } => {
  const { currentBase, initialized } = useBase();
  return { base: currentBase, initialized };
};

// 获取当前基地货币配置的Hook
export const useBaseCurrency = () => {
  const { currentBase } = useBase();
  
  return useMemo(() => {
    const currencyCode = currentBase?.currency || 'CNY';
    const config = getCurrencyConfig(currencyCode);
    
    return {
      code: currencyCode,
      symbol: config.symbol,
      config,
      // 格式化金额的便捷方法
      format: (amount: number | string | undefined | null, showSymbol: boolean = true) => 
        formatCurrency(amount, currencyCode, showSymbol),
    };
  }, [currentBase?.currency]);
};

// 获取当前基地语言配置的Hook
export const useBaseLanguage = () => {
  const { currentBase } = useBase();
  
  return useMemo(() => {
    const languageCode = currentBase?.language || 'zh-CN';
    const config = getLanguageConfig(languageCode);
    
    return {
      code: languageCode,
      config,
      dateFormat: config.dateFormat,
      dateTimeFormat: config.dateTimeFormat,
    };
  }, [currentBase?.language]);
};
