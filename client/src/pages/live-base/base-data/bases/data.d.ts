/**
 * 基地数据类型定义
 */
export interface BaseItem {
  id: number;
  code: string;
  name: string;
  createdAt: string; // ISO 8601 format, e.g., "2025-10-24T16:12:10Z"
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
  code: string;
  name: string;
}

/**
 * 更新基地请求参数
 */
export interface UpdateBaseRequest {
  code?: string;
  name?: string;
}
