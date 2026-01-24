// 权限相关类型定义

// 权限操作类型
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read', 
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // 完全管理权限
  EXPORT = 'export',
  IMPORT = 'import',
  // 点位订单专用操作
  CONFIRM = 'confirm',   // 确认订单（官方）
  SHIP = 'ship',         // 发货（官方）
  DELIVER = 'deliver',   // 确认送达（官方）
  PAYMENT = 'payment',   // 确认收款（官方）
  COMPLETE = 'complete', // 完成订单（官方）
  RECEIVE = 'receive',   // 确认收货（点位老板）
}

// 资源模块类型
export enum ResourceModule {
  // 系统管理
  SYSTEM = 'system',
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  
  // 基地管理
  BASE = 'base',
  LOCATION = 'location',
  PERSONNEL = 'personnel',
  
  // 基础数据
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  GOODS = 'goods',                         // 全局商品
  CATEGORY = 'category',                   // 商品品类
  CURRENCY_RATE = 'currency_rate',         // 货币汇率
  GLOBAL_SETTING = 'global_setting',       // 全局配置
  GOODS_LOCAL_SETTING = 'goods_local_setting', // 基地商品设置（依赖 GOODS:read）
  
  // 库存管理
  INVENTORY = 'inventory',
  PURCHASE_ORDER = 'purchase_order',
  ARRIVAL_ORDER = 'arrival_order',
  STOCK_TRANSFER = 'stock_transfer',
  STOCK_OUT = 'stock_out',
  STOCK_CONSUMPTION = 'stock_consumption',
  
  // 财务管理
  ANCHOR_PROFIT = 'anchor_profit',
  RECEIVABLE = 'receivable',
  
  // 点位订单系统（新增）
  POINT = 'point',              // 点位管理
  POINT_ORDER = 'point_order',  // 点位订单
  POINT_INVENTORY = 'point_inventory', // 点位库存
  LOCATION_PROFIT = 'location_profit', // 点位利润
  
  // 其他
  TRANSLATION = 'translation'
}

// 菜单权限映射
export enum MenuPermission {
  // 直播基地菜单
  LIVE_BASE = 'menu:live_base',
  LIVE_BASE_BASES = 'menu:live_base:bases',
  LIVE_BASE_LOCATIONS = 'menu:live_base:locations',
  LIVE_BASE_PERSONNEL = 'menu:live_base:personnel',
  LIVE_BASE_SUPPLIERS = 'menu:live_base:suppliers',
  LIVE_BASE_PRODUCTS = 'menu:live_base:products',
  LIVE_BASE_PROCUREMENT = 'menu:live_base:procurement',
  LIVE_BASE_ARRIVALS = 'menu:live_base:arrivals',
  LIVE_BASE_TRANSFERS = 'menu:live_base:transfers',
  LIVE_BASE_INVENTORY = 'menu:live_base:inventory',
  LIVE_BASE_ANCHOR_PROFIT = 'menu:live_base:anchor_profit',
  LIVE_BASE_STOCK_OUT = 'menu:live_base:stock_out',
  LIVE_BASE_RECEIVABLES = 'menu:live_base:receivables',
  
  // 线下区域菜单
  OFFLINE_REGION = 'menu:offline_region',
  
  // 点位订单菜单（新增）
  POINT_ORDER = 'menu:point_order',
  POINT_ORDER_LIST = 'menu:point_order:list',
  POINT_ORDER_POINTS = 'menu:point_order:points',
  
