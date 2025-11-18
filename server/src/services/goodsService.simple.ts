import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import { MultilingualText } from '../types/multilingualData'

// 简化的商品类型定义（基于实际schema）
export interface SimpleGoodsRequest {
  code: string
  name: MultilingualText
  description?: MultilingualText
  retailPrice?: number
  purchasePrice?: number
  boxQuantity?: number
  packPerBox?: number
  piecePerPack?: number
  imageUrl?: string
  notes?: string
  isActive?: boolean
}

export interface SimpleGoodsResponse {
  id: string
  code: string
  name: MultilingualText
  description?: MultilingualText
  retailPrice: number
  purchasePrice: number
  boxQuantity: number
  packPerBox: number
  piecePerPack: number
  imageUrl?: string
  notes?: string
  isActive: boolean
  currentStock: number
  createdAt: Date
  updatedAt: Date
}

export interface GoodsQueryParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  sortBy?: 'name' | 'code' | 'retailPrice' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  language?: string
}

export class GoodsService {
  /**
   * 创建商品
   */
  static async createGoods(data: SimpleGoodsRequest, userId: string): Promise<SimpleGoodsResponse> {
    try {
      // 检查商品编码是否已存在
      const existingGoods = await prisma.goods.findUnique({
        where: { code: data.code }
      })

      if (existingGoods) {
        throw new Error(`商品编码 ${data.code} 已存在`)
      }

      // 创建商品
      const goods = await prisma.goods.create({
        data: {
          code: data.code,
          name: JSON.stringify(data.name),
          description: data.description ? JSON.stringify(data.description) : undefined,
          retailPrice: data.retailPrice || 0,
          purchasePrice: data.purchasePrice || 0,
          boxQuantity: data.boxQuantity || 1,
          packPerBox: data.packPerBox || 1,
          piecePerPack: data.piecePerPack || 1,
          imageUrl: data.imageUrl,
          notes: data.notes,
          isActive: data.isActive !== false
        },
        include: {
          inventory: {
            select: {
              stockQuantity: true
            }
          }
        }
      })

      logger.info('商品创建成功', {
        goodsId: goods.id,
        code: goods.code,
        userId
      })

      return this.formatGoodsResponse(goods)
    } catch (error) {
      logger.error('创建商品失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        userId
      })
      throw error
    }
  }

  /**
   * 获取商品列表
   */
  static async getGoodsList(params: GoodsQueryParams): Promise<{
    goods: SimpleGoodsResponse[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        language = 'zh-CN'
      } = params

      // 构建查询条件
      const where: any = {}

      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } }
          // 注意：JSON字段搜索在Prisma中比较复杂，这里先简化为只搜索编码
          // 如果需要搜索名称，可以考虑使用原始SQL查询
        ]
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      // 排序处理
      const orderBy: any = {}
      if (sortBy === 'name') {
        // 对于JSON字段的排序，这里简化处理
        orderBy.code = sortOrder
      } else {
        orderBy[sortBy] = sortOrder
      }

      // 查询商品
      const [goods, total] = await Promise.all([
        prisma.goods.findMany({
          where,
          include: {
            inventory: {
              select: {
                stockQuantity: true
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.goods.count({ where })
      ])

      return {
        goods: goods.map(item => this.formatGoodsResponse(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      logger.error('获取商品列表失败', {
        error: error instanceof Error ? error.message : String(error),
        params
      })
      throw error
    }
  }

  /**
   * 获取商品详情
   */
  static async getGoodsById(id: string): Promise<SimpleGoodsResponse> {
    try {
      const goods = await prisma.goods.findUnique({
        where: { id },
        include: {
          inventory: {
            select: {
              stockQuantity: true
            }
          }
        }
      })

      if (!goods) {
        throw new Error('商品不存在')
      }

      return this.formatGoodsResponse(goods)
    } catch (error) {
      logger.error('获取商品详情失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id
      })
      throw error
    }
  }

  /**
   * 更新商品
   */
  static async updateGoods(id: string, data: Partial<SimpleGoodsRequest>, userId: string): Promise<SimpleGoodsResponse> {
    try {
      // 检查商品是否存在
      const existingGoods = await prisma.goods.findUnique({
        where: { id }
      })

      if (!existingGoods) {
        throw new Error('商品不存在')
      }

      // 如果更新编码，检查是否重复
      if (data.code && data.code !== existingGoods.code) {
        const duplicateGoods = await prisma.goods.findUnique({
          where: { code: data.code }
        })
        if (duplicateGoods) {
          throw new Error(`商品编码 ${data.code} 已存在`)
        }
      }

      // 更新商品
      const updatedGoods = await prisma.goods.update({
        where: { id },
        data: {
          ...(data.code && { code: data.code }),
          ...(data.name && { name: JSON.stringify(data.name) }),
          ...(data.description && { description: JSON.stringify(data.description) }),
          ...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
          ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
          ...(data.boxQuantity !== undefined && { boxQuantity: data.boxQuantity }),
          ...(data.packPerBox !== undefined && { packPerBox: data.packPerBox }),
          ...(data.piecePerPack !== undefined && { piecePerPack: data.piecePerPack }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        include: {
          inventory: {
            select: {
              stockQuantity: true
            }
          }
        }
      })

      logger.info('商品更新成功', {
        goodsId: id,
        userId,
        changes: Object.keys(data)
      })

      return this.formatGoodsResponse(updatedGoods)
    } catch (error) {
      logger.error('更新商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id,
        data,
        userId
      })
      throw error
    }
  }

  /**
   * 删除商品（软删除）
   */
  static async deleteGoods(id: string, userId: string): Promise<void> {
    try {
      // 检查商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id },
        include: {
          inventory: true,
          purchaseOrderItems: true,
          distributionOrderItems: true
        }
      })

      if (!goods) {
        throw new Error('商品不存在')
      }

      // 检查是否有库存
      const hasStock = goods.inventory.some(inv => inv.stockQuantity > 0)
      if (hasStock) {
        throw new Error('商品仍有库存，无法删除')
      }

      // 检查是否有关联的订单
      const hasOrders = goods.purchaseOrderItems.length > 0 || goods.distributionOrderItems.length > 0
      if (hasOrders) {
        throw new Error('商品存在关联订单，无法删除')
      }

      // 软删除商品
      await prisma.goods.update({
        where: { id },
        data: {
          isActive: false
        }
      })

      logger.info('商品删除成功', {
        goodsId: id,
        userId
      })
    } catch (error) {
      logger.error('删除商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id,
        userId
      })
      throw error
    }
  }

  /**
   * 获取商品库存信息
   */
  static async getGoodsStock(id: string): Promise<{
    goodsId: string
    totalStock: number
    locations: Array<{
      locationId: string
      locationName: string
      stock: number
    }>
  }> {
    try {
      const inventories = await prisma.inventory.findMany({
        where: { goodsId: id },
        include: {
          location: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      const totalStock = inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0)

      return {
        goodsId: id,
        totalStock,
        locations: inventories.map(inv => ({
          locationId: inv.locationId,
          locationName: inv.location.name as any,
          stock: inv.stockQuantity
        }))
      }
    } catch (error) {
      logger.error('获取商品库存失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id
      })
      throw error
    }
  }

  /**
   * 格式化商品响应数据
   */
  private static formatGoodsResponse(goods: any): SimpleGoodsResponse {
    // 安全解析JSON字段
    const parseName = (name: any): MultilingualText => {
      if (typeof name === 'string') {
        try {
          return JSON.parse(name)
        } catch {
          // 如果解析失败，假设是简单字符串，转换为多语言格式
          return { zh_CN: name }
        }
      }
      return name || { zh_CN: '' }
    }

    const parseDescription = (description: any): MultilingualText | undefined => {
      if (!description) return undefined
      if (typeof description === 'string') {
        try {
          return JSON.parse(description)
        } catch {
          return { zh_CN: description }
        }
      }
      return description
    }

    return {
      id: goods.id,
      code: goods.code,
      name: parseName(goods.name),
      description: parseDescription(goods.description),
      retailPrice: Number(goods.retailPrice),
      purchasePrice: Number(goods.purchasePrice),
      boxQuantity: goods.boxQuantity,
      packPerBox: goods.packPerBox,
      piecePerPack: goods.piecePerPack,
      imageUrl: goods.imageUrl,
      notes: goods.notes,
      isActive: goods.isActive,
      currentStock: goods.inventory?.reduce((sum: number, inv: any) => sum + inv.stockQuantity, 0) || 0,
      createdAt: goods.createdAt,
      updatedAt: goods.updatedAt
    }
  }
}
