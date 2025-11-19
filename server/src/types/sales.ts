/**
 * 销售管理相关类型定义
 */

// ================================
// 枚举类型
// ================================

/**
 * 销售订单状态
 */
export enum SalesOrderStatus {
  DRAFT = 'draft',           // 草稿
  PENDING = 'pending',       // 待审核
  APPROVED = 'approved',     // 已审核
  CONFIRMED = 'confirmed',   // 已确认
  PARTIAL_SHIPPED = 'partial_shipped', // 部分发货
  SHIPPED = 'shipped',       // 已发货
  DELIVERED = 'delivered',   // 已交付
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled'    // 已取消
}

/**
 * 客户状态
 */
export enum CustomerStatus {
  ACTIVE = 'active',         // 活跃
  INACTIVE = 'inactive',     // 停用
  BLACKLISTED = 'blacklisted' // 黑名单
}

/**
 * 客户类型
 */
export enum CustomerType {
  INDIVIDUAL = 'individual', // 个人客户
  CORPORATE = 'corporate',   // 企业客户
  DISTRIBUTOR = 'distributor', // 经销商
  RETAILER = 'retailer'      // 零售商
}

/**
 * 付款方式
 */
export enum PaymentMethod {
  CASH = 'cash',             // 现金
  BANK_TRANSFER = 'bank_transfer', // 银行转账
  CREDIT_CARD = 'credit_card', // 信用卡
  ALIPAY = 'alipay',         // 支付宝
  WECHAT_PAY = 'wechat_pay', // 微信支付
  CHECK = 'check'            // 支票
}

// ================================
// 基础接口
// ================================

/**
 * 客户信息
 */
export interface CustomerInfo {
  id: string
  name: string
  code: string
  type: CustomerType
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  creditLimit?: number
  status: CustomerStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 销售订单项
 */
export interface SalesOrderItemInfo {
  id: string
  distributionOrderId: string
  goodsId: string
  goods?: {
    id: string
    code: string
    name: string
  }
  boxQuantity: number
  packQuantity: number
  pieceQuantity: number
  totalPieces: number
  unitPrice: number
  totalPrice: number
  discount?: number
  finalPrice: number
  notes?: string
}

/**
 * 销售订单信息
 */
export interface SalesOrderInfo {
  id: string
  orderNo: string
  customerId: string
  customer?: CustomerInfo
  customerName: string
  sourceLocationId: string
  sourceLocation?: {
    id: true
    name: string
  }
  orderDate: string
  deliveryDate?: string
  totalAmount: number
  discountAmount?: number
  finalAmount: number
  status: SalesOrderStatus
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  items?: SalesOrderItemInfo[]
}

// ================================
// 查询参数接口
// ================================

/**
 * 客户查询参数
 */
export interface CustomerQueryParams {
  page?: number
  limit?: number
  search?: string
  type?: CustomerType
  status?: CustomerStatus
  sortBy?: 'name' | 'code' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 销售订单查询参数
 */
export interface SalesOrderQueryParams {
  page?: number
  limit?: number
  search?: string
  customerId?: string
  locationId?: string
  status?: SalesOrderStatus
  startDate?: string
  endDate?: string
  sortBy?: 'orderNo' | 'orderDate' | 'finalAmount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// ================================
// 请求接口
// ================================

/**
 * 创建客户请求
 */
export interface CreateCustomerRequest {
  name: string
  code: string
  type: CustomerType
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  creditLimit?: number
  notes?: string
}

/**
 * 更新客户请求
 */
export interface UpdateCustomerRequest {
  name?: string
  code?: string
  type?: CustomerType
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  creditLimit?: number
  status?: CustomerStatus
  notes?: string
}

/**
 * 销售订单项请求
 */
export interface SalesOrderItemRequest {
  goodsId: string
  boxQuantity: number
  packQuantity: number
  pieceQuantity: number
  unitPrice: number
  discount?: number
  notes?: string
}

/**
 * 创建销售订单请求
 */
export interface CreateSalesOrderRequest {
  customerId: string
  sourceLocationId: string
  orderDate: string
  deliveryDate?: string
  discountAmount?: number
  notes?: string
  items: SalesOrderItemRequest[]
}

/**
 * 更新销售订单请求
 */
export interface UpdateSalesOrderRequest {
  customerId?: string
  sourceLocationId?: string
  orderDate?: string
  deliveryDate?: string
  discountAmount?: number
  status?: SalesOrderStatus
  notes?: string
  items?: SalesOrderItemRequest[]
}

/**
 * 销售订单审核请求
 */
export interface ApproveSalesOrderRequest {
  approved: boolean
  notes?: string
}

// ================================
// 响应接口
// ================================

/**
 * 客户响应
 */
export interface CustomerResponse extends CustomerInfo {}

/**
 * 客户列表响应
 */
export interface CustomerListResponse {
  customers: CustomerResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 销售订单响应
 */
export interface SalesOrderResponse extends SalesOrderInfo {}

/**
 * 销售订单列表响应
 */
export interface SalesOrderListResponse {
  orders: SalesOrderResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 销售统计响应
 */
export interface SalesStatsResponse {
  totalOrders: number
  totalAmount: number
  pendingOrders: number
  pendingAmount: number
  completedOrders: number
  completedAmount: number
  topCustomers: Array<{
    customerId: string
    customerName: string
    orderCount: number
    totalAmount: number
  }>
  monthlyStats: Array<{
    month: string
    orderCount: number
    totalAmount: number
  }>
}

// ================================
// 错误处理
// ================================

/**
 * 销售管理错误类型
 */
export enum SalesErrorType {
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  CUSTOMER_CODE_EXISTS = 'CUSTOMER_CODE_EXISTS',
  SALES_ORDER_NOT_FOUND = 'SALES_ORDER_NOT_FOUND',
  SALES_ORDER_NO_EXISTS = 'SALES_ORDER_NO_EXISTS',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  INVALID_CUSTOMER_STATUS = 'INVALID_CUSTOMER_STATUS',
  INSUFFICIENT_CREDIT_LIMIT = 'INSUFFICIENT_CREDIT_LIMIT',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_ORDER_DATE = 'INVALID_ORDER_DATE',
  INVALID_DELIVERY_DATE = 'INVALID_DELIVERY_DATE',
  ORDER_ALREADY_SHIPPED = 'ORDER_ALREADY_SHIPPED',
  CANNOT_MODIFY_COMPLETED_ORDER = 'CANNOT_MODIFY_COMPLETED_ORDER',
  INVALID_GOODS_QUANTITY = 'INVALID_GOODS_QUANTITY',
  INVALID_UNIT_PRICE = 'INVALID_UNIT_PRICE',
  INVALID_DISCOUNT = 'INVALID_DISCOUNT'
}

/**
 * 销售管理自定义错误类
 */
export class SalesError extends Error {
  constructor(
    public type: SalesErrorType,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'SalesError'
  }
}