  // 系统管理菜单
  SYSTEM = 'menu:system',
  SYSTEM_USERS = 'menu:system:users',
  SYSTEM_ROLES = 'menu:system:roles',
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

// 权限依赖关系配置
// 某些权限需要先开启依赖权限才能生效
export const PERMISSION_DEPENDENCIES: Record<string, PermissionString[]> = {
  // 基地商品设置的所有操作都依赖全局商品的查看权限
  [ResourceModule.GOODS_LOCAL_SETTING]: [`${ResourceModule.GOODS}:${PermissionAction.READ}`],
}

// 系统预定义角色权限（与 seed.ts 中的角色对应）
export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionString[]> = {
  // 系统管理员 - 拥有所有权限
  ADMIN: [
    // 系统管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.SYSTEM),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.USER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ROLE),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PERMISSION),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GLOBAL_SETTING),
    
    // 所有业务模块完全权限
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.BASE),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.LOCATION),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PERSONNEL),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.CUSTOMER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.SUPPLIER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS_LOCAL_SETTING),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.INVENTORY),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PURCHASE_ORDER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ARRIVAL_ORDER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_TRANSFER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_OUT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_CONSUMPTION),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ANCHOR_PROFIT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.RECEIVABLE),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.POINT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.POINT_ORDER),
    
    // 所有菜单权限
    'system:read' as PermissionString,  // 菜单权限用 read 表示可见
  ],
  
  // 基地管理员 - 管理特定基地的所有业务
  BASE_MANAGER: [
    // 基地和地点管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.BASE),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.LOCATION),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PERSONNEL),
    
    // 基础数据管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.CUSTOMER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.SUPPLIER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS_LOCAL_SETTING),
    
    // 库存管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.INVENTORY),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PURCHASE_ORDER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ARRIVAL_ORDER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_TRANSFER),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_OUT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_CONSUMPTION),
    
    // 财务管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ANCHOR_PROFIT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.RECEIVABLE),
    
    // 点位订单管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.POINT),
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.POINT_ORDER),
    
    // 用户只读
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.USER),
  ],
  
  // 点位老板 - 只能管理自己的点位和订单
  POINT_OWNER: [
    // 点位：只能查看和编辑自己的点位
    `${ResourceModule.POINT}:${PermissionAction.READ}:own`,
    `${ResourceModule.POINT}:${PermissionAction.UPDATE}:own`,
    
    // 点位订单：完全管理自己的订单
    `${ResourceModule.POINT_ORDER}:${PermissionAction.CREATE}`,
    `${ResourceModule.POINT_ORDER}:${PermissionAction.READ}:own`,
    `${ResourceModule.POINT_ORDER}:${PermissionAction.UPDATE}:own`,
    `${ResourceModule.POINT_ORDER}:${PermissionAction.DELETE}:own`,
    
    // 商品：只读（用于下单时选择商品）
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.GOODS),
  ],
  
  // 客服 - 处理点位订单和发货配送
  CUSTOMER_SERVICE: [
    // 点位：查看所有点位
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.POINT),
    
    // 点位订单：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.POINT_ORDER),
    
    // 库存：只读（用于确认库存）
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.INVENTORY),
    
    // 出库：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_OUT),
    
    // 商品：只读
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.GOODS),
  ],
  
  // 仓管 - 管理仓库库存和到货调货
  WAREHOUSE_KEEPER: [
    // 全局商品：只读（用于查看商品信息）
    `${ResourceModule.GOODS}:${PermissionAction.READ}`,
    
    // 基地商品设置：完全管理（录入基地价格、别名等）
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.GOODS_LOCAL_SETTING),
    
    // 采购管理：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.PURCHASE_ORDER),
    
    // 到货管理：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.ARRIVAL_ORDER),
    
    // 调货管理：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_TRANSFER),
    
    // 出库管理：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_OUT),
    
    // 库存：只读
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.INVENTORY),
    
    // 地点：只读
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.LOCATION),
  ],
  
  // 主播 - 管理自己的库存消耗和利润
  ANCHOR: [
    // 商品：只读基础信息
    `${ResourceModule.GOODS}:${PermissionAction.READ}`,
    
    // 消耗：完全管理
    ...PERMISSION_PRESETS.FULL_MANAGE(ResourceModule.STOCK_CONSUMPTION),
    
    // 调货：只能查看自己相关的
    `${ResourceModule.STOCK_TRANSFER}:${PermissionAction.READ}:own`,
    
    // 利润：查看和编辑自己的
    `${ResourceModule.ANCHOR_PROFIT}:${PermissionAction.READ}:own`,
    `${ResourceModule.ANCHOR_PROFIT}:${PermissionAction.UPDATE}:own`,
    
    // 库存：只读
    ...PERMISSION_PRESETS.READ_ONLY(ResourceModule.INVENTORY),
  ],
}
