/**
 * 基地数据类型定义
 */
export interface BaseItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  // 货币代码：CNY(人民币), VND(越南盾), THB(泰铢), USD(美元)
  currency: string;
  // 语言代码：zh-CN(简体中文), zh-TW(繁体中文), vi(越南语), th(泰语), en(英语)
  language: string;
  isActive: boolean;
  createdAt: string; // ISO 8601 format, e.g., "2025-10-24T16:12:10Z"
  updatedAt: string;
}

/**
 * 基地查询参数
 */
export interface BaseQueryParams {
  current?: number;
  pageSize?: number;
  name?: string;
  code?: string;
}

/**
 * 基地列表响应
 */
export interface BaseListResponse {
  data: BaseItem[];
  total: number;
  success: boolean;
}

/**
 * 添加基地请求参数
 */
export interface AddBaseRequest {
  code?: string; // 可选，留空时自动生成
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  currency?: string;
  language?: string;
}

/**
 * 更新基地请求参数
 */
export interface UpdateBaseRequest {
  code?: string;
  name?: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  currency?: string;
  language?: string;
}
