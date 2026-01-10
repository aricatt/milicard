import { request } from '@umijs/max';

export interface PointVisitItem {
  id: string;
  pointId: string;
  visitDate: string;
  visitorName: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  images: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  point?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreatePointVisitRequest {
  visitorName: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  notes?: string;
}

/**
 * 获取点位最新拜访记录
 */
export async function getLatestVisit(pointId: string) {
  return request<API.Response<PointVisitItem>>(`/api/v1/points/${pointId}/visits/latest`, {
    method: 'GET',
  });
}

/**
 * 获取点位拜访记录列表
 */
export async function getVisitList(
  pointId: string,
  params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  return request<API.ResponseWithPagination<PointVisitItem>>(`/api/v1/points/${pointId}/visits`, {
    method: 'GET',
    params,
  });
}

/**
 * 创建拜访记录（支持图片上传）
 */
export async function createVisit(pointId: string, formData: FormData) {
  return request<API.Response<PointVisitItem>>(`/api/v1/points/${pointId}/visits`, {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}

/**
 * 更新拜访记录
 */
export async function updateVisit(visitId: string, formData: FormData) {
  return request<API.Response<PointVisitItem>>(`/api/v1/visits/${visitId}`, {
    method: 'PUT',
    data: formData,
    requestType: 'form',
  });
}

/**
 * 删除拜访记录
 */
export async function deleteVisit(visitId: string) {
  return request<API.Response<void>>(`/api/v1/visits/${visitId}`, {
    method: 'DELETE',
  });
}
