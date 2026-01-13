/**
 * 权限重定向组件
 * 当用户访问没有权限的页面时，自动重定向到第一个有权限的页面
 */

import { useEffect } from 'react';
import { history, useAccess } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import { getFirstAccessibleRoute } from '@/utils/routeHelper';
import { message } from 'antd';

const AccessRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const access = useAccess();
  const { currentBase } = useBase();

  useEffect(() => {
    // 只在选择了基地后才进行权限检查
    if (!currentBase) {
      return;
    }

    // 获取当前路径
    const currentPath = window.location.pathname;

    // 如果是基地选择器或登录页面，不进行重定向
    if (
      currentPath === '/base-selector' ||
      currentPath.startsWith('/user/') ||
      currentPath === '/'
    ) {
      return;
    }

    // 检查当前路径是否是基地相关的路径
    const isLiveBasePath = currentPath.startsWith('/live-base');
    const isOfflineRegionPath = currentPath.startsWith('/offline-region');

    if (!isLiveBasePath && !isOfflineRegionPath) {
      // 不是基地相关的路径，不进行重定向
      return;
    }

    // 定义路由权限映射
    const routeAccessMap: Record<string, string> = {
      '/live-base/locations': 'canAccessLocations',
      '/live-base/base-data/bases': 'canAccessBases',
      '/live-base/products': 'canAccessProducts',
      '/live-base/suppliers': 'canAccessSuppliers',
      '/live-base/procurement': 'canAccessProcurement',
      '/live-base/arrivals': 'canAccessArrivals',
      '/live-base/transfers': 'canAccessTransfers',
      '/live-base/inventory-consumption': 'canAccessInventoryConsumption',
      '/live-base/anchor-profit': 'canAccessAnchorProfit',
      '/live-base/stock-out': 'canAccessStockOut',
      '/live-base/real-time-stock': 'canAccessStock',
      '/live-base/payables': 'canAccessPayables',
      '/live-base/receivables': 'canAccessReceivables',
      '/live-base/personnel': 'canAccessPersonnel',
      '/offline-region/sub-districts': 'canAccessLocations',
      '/offline-region/districts': 'canAccessBases',
      '/offline-region/products': 'canAccessProducts',
      '/offline-region/suppliers': 'canAccessSuppliers',
      '/offline-region/procurement': 'canAccessProcurement',
      '/offline-region/arrivals': 'canAccessArrivals',
      '/offline-region/stock-out': 'canAccessStockOut',
      '/offline-region/real-time-stock': 'canAccessStock',
      '/offline-region/payables': 'canAccessPayables',
      '/offline-region/receivables': 'canAccessReceivables',
      '/offline-region/warehouse-keepers': 'canAccessPersonnel',
      '/offline-region/point-info/points': 'canAccessPoint',
      '/offline-region/point-info/point-orders': 'canAccessPointOrder',
      '/offline-region/point-info/location-profit': 'canAccessAnchorProfit',
    };

    // 检查当前路径的权限
    const requiredAccess = routeAccessMap[currentPath];
    
    // 如果当前路径不在映射中，或者有权限，则不重定向
    if (!requiredAccess || (access as any)[requiredAccess]) {
      return;
    }

    // 当前路径没有权限，查找第一个有权限的页面
    console.log('Current path has no access:', currentPath, 'Required:', requiredAccess);
    const accessibleRoute = getFirstAccessibleRoute(currentBase.type, access);

    if (accessibleRoute && accessibleRoute.path !== currentPath) {
      console.log('Redirecting to accessible route:', accessibleRoute);
      message.warning(`您没有访问当前页面的权限，已自动跳转到${accessibleRoute.name}`);
      history.push(accessibleRoute.path);
    }
  }, [currentBase, access]);

  return <>{children}</>;
};

export default AccessRedirect;
