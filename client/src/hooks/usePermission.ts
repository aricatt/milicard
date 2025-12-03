/**
 * 权限 Hook
 * 提供权限检查功能
 */
import { useModel } from '@umijs/max';
import { useMemo } from 'react';

interface UserRole {
  id: string;
  name: string;
  permissions?: string[];
}

/**
 * 权限检查 Hook
 */
export function usePermission() {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  // 获取用户的所有权限
  const permissions = useMemo(() => {
    if (!currentUser?.roles) return new Set<string>();
    
    const permSet = new Set<string>();
    
    currentUser.roles.forEach((role: UserRole) => {
      // 超级管理员拥有所有权限
      if (role.name === 'SUPER_ADMIN') {
        permSet.add('*');
      }
      
      // 添加角色的权限
      if (role.permissions) {
        role.permissions.forEach((perm: string) => {
          permSet.add(perm);
        });
      }
    });
    
    return permSet;
  }, [currentUser?.roles]);

  // 获取用户的角色名称列表
  const roleNames = useMemo(() => {
    if (!currentUser?.roles) return [];
    return currentUser.roles.map((role: UserRole) => role.name);
  }, [currentUser?.roles]);

  /**
   * 检查是否有指定权限
   * @param permission 权限字符串，如 "point:read"
   */
  const hasPermission = (permission: string): boolean => {
    // 超级管理员拥有所有权限
    if (permissions.has('*')) return true;
    
    // 检查完全匹配
    if (permissions.has(permission)) return true;
    
    // 检查通配符匹配，如 "point:*" 匹配 "point:read"
    const [module, action] = permission.split(':');
    if (permissions.has(`${module}:*`)) return true;
    
    return false;
  };

  /**
   * 检查是否有任一权限
   */
  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(perm => hasPermission(perm));
  };

  /**
   * 检查是否有所有权限
   */
  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(perm => hasPermission(perm));
  };

  /**
   * 检查是否有指定角色
   */
  const hasRole = (roleName: string): boolean => {
    return roleNames.includes(roleName);
  };

  /**
   * 检查是否有任一角色
   */
  const hasAnyRole = (roleNameList: string[]): boolean => {
    return roleNameList.some(role => hasRole(role));
  };

  /**
   * 检查是否是管理员（SUPER_ADMIN 或 ADMIN）
   */
  const isAdmin = (): boolean => {
    return hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  };

  /**
   * 检查是否是超级管理员
   */
  const isSuperAdmin = (): boolean => {
    return hasRole('SUPER_ADMIN');
  };

  return {
    permissions,
    roleNames,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    currentUser,
  };
}

export default usePermission;
