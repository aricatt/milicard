export enum GoodsStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

// 品类已迁移到数据库表 categories
// 保留旧的枚举以便向后兼容
export enum GoodsCategory {
  CARD = 'CARD',
  CARD_BRICK = 'CARD_BRICK',
  GIFT = 'GIFT',
  COLOR_PAPER = 'COLOR_PAPER',
  FORTUNE_SIGN = 'FORTUNE_SIGN',
  TEAR_CARD = 'TEAR_CARD',
  TOY = 'TOY',
  STAMP = 'STAMP',
  LUCKY_CAT = 'LUCKY_CAT'
}

export enum GoodsUnit {
  PIECE = 'PIECE',
  BOX = 'BOX',
  PACK = 'PACK',
  BOTTLE = 'BOTTLE',
  BAG = 'BAG',
  KILOGRAM = 'KG',
  GRAM = 'GRAM',
  LITER = 'LITER',
  METER = 'METER',
  SET = 'SET'
}

// 库存阈值单位
export type StockThresholdUnit = 'box' | 'pack' | 'piece';

// 库存阈值配置
export interface StockThreshold {
  value: number;
  unit: StockThresholdUnit;
  enabled: boolean;
}

export interface CreateGoodsRequest {
  // 方式1：关联现有全局商品到基地
  globalGoodsId?: string
  
  // 方式2：创建新的全局商品并关联到基地
  code?: string
  name?: string
  categoryId?: number
  manufacturer?: string
  packPerBox?: number
  piecePerPack?: number
  description?: string
  imageUrl?: string
  notes?: string
  
  // 基地级别设置（两种方式都需要）
  retailPrice?: number
  packPrice?: number
  purchasePrice?: number
  alias?: string  // 基地级别的商品别名
}

export interface UpdateGoodsRequest {
  code?: string
  name?: string
  categoryId?: number
  alias?: string
  manufacturer?: string
  retailPrice?: number
  packPerBox?: number
  piecePerPack?: number
  packPrice?: number
  purchasePrice?: number
  stockThreshold?: StockThreshold | null
  description?: string
  imageUrl?: string
  notes?: string
  isActive?: boolean
}

export interface GoodsQueryParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
  manufacturer?: string
  categoryId?: number
  categoryCode?: string
}

export interface NameI18n {
  en?: string
  th?: string
  vi?: string
  [key: string]: string | undefined
}

export interface GoodsResponse {
  id: string
  code: string
  name: string
  nameI18n?: NameI18n | null
  categoryId: number | null
  categoryCode?: string | null
  categoryName?: string | null
  categoryNameI18n?: NameI18n | null
  manufacturer: string
  retailPrice: number
  packPerBox: number
  piecePerPack: number
  boxQuantity: number
  baseId: number
  baseName?: string
  packPrice?: number | null
  purchasePrice?: number | null
  stockThreshold?: StockThreshold | null
  description?: string | null
  alias?: string | null
  imageUrl?: string | null
  notes?: string | null
  isActive: boolean
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface GoodsListResponse {
  data: GoodsResponse[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export enum GoodsErrorType {
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_CODE = 'DUPLICATE_CODE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class GoodsError extends Error {
  constructor(
    public type: GoodsErrorType,
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'GoodsError'
  }
}
