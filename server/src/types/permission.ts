// 权限相关类型定义

// 权限操作类型
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read', 
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // 完全管理权限
  EXPORT = 'export',
  IMPORT = 'import'
}

// 资源模块类型
export enum ResourceModule {
  // 用户管理
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  
  // 基础数据
  LOCATION = 'location',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  GOODS = 'goods',
  
  // 库存管理
  INVENTORY = 'inventory',
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  STOCK_TRANSFER = 'stock_transfer',
  STOCK_CONSUMPTION = 'stock_consumption',
  
  // 采购管理
  PURCHASE_ORDER = 'purchase_order',
  ARRIVAL_ORDER = 'arrival_order',
  
  // 销售管理
  DISTRIBUTION_ORDER = 'distribution_order',
  
  // 财务管理
  ANCHOR_PROFIT = 'anchor_profit',
  RECEIVABLE = 'receivable',
  PAYABLE = 'payable',
  
  // 系统管理
  SYSTEM = 'system',
  TRANSLATION = 'translation'
}

// 权限字符串格式：module:action 或 module:action:field
export type PermissionString = `${ResourceModule}:${PermissionAction}` | 
                              `${ResourceModule}:${PermissionAction}:${string}`

// 权限检查结果
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  missingPermissions?: PermissionString[]
}

// Casbin策略规则
export interface CasbinPolicy {
  sub: string    // 主体（用户ID或角色）
  obj: string    // 对象（资源路径）
  act: string    // 动作（权限操作）
}

// 角色继承关系
export interface CasbinGrouping {
  role: string   // 角色
  user: string   // 用户ID
}

// 权限中间件选项
export interface PermissionMiddlewareOptions {
  resource: ResourceModule
  action: PermissionAction
  field?: string
  allowOwner?: boolean  // 是否允许资源所有者访问
  ownerField?: string   // 所有者字段名，默认为 'userId' 或 'createdBy'
}

// 数据权限过滤器
export interface DataPermissionFilter {
  userId: string
  roles: string[]
  resource: ResourceModule
  action: PermissionAction
}

// 权限错误类型
export enum PermissionErrorType {
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_PERMISSION = 'INVALID_PERMISSION',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export class PermissionError extends Error {
  constructor(
    public type: PermissionErrorType,
    message: string,
    public statusCode: number = 403,
    public requiredPermissions?: PermissionString[]
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

// 预定义权限组合
export const PERMISSION_PRESETS = {
  // 完全管理权限
  FULL_MANAGE: (module: ResourceModule): PermissionString[] => [
    `${module}:${PermissionAction.CREATE}`,
    `${module}:${PermissionAction.READ}`,
    `${module}:${PermissionAction.UPDATE}`,
    `${module}:${PermissionAction.DELETE}`,
    `${module}:${PermissionAction.MANAGE}`
  ],
  
  // 只读权限
  READ_ONLY: (module: ResourceModule): PermissionString[] => [
    `${module}:${PermissionAction.READ}`
  ],
  
  // 基础操作权限（增删改查，不含管理）
  BASIC_CRUD: (module: ResourceModule): PermissionString[] => [
    `${module}:${PermissionAction.CREATE}`,
    `${module}:${PermissionAction.READ}`,
    `${module}:${PermissionAction.UPDATE}`,
    `${module}:${PermissionAction.DELETE}`
  ],
  
  // 数据导入导出权限
  IMPORT_EXPORT: (module: ResourceModule): PermissionString[] => [
    `${module}:${PermissionAction.IMPORT}`,
    `${module}:${PermissionAction.EXPORT}`
  ]
} as const

// 系统预定义角色权限
export const SYSTEM_ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    // 系统管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.SYSTEM),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.USER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ROLE),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PERMISSION),
    
    // 所有业务模块
    ...Object.values(ResourceModule)
      .filter(module => ![ResourceModule.SYSTEM, ResourceModule.USER, ResourceModule.ROLE, ResourceModule.PERMISSION].includes(module))
      .flatMap(module => PERMISSION_PRESETS.FULL_MANAGE(module))
  ],
  
  ADMIN: [
    // 基础数据管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.LOCATION),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.CUSTOMER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.SUPPLIER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS),
    
    // 库存管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.INVENTORY),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_IN),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_OUT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_TRANSFER),
    
    // 用户查看权限
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.USER)
  ],
  
  USER: [
    // 基础查看权限
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.GOODS),
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.INVENTORY),
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.CUSTOMER),
    
    // 基础操作权限
    ...PERMISSION_PRESETS.BASIC_CRUD(ResourceModule.STOCK_CONSUMPTION)
  ]
} as const
