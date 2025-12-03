/**
 * @see https://umijs.org/docs/max/access#access
 * 权限配置
 */

interface UserRole {
  id: string;
  name: string;
  permissions?: string[];
}

/**
 * 检查用户是否有指定权限
 */
function hasPermission(roles: UserRole[] | undefined, permission: string): boolean {
  if (!roles) return false;
  
  for (const role of roles) {
    // 超级管理员拥有所有权限
    if (role.name === 'SUPER_ADMIN') return true;
    
    // 检查角色权限
    if (role.permissions) {
      if (role.permissions.includes('*')) return true;
      if (role.permissions.includes(permission)) return true;
      
      // 检查通配符匹配
      const [module] = permission.split(':');
      if (role.permissions.includes(`${module}:*`)) return true;
    }
  }
  
  return false;
}

/**
 * 检查用户是否有指定角色
 */
function hasRole(roles: UserRole[] | undefined, roleName: string): boolean {
  if (!roles) return false;
  return roles.some(role => role.name === roleName);
}

/**
 * 检查用户是否是管理员
 */
function isAdmin(roles: UserRole[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return hasRole(roles, 'SUPER_ADMIN') || hasRole(roles, 'ADMIN');
}

/**
 * 检查用户是否已登录（有任何角色）
 */
function isLoggedIn(roles: UserRole[] | undefined): boolean {
  return !!roles && roles.length > 0;
}

export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  
  // 兼容 roles 可能是字符串数组或对象数组的情况
  let roles: UserRole[] | undefined;
  if (currentUser?.roles) {
    if (typeof currentUser.roles[0] === 'string') {
      // 旧格式：字符串数组
      roles = (currentUser.roles as unknown as string[]).map(name => ({
        id: '',
        name,
        permissions: name === 'SUPER_ADMIN' || name === 'ADMIN' ? ['*'] : [],
      }));
    } else {
      // 新格式：对象数组
      roles = currentUser.roles as UserRole[];
    }
  }

  return {
    // 旧版兼容
    canAdmin: currentUser && currentUser.access === 'admin',
    
    // 基于角色的权限
    isSuperAdmin: hasRole(roles, 'SUPER_ADMIN'),
    isAdmin: isAdmin(roles),
    
    // 系统管理权限
    canAccessSystem: isAdmin(roles),
    canManageUsers: isAdmin(roles) || hasPermission(roles, 'user:manage'),
    canManageRoles: isAdmin(roles) || hasPermission(roles, 'role:manage'),
    
    // 点位管理权限
    canAccessPoint: hasPermission(roles, 'point:read') || isAdmin(roles),
    canCreatePoint: hasPermission(roles, 'point:create') || isAdmin(roles),
    canUpdatePoint: hasPermission(roles, 'point:update') || isAdmin(roles),
    canDeletePoint: hasPermission(roles, 'point:delete') || isAdmin(roles),
    
    // 订单管理权限
    canAccessOrder: hasPermission(roles, 'order:read') || isAdmin(roles),
    canCreateOrder: hasPermission(roles, 'order:create') || isAdmin(roles),
    
    // 库存管理权限
    canAccessInventory: hasPermission(roles, 'inventory:read') || isAdmin(roles),
    canUpdateInventory: hasPermission(roles, 'inventory:update') || isAdmin(roles),
    
    // 报表权限
    canAccessReport: hasPermission(roles, 'report:read') || isAdmin(roles),
    
    // 通用权限检查函数
    hasPermission: (permission: string) => hasPermission(roles, permission) || isAdmin(roles),
    hasRole: (roleName: string) => hasRole(roles, roleName),
  };
}
