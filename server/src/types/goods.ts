export enum GoodsStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

// 商品品类枚举
export enum GoodsCategory {
  CARD = 'CARD',             // 卡牌
  CARD_BRICK = 'CARD_BRICK', // 卡砖
  GIFT = 'GIFT',             // 礼物
  COLOR_PAPER = 'COLOR_PAPER', // 色纸
  FORTUNE_SIGN = 'FORTUNE_SIGN', // 上上签
  TEAR_CARD = 'TEAR_CARD',   // 撕撕乐
  TOY = 'TOY',               // 玩具
  STAMP = 'STAMP',           // 邮票
  LUCKY_CAT = 'LUCKY_CAT'    // 招财猫
}

// 品类中文映射
export const GoodsCategoryLabels: Record<GoodsCategory, string> = {
  [GoodsCategory.CARD]: '卡牌',
  [GoodsCategory.CARD_BRICK]: '卡砖',
  [GoodsCategory.GIFT]: '礼物',
  [GoodsCategory.COLOR_PAPER]: '色纸',
  [GoodsCategory.FORTUNE_SIGN]: '上上签',
  [GoodsCategory.TEAR_CARD]: '撕撕乐',
  [GoodsCategory.TOY]: '玩具',
  [GoodsCategory.STAMP]: '邮票',
  [GoodsCategory.LUCKY_CAT]: '招财猫'
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

export interface CreateGoodsRequest {
  code?: string
  name: string
  category?: GoodsCategory
  manufacturer: string
  retailPrice: number
  packPerBox: number
  piecePerPack: number
  packPrice?: number
  purchasePrice?: number
  description?: string
  imageUrl?: string
  notes?: string
  alias?: string  // 基地级别的商品别名
}

export interface UpdateGoodsRequest {
  code?: string
  name?: string
  category?: GoodsCategory
  alias?: string
  manufacturer?: string
  retailPrice?: number
  packPerBox?: number
  piecePerPack?: number
  packPrice?: number
  purchasePrice?: number
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
  category?: GoodsCategory
}

export interface GoodsResponse {
  id: string
  code: string
  name: string
  category: GoodsCategory
  manufacturer: string
  retailPrice: number
  packPerBox: number
  piecePerPack: number
  boxQuantity: number
  baseId: number
  baseName?: string
  packPrice?: number | null
  purchasePrice?: number | null
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
