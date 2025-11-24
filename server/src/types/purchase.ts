/**
 * 采购管理相关类型定义
 */

// ================================
// 枚举类型
// ================================

/**
 * 采购订单状态
 */
export enum PurchaseOrderStatus {
  DRAFT = 'draft',           // 草稿
  PENDING = 'pending',       // 待审核
  APPROVED = 'approved',     // 已审核
  ORDERED = 'ordered',       // 已下单
  PARTIAL_RECEIVED = 'partial_received', // 部分到货
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled'    // 已取消
}

/**
 * 供应商状态
 */
export enum SupplierStatus {
  ACTIVE = 'active',         // 活跃
  INACTIVE = 'inactive',     // 停用
  BLACKLISTED = 'blacklisted' // 黑名单
}

/**
 * 付款条件
 */
export enum PaymentTerm {
  CASH = 'cash',             // 现金
  NET_15 = 'net_15',         // 15天账期
  NET_30 = 'net_30',         // 30天账期
  NET_60 = 'net_60',         // 60天账期
  NET_90 = 'net_90'          // 90天账期
}

// ================================
// 基础接口
// ================================

/**
 * 供应商信息
 */
export interface SupplierInfo {
  id: string
  name: string
  code: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  bankAccount?: string
  paymentTerm: PaymentTerm
  creditLimit?: number
  status: SupplierStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 采购订单项
 */
export interface PurchaseOrderItemInfo {
  id: string
  purchaseOrderId: string
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
  receivedQuantity?: number
  notes?: string
}

/**
 * 采购订单信息
 */
export interface PurchaseOrderInfo {
  id: string
  orderNo: string
  supplierName: string
  targetLocationId: string
  targetLocation?: {
    id: string
    name: string
  }
  purchaseDate: string
  totalAmount: number
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  items?: PurchaseOrderItemInfo[]
}

// ================================
// 查询参数接口
// ================================

/**
 * 供应商查询参数
 */
export interface SupplierQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: SupplierStatus
  paymentTerm?: PaymentTerm
  sortBy?: 'name' | 'code' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 采购订单查询参数
 */
export interface PurchaseOrderQueryParams {
  page?: number
  limit?: number
  search?: string
  supplierId?: string
  locationId?: string
  status?: PurchaseOrderStatus
  startDate?: string
  endDate?: string
  sortBy?: 'orderNo' | 'purchaseDate' | 'totalAmount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// ================================
// 请求接口
// ================================

/**
 * 创建供应商请求
 */
export interface CreateSupplierRequest {
  name: string
  code: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  bankAccount?: string
  paymentTerm: PaymentTerm
  creditLimit?: number
  notes?: string
}

/**
 * 更新供应商请求
 */
export interface UpdateSupplierRequest {
  name?: string
  code?: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  taxNumber?: string
  bankAccount?: string
  paymentTerm?: PaymentTerm
  creditLimit?: number
  status?: SupplierStatus
  notes?: string
}

/**
 * 采购订单项请求
 */
export interface PurchaseOrderItemRequest {
  goodsId: string
  boxQuantity: number
  packQuantity: number
  pieceQuantity: number
  unitPrice: number
  notes?: string
}

/**
 * 创建采购订单请求
 */
export interface CreatePurchaseOrderRequest {
  supplierName: string
  targetLocationId: string
  purchaseDate: string
  actualAmount?: number  // 实付金额
  notes?: string
  items: PurchaseOrderItemRequest[]
}

/**
 * 更新采购订单请求
 */
export interface UpdatePurchaseOrderRequest {
  supplierName?: string
  targetLocationId?: string
  purchaseDate?: string
  actualAmount?: number  // 实付金额
  notes?: string
  items?: PurchaseOrderItemRequest[]
}

/**
 * 采购订单审核请求
 */
export interface ApprovePurchaseOrderRequest {
  approved: boolean
  notes?: string
}

// ================================
// 响应接口
// ================================

/**
 * 供应商响应
 */
export interface SupplierResponse extends SupplierInfo {}

/**
 * 供应商列表响应
 */
export interface SupplierListResponse {
  suppliers: SupplierResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 采购订单响应
 */
export interface PurchaseOrderResponse extends PurchaseOrderInfo {}

/**
 * 采购订单列表响应
 */
export interface PurchaseOrderListResponse {
  orders: PurchaseOrderResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 采购统计响应
 */
export interface PurchaseStatsResponse {
  totalOrders: number
  totalAmount: number
  pendingOrders: number
  pendingAmount: number
  completedOrders: number
  completedAmount: number
  topSuppliers: Array<{
    supplierId: string
    supplierName: string
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
 * 采购管理错误类型
 */
export enum PurchaseErrorType {
  SUPPLIER_NOT_FOUND = 'SUPPLIER_NOT_FOUND',
  SUPPLIER_CODE_EXISTS = 'SUPPLIER_CODE_EXISTS',
  PURCHASE_ORDER_NOT_FOUND = 'PURCHASE_ORDER_NOT_FOUND',
  PURCHASE_ORDER_NO_EXISTS = 'PURCHASE_ORDER_NO_EXISTS',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  INVALID_SUPPLIER_STATUS = 'INVALID_SUPPLIER_STATUS',
  INSUFFICIENT_CREDIT_LIMIT = 'INSUFFICIENT_CREDIT_LIMIT',
  INVALID_PURCHASE_DATE = 'INVALID_PURCHASE_DATE',
  INVALID_DELIVERY_DATE = 'INVALID_DELIVERY_DATE',
  ORDER_ALREADY_RECEIVED = 'ORDER_ALREADY_RECEIVED',
  CANNOT_MODIFY_COMPLETED_ORDER = 'CANNOT_MODIFY_COMPLETED_ORDER',
  INVALID_GOODS_QUANTITY = 'INVALID_GOODS_QUANTITY',
  INVALID_UNIT_PRICE = 'INVALID_UNIT_PRICE',
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_GOODS = 'INVALID_GOODS',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * 采购管理自定义错误类
 */
export class PurchaseError extends Error {
  constructor(
    public type: PurchaseErrorType,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'PurchaseError'
  }
}
