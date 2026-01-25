import { request } from '@umijs/max';
import type { AdsRecordQueryParams, MonthlyGmvAdsStats, CreateAdsRecordRequest, HandlerOption } from '@/pages/live-base/ads-record/types';

/**
 * 获取月度GMV-ADS统计数据
 */
export async function getAdsRecordList(params: AdsRecordQueryParams) {
  const { baseId, month, handlerIds, selectedDates } = params;
  
  const queryParams: any = { month };
  
  if (handlerIds && handlerIds.length > 0) {
    queryParams.handlerIds = handlerIds.join(',');
  }
  
  if (selectedDates && selectedDates.length > 0) {
    queryParams.selectedDates = selectedDates.join(',');
  }

  return request<{
    success: boolean;
    data: MonthlyGmvAdsStats[];
    total: number;
  }>(`/api/v1/anchor-gmv-ads/${baseId}/stats`, {
    method: 'GET',
    params: queryParams,
  });
}

/**
 * 创建或更新ADS记录
 */
export async function upsertAdsRecord(baseId: number, data: CreateAdsRecordRequest) {
  return request<{
    success: boolean;
    data?: any;
    message?: string;
  }>(`/api/v1/anchor-gmv-ads/${baseId}`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取主播列表
 */
export async function getHandlerList(baseId: number) {
  return request<{
    success: boolean;
    data: HandlerOption[];
  }>(`/api/v1/anchor-gmv-ads/${baseId}/handlers`, {
    method: 'GET',
  });
}

/**
 * 删除ADS记录
 */
export async function deleteAdsRecord(baseId: number, id: string) {
  return request<{
    success: boolean;
    message?: string;
  }>(`/api/v1/anchor-gmv-ads/${baseId}/${id}`, {
    method: 'DELETE',
  });
}
