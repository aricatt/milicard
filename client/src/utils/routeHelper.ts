/**
 * 路由辅助工具
 * 用于根据用户权限智能选择首页
 */

import { BaseType } from '@/contexts/BaseContext';

// 定义路由配置接口
interface RouteConfig {
  path: string;
  access?: string;
  name: string;
}

// 直播基地的路由列表（按优先级排序）
const LIVE_BASE_ROUTES: RouteConfig[] = [
  { path: '/live-base/locations', access: 'canAccessLocations', name: '直播间/仓库' },
  { path: '/live-base/base-data/bases', access: 'canAccessBases', name: '基地列表' },
  { path: '/live-base/products', access: 'canAccessProducts', name: '商品设置' },
  { path: '/live-base/suppliers', access: 'canAccessSuppliers', name: '供应商' },
  { path: '/live-base/procurement', access: 'canAccessProcurement', name: '采购管理' },
  { path: '/live-base/arrivals', access: 'canAccessArrivals', name: '到货管理' },
  { path: '/live-base/transfers', access: 'canAccessTransfers', name: '调货管理' },
  { path: '/live-base/inventory-consumption', access: 'canAccessInventoryConsumption', name: '库存消耗' },
  { path: '/live-base/anchor-profit', access: 'canAccessAnchorProfit', name: '主播利润' },
  { path: '/live-base/stock-out', access: 'canAccessStockOut', name: '出库管理' },
  { path: '/live-base/real-time-stock', access: 'canAccessStock', name: '实时库存' },
  { path: '/live-base/payables', access: 'canAccessPayables', name: '应付管理' },
  { path: '/live-base/receivables', access: 'canAccessReceivables', name: '应收管理' },
  { path: '/live-base/personnel', access: 'canAccessPersonnel', name: '人员管理' },
];

// 线下区域的路由列表（按优先级排序）
const OFFLINE_REGION_ROUTES: RouteConfig[] = [
  { path: '/offline-region/sub-districts', access: 'canAccessLocations', name: '小区/仓库' },
  { path: '/offline-region/districts', access: 'canAccessBases', name: '大区管理' },
  { path: '/offline-region/products', access: 'canAccessProducts', name: '商品设置' },
  { path: '/offline-region/suppliers', access: 'canAccessSuppliers', name: '供应商' },
  { path: '/offline-region/procurement', access: 'canAccessProcurement', name: '采购管理' },
  { path: '/offline-region/arrivals', access: 'canAccessArrivals', name: '到货管理' },
  { path: '/offline-region/stock-out', access: 'canAccessStockOut', name: '出库管理' },
  { path: '/offline-region/real-time-stock', access: 'canAccessStock', name: '实时库存' },
  { path: '/offline-region/payables', access: 'canAccessPayables', name: '应付管理' },
  { path: '/offline-region/receivables', access: 'canAccessReceivables', name: '应收管理' },
  { path: '/offline-region/warehouse-keepers', access: 'canAccessPersonnel', name: '仓管人员' },
  { path: '/offline-region/point-info/points', access: 'canAccessPoint', name: '点位管理' },
  { path: '/offline-region/point-info/point-orders', access: 'canAccessPointOrder', name: '点位订单' },
  { path: '/offline-region/point-info/location-profit', access: 'canAccessAnchorProfit', name: '点位利润' },
];

/**
 * 根据基地类型和用户权限获取第一个可访问的路由
 * @param baseType 基地类型
 * @param access 用户权限对象
 * @returns 第一个可访问的路由路径，如果没有权限则返回null
 */
export function getFirstAccessibleRoute(
  baseType: BaseType,
  access: any
): { path: string; name: string } | null {
  // 根据基地类型选择路由列表
  const routes = baseType === BaseType.OFFLINE_REGION 
    ? OFFLINE_REGION_ROUTES 
    : LIVE_BASE_ROUTES;

  // 遍历路由列表，找到第一个有权限的路由
  for (const route of routes) {
    // 如果没有设置权限要求，或者用户有该权限
    if (!route.access || access[route.access]) {
      return { path: route.path, name: route.name };
    }
  }

  // 如果没有任何可访问的路由，返回null
  return null;
}

/**
 * 获取默认首页路径（旧版兼容）
 * @param baseType 基地类型
 * @returns 默认首页路径
 */
export function getDefaultHomePath(baseType: BaseType): string {
  return baseType === BaseType.OFFLINE_REGION 
    ? '/offline-region/sub-districts' 
    : '/live-base/locations';
}
