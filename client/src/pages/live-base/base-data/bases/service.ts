import { request } from '@umijs/max';
import type { 
  BaseItem, 
  BaseQueryParams, 
  BaseListResponse, 
  AddBaseRequest, 
  UpdateBaseRequest 
} from './data';

/**
 * 查询基地列表
 */
export async function queryBaseList(params: BaseQueryParams): Promise<BaseListResponse> {
  return request('/api/v1/live-base/bases', {
    method: 'GET',
    params,
  });
}

/**
 * 添加基地
 */
export async function addBase(params: AddBaseRequest): Promise<{ success: boolean }> {
  return request('/api/v1/live-base/bases', {
    method: 'POST',
    data: params,
  });
}

/**
 * 更新基地
 */
export async function updateBase(id: number, params: UpdateBaseRequest): Promise<{ success: boolean }> {
  return request(`/api/v1/live-base/bases/${id}`, {
    method: 'PUT',
    data: params,
  });
}

/**
 * 删除基地
 */
export async function removeBase(id: number): Promise<{ success: boolean }> {
  return request(`/api/v1/live-base/bases/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取基地详情
 */
export async function getBase(id: number): Promise<{ data: BaseItem; success: boolean }> {
  return request(`/api/v1/live-base/bases/${id}`, {
    method: 'GET',
  });
}
