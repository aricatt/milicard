import { MultilingualText } from './multilingualData'

// 商品状态枚举
export enum GoodsStatus {
  ACTIVE = 'ACTIVE',           // 正常销售
  INACTIVE = 'INACTIVE',       // 停用
  DISCONTINUED = 'DISCONTINUED' // 停产
}

// 商品单位枚举
export enum GoodsUnit {
  PIECE = 'PIECE',     // 件
  BOX = 'BOX',         // 箱
  PACK = 'PACK',       // 包
  BOTTLE = 'BOTTLE',   // 瓶
  BAG = 'BAG',         // 袋
  KILOGRAM = 'KG',     // 千克
  GRAM = 'GRAM',       // 克
  LITER = 'LITER',     // 升
  METER = 'METER',     // 米
  SET = 'SET'          // 套
}

// 商品创建请求
export interface CreateGoodsRequest {
  code: string                    // 商品编码
  name: MultilingualText         // 多语言名称
  description?: MultilingualText  // 多语言描述
  categoryId?: string            // 分类ID
  supplierId?: string            // 供应商ID
  unit: GoodsUnit               // 单位
  costPrice?: number            // 成本价
  sellingPrice?: number         // 销售价
  minStock?: number             // 最小库存
  maxStock?: number             // 最大库存
  barcode?: string              // 条形码
  images?: string[]             // 图片URLs
  tags?: string[]               // 标签
  specifications?: Record<string, any> // 规格参数
  status?: GoodsStatus          // 状态
}

// 商品更新请求
export interface UpdateGoodsRequest {
  name?: MultilingualText
  description?: MultilingualText
  categoryId?: string
  supplierId?: string
  unit?: GoodsUnit
  costPrice?: number
  sellingPrice?: number
  minStock?: number
  maxStock?: number
  barcode?: string
  images?: string[]
  tags?: string[]
  specifications?: Record<string, any>
  status?: GoodsStatus
}

// 商品查询参数
export interface GoodsQueryParams {
  page?: number
  limit?: number
  search?: string              // 搜索关键词
  categoryId?: string          // 分类筛选
  supplierId?: string          // 供应商筛选
  status?: GoodsStatus         // 状态筛选
  unit?: GoodsUnit            // 单位筛选
  minPrice?: number           // 最小价格
  maxPrice?: number           // 最大价格
  hasStock?: boolean          // 是否有库存
  sortBy?: 'name' | 'code' | 'price' | 'stock' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  language?: string           // 语言偏好
}

// 商品响应数据
export interface GoodsResponse {
  id: string
  code: string
  name: MultilingualText
  description?: MultilingualText
  category?: {
    id: string
    name: string
  }
  supplier?: {
    id: string
    name: MultilingualText
  }
  unit: GoodsUnit
  costPrice?: number
  sellingPrice?: number
  minStock?: number
  maxStock?: number
  currentStock?: number       // 当前库存
  barcode?: string
  images?: string[]
  tags?: string[]
  specifications?: Record<string, any>
  status: GoodsStatus
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

// 商品列表响应
export interface GoodsListResponse {
  goods: GoodsResponse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters?: {
    categories: Array<{ id: string; name: string; count: number }>
    suppliers: Array<{ id: string; name: string; count: number }>
    units: Array<{ unit: GoodsUnit; count: number }>
    priceRange: { min: number; max: number }
  }
}

// 商品库存信息
export interface GoodsStockInfo {
  goodsId: string
  totalStock: number
  availableStock: number
  reservedStock: number
  locations: Array<{
    locationId: string
    locationName: string
    stock: number
  }>
  lastStockUpdate: Date
}

// 商品价格历史
export interface GoodsPriceHistory {
  id: string
  goodsId: string
  priceType: 'COST' | 'SELLING'
  oldPrice: number
  newPrice: number
  changeReason?: string
  changedBy: string
  changedAt: Date
}

// 商品批量操作请求
export interface BulkGoodsOperation {
  operation: 'UPDATE_STATUS' | 'UPDATE_CATEGORY' | 'UPDATE_SUPPLIER' | 'DELETE'
  goodsIds: string[]
  data?: {
    status?: GoodsStatus
    categoryId?: string
    supplierId?: string
  }
}

// 商品导入数据
export interface GoodsImportData {
  code: string
  name_zh?: string
  name_en?: string
  name_vi?: string
  name_th?: string
  description_zh?: string
  description_en?: string
  description_vi?: string
  description_th?: string
  categoryCode?: string
  supplierCode?: string
  unit: string
  costPrice?: number
  sellingPrice?: number
  minStock?: number
  maxStock?: number
  barcode?: string
  tags?: string
  status?: string
}

// 商品导入结果
export interface GoodsImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{
    row: number
    code?: string
    errors: string[]
  }>
  createdGoods: string[]
  updatedGoods: string[]
}

// 商品统计数据
export interface GoodsStatistics {
  totalGoods: number
  activeGoods: number
  inactiveGoods: number
  discontinuedGoods: number
  lowStockGoods: number
  outOfStockGoods: number
  totalValue: number
  averagePrice: number
  topCategories: Array<{
    categoryId: string
    categoryName: string
    count: number
    percentage: number
  }>
  topSuppliers: Array<{
    supplierId: string
    supplierName: string
    count: number
    percentage: number
  }>
}

// 商品验证错误
export interface GoodsValidationError {
  field: string
  message: string
  code: string
}

// 商品业务错误类型
export enum GoodsErrorType {
  GOODS_NOT_FOUND = 'GOODS_NOT_FOUND',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  INVALID_SUPPLIER = 'INVALID_SUPPLIER',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_STOCK = 'INVALID_STOCK',
  GOODS_IN_USE = 'GOODS_IN_USE',
  IMPORT_FORMAT_ERROR = 'IMPORT_FORMAT_ERROR'
}

export class GoodsError extends Error {
  constructor(
    public type: GoodsErrorType,
    message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'GoodsError'
  }
}
