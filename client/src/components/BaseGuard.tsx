import React, { useEffect } from 'react';
import { Spin } from 'antd';
import { history } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

interface BaseGuardProps {
  children: React.ReactNode;
}

/**
 * 基地路由守卫组件
 * 确保用户已选择基地才能访问受保护的页面
 */
const BaseGuard: React.FC<BaseGuardProps> = ({ children }) => {
  // 安全地使用 useBase
  let currentBase, loading;
  try {
    const baseContext = useBase();
    currentBase = baseContext.currentBase;
    loading = baseContext.loading;
  } catch (error) {
    // 如果不在 BaseProvider 中，重定向到基地选择器
    history.push('/base-selector');
    return null;
  }

  useEffect(() => {
    const currentPath = history.location.pathname;
    
    // 如果没有加载中且没有当前基地，重定向到基地选择器
    if (!loading && !currentBase) {
      // 如果当前不在基地选择器页面，则重定向
      if (currentPath !== '/base-selector') {
        history.push('/base-selector');
      }
    }
    
    // 如果有基地且访问的是 /live-base 根路径，重定向到概览页面
    if (!loading && currentBase && currentPath === '/live-base') {
      history.push('/live-base/overview');
    }
  }, [currentBase, loading]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // 如果没有选择基地，不渲染子组件（会被重定向）
  if (!currentBase) {
    return null;
  }

  // 有基地上下文，正常渲染子组件
  return <>{children}</>;
};

export default BaseGuard;
