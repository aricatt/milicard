/**
 * 权限控制组件
 * 用于控制组件的显示/隐藏
 */
import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionProps {
  /** 需要的权限，如 "point:read" */
  permission?: string;
  /** 需要的权限列表（满足任一即可） */
  anyPermissions?: string[];
  /** 需要的权限列表（需要全部满足） */
  allPermissions?: string[];
  /** 需要的角色 */
  role?: string;
  /** 需要的角色列表（满足任一即可） */
  anyRoles?: string[];
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * 权限控制组件
 * 根据用户权限决定是否渲染子组件
 */
export const Permission: React.FC<PermissionProps> = ({
  permission,
  anyPermissions,
  allPermissions,
  role,
  anyRoles,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } = usePermission();

  let hasAccess = true;

  // 检查单个权限
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  // 检查任一权限
  if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAccess && hasAnyPermission(anyPermissions);
  }

  // 检查所有权限
  if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAccess && hasAllPermissions(allPermissions);
  }

  // 检查单个角色
  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  // 检查任一角色
  if (anyRoles && anyRoles.length > 0) {
    hasAccess = hasAccess && hasAnyRole(anyRoles);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 管理员权限组件
 */
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  const { isAdmin } = usePermission();
  
  if (!isAdmin()) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * 超级管理员权限组件
 */
export const SuperAdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  const { isSuperAdmin } = usePermission();
  
  if (!isSuperAdmin()) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

export default Permission;
