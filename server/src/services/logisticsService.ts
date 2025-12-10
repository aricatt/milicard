/**
 * 物流查询服务
 * 调用阿里云物流查询API
 * 支持一个采购订单多个物流单号
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// 物流状态映射
export const LOGISTICS_STATE_MAP: Record<number, string> = {
  1: '在途中',
  2: '派件中',
  3: '已签收',
  4: '派送失败',
  5: '揽收',
  6: '退回',
  7: '转单',
  8: '疑难',
  9: '退签',
  10: '待清关',
  11: '清关中',
  12: '已清关',
  13: '清关异常',
};

// 物流轨迹项
export interface LogisticsTrackItem {
  time: string;
  status: string;
}

// 物流API响应数据
export interface LogisticsApiData {
  state: number;
  name: string;
  com: string;
  number: string;
  logo?: string;
  list: LogisticsTrackItem[];
}

// 物流API响应
export interface LogisticsApiResponse {
  code: number;
  desc: string;
  data?: LogisticsApiData;
}

// 单个物流记录信息
export interface LogisticsRecordInfo {
  id: string;
  trackingNumber: string;
  state: number | null;
  stateName: string;
  companyName: string;
  companyCode: string;
  logo?: string;
  tracks: LogisticsTrackItem[];
  updatedAt: Date | null;
  canRefresh: boolean;
  createdAt: Date;
}

// 采购订单物流汇总信息
export interface LogisticsSummary {
  totalCount: number;           // 总包裹数
  deliveredCount: number;       // 已签收数
  inTransitCount: number;       // 在途中数
  records: LogisticsRecordInfo[];  // 所有物流记录
}

/**
 * 获取物流状态名称
 */
export function getLogisticsStateName(state: number | null): string {
  if (state === null || state === undefined) {
    return '未查询';
  }
  return LOGISTICS_STATE_MAP[state] || '未知状态';
}

/**
 * 检查是否可以刷新物流信息
 * 规则：距离上次成功刷新超过1小时才能刷新，已签收的不能刷新
 */
export function canRefreshLogistics(lastUpdatedAt: Date | null, state: number | null): boolean {
  // 已签收的不能刷新
  if (state === 3) {
    return false;
  }
  if (!lastUpdatedAt) {
    return true;
  }
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastUpdatedAt < oneHourAgo;
}

/**
 * 调用阿里云物流查询API
 */
