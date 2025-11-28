/**
 * 基地管理相关的类型定义
 */

/**
 * 基地基本信息
 */
export interface BaseItem {
  id: number;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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
}

/**
 * 创建基地请求参数
 */
export interface CreateBaseRequest {
  code?: string; // 可选，留空时自动生成
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  // 货币代码：CNY(人民币), VND(越南盾), THB(泰铢), USD(美元)
  currency?: string;
  // 语言代码：zh-CN(简体中文), zh-TW(繁体中文), vi(越南语), th(泰语), en(英语)
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

/**
 * 基地响应数据
 */
export interface BaseResponse {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  // 货币代码：CNY(人民币), VND(越南盾), THB(泰铢), USD(美元)
  currency: string;
  // 语言代码：zh-CN(简体中文), zh-TW(繁体中文), vi(越南语), th(泰语), en(英语)
  language: string;
  isActive: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * 基地错误类型枚举
 */
export enum BaseErrorType {
  BASE_NOT_FOUND = 'BASE_NOT_FOUND',
  BASE_CODE_EXISTS = 'BASE_CODE_EXISTS',
  INVALID_BASE_CODE = 'INVALID_BASE_CODE',
  INVALID_BASE_NAME = 'INVALID_BASE_NAME',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  GOODS_NOT_FOUND = 'GOODS_NOT_FOUND',
  GOODS_CODE_EXISTS = 'GOODS_CODE_EXISTS',
  PURCHASE_ORDER_NOT_FOUND = 'PURCHASE_ORDER_NOT_FOUND'
}

/**
 * 基地错误类
 */
export class BaseError extends Error {
  public type: BaseErrorType;

  constructor(message: string, type: BaseErrorType) {
    super(message);
    this.name = 'BaseError';
    this.type = type;
  }
}
