import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  CreateGoodsRequest,
  UpdateGoodsRequest,
  GoodsQueryParams,
  GoodsResponse,
  GoodsListResponse,
  GoodsStockInfo,
  GoodsError,
  GoodsErrorType,
  GoodsStatus
} from '../types/goods'
import { MultilingualText } from '../types/multilingualData'

export class GoodsService {
  /**
   * 创建商品
   */
  static async createGoods(data: CreateGoodsRequest, userId: string): Promise<GoodsResponse> {
    try {
      // 检查商品编码是否已存在
      const existingGoods = await prisma.goods.findUnique({
        where: { code: data.code }
      })

      if (existingGoods) {
        throw new GoodsError(
          GoodsErrorType.DUPLICATE_CODE,
          `商品编码 ${data.code} 已存在`,
          400
        )
      }

      // 验证分类是否存在
      if (data.categoryId) {
        const category = await prisma.goodsCategory.findUnique({
          where: { id: data.categoryId }
        })
        if (!category) {
          throw new GoodsError(
            GoodsErrorType.INVALID_CATEGORY,
            '指定的商品分类不存在',
            400
          )
        }
      }

      // 验证供应商是否存在
      if (data.supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: data.supplierId }
        })
        if (!supplier) {
          throw new GoodsError(
            GoodsErrorType.INVALID_SUPPLIER,
            '指定的供应商不存在',
            400
          )
        }
      }

      // 创建商品
      const goods = await prisma.goods.create({
        data: {
          code: data.code,
          name: data.name as any,
          description: data.description as any,
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          unit: data.unit,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          minStock: data.minStock,
          maxStock: data.maxStock,
          barcode: data.barcode,
          images: data.images || [],
          tags: data.tags || [],
          specifications: data.specifications || {},
          status: data.status || GoodsStatus.ACTIVE,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          supplier: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // 记录价格历史
      if (data.costPrice || data.sellingPrice) {
        await this.recordPriceHistory(goods.id, data.costPrice, data.sellingPrice, userId)
      }

      logger.info('商品创建成功', {
        goodsId: goods.id,
        code: goods.code,
        userId
      })

      return this.formatGoodsResponse(goods)
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }

      logger.error('创建商品失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        userId
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '创建商品失败',
        500
      )
    }
  }

  /**
   * 获取商品列表
   */
  static async getGoodsList(params: GoodsQueryParams, userId: string): Promise<GoodsListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        supplierId,
        status,
        unit,
        minPrice,
        maxPrice,
        hasStock,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        language = 'zh-CN'
      } = params

      // 构建查询条件
      const where: any = {}

      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          // 多语言名称搜索需要特殊处理
          {
            name: {
              path: [language],
              string_contains: search
            }
          }
        ]
      }

      if (categoryId) {
        where.categoryId = categoryId
      }

      if (supplierId) {
        where.supplierId = supplierId
      }

      if (status) {
        where.status = status
      }

      if (unit) {
        where.unit = unit
      }

      if (minPrice || maxPrice) {
        where.sellingPrice = {}
        if (minPrice) where.sellingPrice.gte = minPrice
        if (maxPrice) where.sellingPrice.lte = maxPrice
      }

      // 库存筛选需要关联查询
      if (hasStock !== undefined) {
        if (hasStock) {
          where.inventories = {
            some: {
              quantity: {
                gt: 0
              }
            }
          }
        } else {
          where.inventories = {
            none: {
              quantity: {
                gt: 0
              }
            }
          }
        }
      }

      // 排序处理
      const orderBy: any = {}
      if (sortBy === 'name') {
        orderBy.name = { path: [language], sort: sortOrder }
      } else if (sortBy === 'price') {
        orderBy.sellingPrice = sortOrder
      } else {
        orderBy[sortBy] = sortOrder
      }

      // 查询商品
      const [goods, total] = await Promise.all([
        prisma.goods.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            supplier: {
              select: {
                id: true,
                name: true
              }
            },
            inventories: {
              select: {
                quantity: true
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.goods.count({ where })
      ])

      // 获取筛选器数据
      const filters = await this.getFiltersData(where)

      const result: GoodsListResponse = {
        goods: goods.map(item => this.formatGoodsResponse(item)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters
      }

      return result
    } catch (error) {
      logger.error('获取商品列表失败', {
        error: error instanceof Error ? error.message : String(error),
        params,
        userId
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '获取商品列表失败',
        500
      )
    }
  }

  /**
   * 获取商品详情
   */
  static async getGoodsById(id: string, userId: string): Promise<GoodsResponse> {
    try {
      const goods = await prisma.goods.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          inventories: {
            select: {
              quantity: true,
              location: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      if (!goods) {
        throw new GoodsError(
          GoodsErrorType.GOODS_NOT_FOUND,
          '商品不存在',
          404
        )
      }

      return this.formatGoodsResponse(goods)
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }

      logger.error('获取商品详情失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id,
        userId
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '获取商品详情失败',
        500
      )
    }
  }

  /**
   * 更新商品
   */
  static async updateGoods(id: string, data: UpdateGoodsRequest, userId: string): Promise<GoodsResponse> {
    try {
      // 检查商品是否存在
      const existingGoods = await prisma.goods.findUnique({
        where: { id }
      })

      if (!existingGoods) {
        throw new GoodsError(
          GoodsErrorType.GOODS_NOT_FOUND,
          '商品不存在',
          404
        )
      }

      // 验证分类
      if (data.categoryId) {
        const category = await prisma.goodsCategory.findUnique({
          where: { id: data.categoryId }
        })
        if (!category) {
          throw new GoodsError(
            GoodsErrorType.INVALID_CATEGORY,
            '指定的商品分类不存在',
            400
          )
        }
      }

      // 验证供应商
      if (data.supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: data.supplierId }
        })
        if (!supplier) {
          throw new GoodsError(
            GoodsErrorType.INVALID_SUPPLIER,
            '指定的供应商不存在',
            400
          )
        }
      }

      // 记录价格变更历史
      if (data.costPrice !== undefined || data.sellingPrice !== undefined) {
        await this.recordPriceHistory(
          id,
          data.costPrice,
          data.sellingPrice,
          userId,
          existingGoods.costPrice,
          existingGoods.sellingPrice
        )
      }

      // 更新商品
      const updatedGoods = await prisma.goods.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
          updatedAt: new Date()
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          supplier: {
            select: {
              id: true,
              name: true
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
      if (error instanceof GoodsError) {
        throw error
      }

      logger.error('更新商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id,
        data,
        userId
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '更新商品失败',
        500
      )
    }
  }

  /**
   * 删除商品
   */
  static async deleteGoods(id: string, userId: string): Promise<void> {
    try {
      // 检查商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id },
        include: {
          inventories: true,
          purchaseOrderItems: true,
          distributionOrderItems: true
        }
      })

      if (!goods) {
        throw new GoodsError(
          GoodsErrorType.GOODS_NOT_FOUND,
          '商品不存在',
          404
        )
      }

      // 检查是否有库存
      const hasStock = goods.inventories.some(inv => inv.quantity > 0)
      if (hasStock) {
        throw new GoodsError(
          GoodsErrorType.GOODS_IN_USE,
          '商品仍有库存，无法删除',
          400
        )
      }

      // 检查是否有关联的订单
      const hasOrders = goods.purchaseOrderItems.length > 0 || goods.distributionOrderItems.length > 0
      if (hasOrders) {
        throw new GoodsError(
          GoodsErrorType.GOODS_IN_USE,
          '商品存在关联订单，无法删除',
          400
        )
      }

      // 软删除商品
      await prisma.goods.update({
        where: { id },
        data: {
          status: GoodsStatus.DISCONTINUED,
          updatedBy: userId,
          updatedAt: new Date()
        }
      })

      logger.info('商品删除成功', {
        goodsId: id,
        userId
      })
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }

      logger.error('删除商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id,
        userId
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '删除商品失败',
        500
      )
    }
  }

  /**
   * 获取商品库存信息
   */
  static async getGoodsStock(id: string): Promise<GoodsStockInfo> {
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

      const totalStock = inventories.reduce((sum, inv) => sum + inv.quantity, 0)
      const reservedStock = inventories.reduce((sum, inv) => sum + (inv.reservedQuantity || 0), 0)

      return {
        goodsId: id,
        totalStock,
        availableStock: totalStock - reservedStock,
        reservedStock,
        locations: inventories.map(inv => ({
          locationId: inv.locationId,
          locationName: inv.location.name as any,
          stock: inv.quantity
        })),
        lastStockUpdate: inventories.length > 0 
          ? new Date(Math.max(...inventories.map(inv => inv.updatedAt.getTime())))
          : new Date()
      }
    } catch (error) {
      logger.error('获取商品库存失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: id
      })

      throw new GoodsError(
        GoodsErrorType.GOODS_NOT_FOUND,
        '获取商品库存失败',
        500
      )
    }
  }

  /**
   * 记录价格历史
   */
  private static async recordPriceHistory(
    goodsId: string,
    newCostPrice?: number,
    newSellingPrice?: number,
    userId: string,
    oldCostPrice?: number,
    oldSellingPrice?: number
  ): Promise<void> {
    const priceHistories: any[] = []

    if (newCostPrice !== undefined && newCostPrice !== oldCostPrice) {
      priceHistories.push({
        goodsId,
        priceType: 'COST',
        oldPrice: oldCostPrice || 0,
        newPrice: newCostPrice,
        changedBy: userId,
        changedAt: new Date()
      })
    }

    if (newSellingPrice !== undefined && newSellingPrice !== oldSellingPrice) {
      priceHistories.push({
        goodsId,
        priceType: 'SELLING',
        oldPrice: oldSellingPrice || 0,
        newPrice: newSellingPrice,
        changedBy: userId,
        changedAt: new Date()
      })
    }

    if (priceHistories.length > 0) {
      await prisma.goodsPriceHistory.createMany({
        data: priceHistories
      })
    }
  }

  /**
   * 获取筛选器数据
   */
  private static async getFiltersData(baseWhere: any) {
    // 这里可以根据需要实现筛选器数据的获取
    // 暂时返回空对象
    return undefined
  }

  /**
   * 格式化商品响应数据
   */
  private static formatGoodsResponse(goods: any): GoodsResponse {
    return {
      id: goods.id,
      code: goods.code,
      name: goods.name as MultilingualText,
      description: goods.description as MultilingualText,
      category: goods.category,
      supplier: goods.supplier,
      unit: goods.unit,
      costPrice: goods.costPrice,
      sellingPrice: goods.sellingPrice,
      minStock: goods.minStock,
      maxStock: goods.maxStock,
      currentStock: goods.inventories?.reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0,
      barcode: goods.barcode,
      images: goods.images || [],
      tags: goods.tags || [],
      specifications: goods.specifications || {},
      status: goods.status,
      createdAt: goods.createdAt,
      updatedAt: goods.updatedAt,
      createdBy: goods.createdBy,
      updatedBy: goods.updatedBy
    }
  }
}