async function callLogisticsApi(trackingNumber: string, mobile?: string): Promise<LogisticsApiResponse> {
  const appCode = process.env.LOGISTICS_APPCODE;
  
  if (!appCode) {
    throw new Error('LOGISTICS_APPCODE 环境变量未配置');
  }

  const url = new URL('https://qryexpress.market.alicloudapi.com/lundear/expressTracking');
  url.searchParams.set('number', trackingNumber);
  url.searchParams.set('com', 'com'); // 自动识别快递公司
  if (mobile) {
    url.searchParams.set('mobile', mobile);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `APPCODE ${appCode}`,
    },
  });

  if (response.status === 403) {
    throw new Error('物流API账户欠费或APPCODE无效');
  }

  if (!response.ok) {
    throw new Error(`物流API请求失败: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as LogisticsApiResponse;
  return result;
}

/**
 * 获取采购订单的所有物流记录
 */
export async function getPurchaseOrderLogistics(purchaseOrderId: string): Promise<LogisticsSummary> {
  // 验证采购订单存在
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
  });

  if (!order) {
    throw new Error('采购订单不存在');
  }

  // 获取所有物流记录
  const records = await prisma.purchaseOrderLogistics.findMany({
    where: { purchaseOrderId },
    orderBy: { createdAt: 'desc' },
  });

  const recordInfos: LogisticsRecordInfo[] = records.map(record => {
    const logisticsData = record.logisticsData as { logo?: string; list?: LogisticsTrackItem[] } | null;
    return {
      id: record.id,
      trackingNumber: record.trackingNumber,
      state: record.logisticsState,
      stateName: getLogisticsStateName(record.logisticsState),
      companyName: record.logisticsCompany || '',
      companyCode: record.logisticsCompanyCode || '',
      logo: logisticsData?.logo,
      tracks: logisticsData?.list || [],
      updatedAt: record.logisticsUpdatedAt,
      canRefresh: canRefreshLogistics(record.logisticsUpdatedAt, record.logisticsState),
      createdAt: record.createdAt,
    };
  });

  return {
    totalCount: records.length,
    deliveredCount: records.filter(r => r.logisticsState === 3).length,
    inTransitCount: records.filter(r => r.logisticsState && r.logisticsState !== 3).length,
    records: recordInfos,
  };
}

/**
 * 添加物流单号
 */
export async function addLogisticsRecord(
  purchaseOrderId: string,
  trackingNumber: string
): Promise<LogisticsRecordInfo> {
  // 验证采购订单存在
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
  });

  if (!order) {
    throw new Error('采购订单不存在');
  }

  // 检查是否已存在相同的物流单号
  const existing = await prisma.purchaseOrderLogistics.findFirst({
    where: {
      purchaseOrderId,
      trackingNumber,
    },
  });

  if (existing) {
    throw new Error('该物流单号已存在');
  }

  // 创建物流记录
  const record = await prisma.purchaseOrderLogistics.create({
    data: {
      purchaseOrderId,
      trackingNumber,
    },
  });

  return {
    id: record.id,
    trackingNumber: record.trackingNumber,
    state: null,
    stateName: '未查询',
    companyName: '',
    companyCode: '',
    tracks: [],
    updatedAt: null,
    canRefresh: true,
    createdAt: record.createdAt,
  };
}

/**
 * 删除物流记录
 */
export async function deleteLogisticsRecord(logisticsId: string): Promise<void> {
  await prisma.purchaseOrderLogistics.delete({
    where: { id: logisticsId },
  });
}

/**
 * 刷新单个物流记录
 */
export async function refreshLogisticsRecord(
  logisticsId: string,
  mobile?: string
): Promise<LogisticsRecordInfo> {
  // 获取物流记录
  const record = await prisma.purchaseOrderLogistics.findUnique({
    where: { id: logisticsId },
  });

  if (!record) {
    throw new Error('物流记录不存在');
  }

  // 检查是否可以刷新
  if (!canRefreshLogistics(record.logisticsUpdatedAt, record.logisticsState)) {
    if (record.logisticsState === 3) {
      throw new Error('已签收的包裹无需刷新');
    }
    throw new Error('刷新太频繁，请1小时后再试');
  }

  // 调用API
  const apiResponse = await callLogisticsApi(record.trackingNumber, mobile);

  if (apiResponse.code !== 0) {
    throw new Error(apiResponse.desc || '物流查询失败');
  }

  const data = apiResponse.data!;
  const now = new Date();

  // 更新数据库
  const updated = await prisma.purchaseOrderLogistics.update({
    where: { id: logisticsId },
    data: {
      logisticsState: data.state,
      logisticsCompany: data.name,
      logisticsCompanyCode: data.com,
      logisticsData: {
        logo: data.logo,
        list: data.list,
      } as any,
      logisticsUpdatedAt: now,
    },
  });

  return {
    id: updated.id,
    trackingNumber: updated.trackingNumber,
    state: data.state,
    stateName: getLogisticsStateName(data.state),
    companyName: data.name,
    companyCode: data.com,
    logo: data.logo,
    tracks: data.list,
    updatedAt: now,
    canRefresh: false,
    createdAt: updated.createdAt,
  };
}

/**
 * 获取采购订单物流汇总状态（用于列表显示）
 */
export async function getLogisticsSummaryForList(purchaseOrderIds: string[]): Promise<Map<string, LogisticsSummary>> {
  const records = await prisma.purchaseOrderLogistics.findMany({
    where: {
      purchaseOrderId: { in: purchaseOrderIds },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summaryMap = new Map<string, LogisticsSummary>();

  // 初始化所有订单的汇总
  for (const orderId of purchaseOrderIds) {
    summaryMap.set(orderId, {
      totalCount: 0,
      deliveredCount: 0,
      inTransitCount: 0,
      records: [],
    });
  }

  // 填充数据
  for (const record of records) {
    const summary = summaryMap.get(record.purchaseOrderId)!;
    const logisticsData = record.logisticsData as { logo?: string; list?: LogisticsTrackItem[] } | null;
    
    summary.totalCount++;
    if (record.logisticsState === 3) {
      summary.deliveredCount++;
    } else if (record.logisticsState) {
      summary.inTransitCount++;
    }
    
    summary.records.push({
      id: record.id,
      trackingNumber: record.trackingNumber,
      state: record.logisticsState,
      stateName: getLogisticsStateName(record.logisticsState),
      companyName: record.logisticsCompany || '',
      companyCode: record.logisticsCompanyCode || '',
      logo: logisticsData?.logo,
      tracks: logisticsData?.list || [],
      updatedAt: record.logisticsUpdatedAt,
      canRefresh: canRefreshLogistics(record.logisticsUpdatedAt, record.logisticsState),
      createdAt: record.createdAt,
    });
  }

  return summaryMap;
}
