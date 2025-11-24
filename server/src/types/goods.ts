export enum GoodsStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
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
  manufacturer: string
  retailPrice: number
  packPerBox: number
  piecePerPack: number
  packPrice?: number
  purchasePrice?: number
  description?: string
  imageUrl?: string
  notes?: string
}

export interface UpdateGoodsRequest {
  code?: string
  name?: string
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
}

export interface GoodsResponse {
  id: string
  code: string
  name: string
  manufacturer: string
  retailPrice: number
  packPerBox: number
  piecePerPack: number
  boxQuantity: number
  baseId: number
  baseName?: string
  packPrice?: number
  purchasePrice?: number
  description?: string
  imageUrl?: string
  notes?: string
  isActive: boolean
  createdBy?: string
  updatedBy?: string
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
