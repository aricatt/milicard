// 库存管理相关类型定义

import { MultilingualText } from './multilingualData'

// ================================
// 基础枚举类型
// ================================

export enum InventoryOperationType {
  ARRIVAL = 'arrival',           // 到货入库
  TRANSFER_IN = 'transfer_in',   // 调拨入库
  TRANSFER_OUT = 'transfer_out', // 调拨出库
  STOCK_OUT = 'stock_out',       // 销售出库
  ADJUSTMENT = 'adjustment',     // 库存调整
  CONSUMPTION = 'consumption'    // 消耗
}

export enum TransferOrderStatus {
  PENDING = 'pending',     // 待处理
  CONFIRMED = 'confirmed', // 已确认
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled'  // 已取消
}

// ================================
// 库存查询和响应类型
// ================================

export interface InventoryQueryParams {
  goodsId?: string
  locationId?: string
  goodsCode?: string
  search?: string
  minStock?: number
  maxStock?: number
  page?: number
  limit?: number
  sortBy?: 'goodsCode' | 'stockQuantity' | 'averageCost' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface InventoryItem {
  id: string
  goodsId: string
  locationId: string
  stockQuantity: number
  averageCost: number
  updatedAt: Date
  goods: {
    id: string
    code: string
    name: MultilingualText
    retailPrice: number
    purchasePrice: number
    boxQuantity: number
    packPerBox: number
    piecePerPack: number
  }
  location: {
    id: string
    name: string
  }
}

export interface InventoryListResponse {
  inventory: InventoryItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalItems: number
    totalValue: number
    lowStockItems: number
  }
}

// ================================
// 到货入库相关类型
// ================================

export interface CreateArrivalOrderRequest {
  arrivalNo?: string
  purchaseOrderId: string
  locationId: string
  arrivalDate: string
  notes?: string
  items: ArrivalOrderItemRequest[]
}

export interface ArrivalOrderItemRequest {
  goodsId: string
  quantity: number
  unitCost: number
  notes?: string
}

export interface ArrivalOrderResponse {
  id: string
  arrivalNo: string
  purchaseOrderId: string
  locationId: string
  arrivalDate: string
  notes?: string
  createdBy: string
  createdAt: Date
  items: ArrivalOrderItemResponse[]
  purchaseOrder: {
    id: string
    orderNo: string
    supplierName: string
  }
  location: {
    id: string
    name: string
  }
}

export interface ArrivalOrderItemResponse {
  id: string
  goodsId: string
  quantity: number
  unitCost: number
  notes?: string
  goods: {
    id: string
    code: string
    name: MultilingualText
  }
}

// ================================
// 调拨管理相关类型
// ================================

export interface CreateTransferOrderRequest {
  transferNo?: string
  fromLocationId: string
  toLocationId: string
  transferDate: string
  notes?: string
  items: TransferOrderItemRequest[]
}

export interface TransferOrderItemRequest {
  goodsId: string
  quantity: number
  notes?: string
}

export interface TransferOrderResponse {
  id: string
  transferNo: string
  fromLocationId: string
  toLocationId: string
  transferDate: string
  notes?: string
  status: TransferOrderStatus
  createdBy: string
  createdAt: Date
  items: TransferOrderItemResponse[]
  fromLocation: {
    id: string
    name: string
  }
  toLocation: {
    id: string
    name: string
  }
}

export interface TransferOrderItemResponse {
  id: string
  goodsId: string
  quantity: number
  notes?: string
  goods: {
    id: string
    code: string
    name: MultilingualText
  }
}

// ================================
// 库存调整相关类型
// ================================

export interface InventoryAdjustmentRequest {
  locationId: string
  adjustments: InventoryAdjustmentItem[]
  reason: string
  notes?: string
}

export interface InventoryAdjustmentItem {
  goodsId: string
  currentQuantity: number
  adjustedQuantity: number
  reason?: string
}

export interface InventoryAdjustmentResponse {
  id: string
  locationId: string
  adjustmentDate: Date
  reason: string
  notes?: string
  createdBy: string
  createdAt: Date
  items: InventoryAdjustmentItemResponse[]
  location: {
    id: string
    name: string
  }
}

export interface InventoryAdjustmentItemResponse {
  goodsId: string
  currentQuantity: number
  adjustedQuantity: number
  difference: number
  reason?: string
  goods: {
    id: string
    code: string
    name: MultilingualText
  }
}

// ================================
// 库存统计相关类型
// ================================

export interface InventoryStatsRequest {
  locationId?: string
  goodsId?: string
  startDate?: string
  endDate?: string
}

export interface InventoryStatsResponse {
  totalValue: number
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  topValueItems: InventoryValueItem[]
  recentMovements: InventoryMovement[]
}

export interface InventoryValueItem {
  goodsId: string
  goodsCode: string
  goodsName: MultilingualText
  stockQuantity: number
  averageCost: number
  totalValue: number
}

export interface InventoryMovement {
  id: string
  type: InventoryOperationType
  goodsId: string
  goodsCode: string
  goodsName: MultilingualText
  locationId: string
  locationName: string
  quantity: number
  unitCost?: number
  operationDate: Date
  notes?: string
}

// ================================
// 库存盘点相关类型
// ================================

export interface CreateStockTakeRequest {
  locationId: string
  takeDate: string
  notes?: string
  items: StockTakeItemRequest[]
}

export interface StockTakeItemRequest {
  goodsId: string
  systemQuantity: number
  actualQuantity: number
  notes?: string
}

export interface StockTakeResponse {
  id: string
  takeNo: string
  locationId: string
  takeDate: string
  status: 'draft' | 'confirmed' | 'completed'
  notes?: string
  createdBy: string
  createdAt: Date
  items: StockTakeItemResponse[]
  location: {
    id: string
    name: string
  }
  summary: {
    totalItems: number
    differenceItems: number
    totalDifference: number
  }
}

export interface StockTakeItemResponse {
  id: string
  goodsId: string
  systemQuantity: number
  actualQuantity: number
  difference: number
  notes?: string
  goods: {
    id: string
    code: string
    name: MultilingualText
  }
}

// ================================
// 错误类型
// ================================

export enum InventoryErrorType {
  INVENTORY_NOT_FOUND = 'INVENTORY_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_GOODS = 'INVALID_GOODS',
  DUPLICATE_ARRIVAL_NO = 'DUPLICATE_ARRIVAL_NO',
  DUPLICATE_TRANSFER_NO = 'DUPLICATE_TRANSFER_NO',
  INVALID_TRANSFER = 'INVALID_TRANSFER',
  PURCHASE_ORDER_NOT_FOUND = 'PURCHASE_ORDER_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export class InventoryError extends Error {
  public type: InventoryErrorType
  public details?: any

  constructor(type: InventoryErrorType, message: string, details?: any) {
    super(message)
    this.name = 'InventoryError'
    this.type = type
    this.details = details
  }
}
