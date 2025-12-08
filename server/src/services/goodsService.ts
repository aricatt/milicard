import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import { CodeGenerator } from '../utils/codeGenerator'
import {
  CreateGoodsRequest,
  UpdateGoodsRequest,
  GoodsQueryParams,
  GoodsResponse,
  GoodsListResponse,
  GoodsError,
  GoodsErrorType,
  GoodsCategory
} from '../types/goods'

/**
 * 商品服务 - 阿米巴模式 (每个基地独立管理商品)
 */
export class GoodsService {
  /**
   * 创建商品 (基地级别)
   */
  static async createGoods(baseId: number, data: CreateGoodsRequest, userId: string): Promise<GoodsResponse> {
    try {
      // 验证基地是否存在
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      })
      
      if (!base) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          `基地 ${baseId} 不存在`
        )
      }

      // 自动生成商品编号 (如果未提供)
      let goodsCode = data.code
      if (!goodsCode) {
        goodsCode = await CodeGenerator.generateGoodsCode()
      }

      // 检查商品编码在该基地是否已存在 (阿米巴模式下基地级唯一)
      const existingGoods = await prisma.goods.findFirst({
        where: { 
          code: goodsCode,
          baseId: baseId
        }
      })

      if (existingGoods) {
        throw new GoodsError(
          GoodsErrorType.DUPLICATE_CODE,
          `商品编码 ${goodsCode} 在基地 ${base.name} 中已存在`
        )
      }

      // 创建商品
      const goods = await prisma.goods.create({
        data: {
          code: goodsCode,
          name: data.name,
          category: data.category || 'CARD', // 默认卡牌
          manufacturer: data.manufacturer,
          description: data.description,
          retailPrice: data.retailPrice,
          packPrice: data.packPrice,
          purchasePrice: data.purchasePrice,
          boxQuantity: 1, // 固定为1
          packPerBox: data.packPerBox,
          piecePerPack: data.piecePerPack,
          imageUrl: data.imageUrl,
          notes: data.notes,
          baseId: baseId,
          isActive: true,
          createdBy: userId,
          updatedBy: userId
        }
      })

      logger.info('商品创建成功', {
        goodsId: goods.id,
        code: goods.code,
        name: goods.name,
        baseId: baseId,
        baseName: base.name,
        userId
      })

      // 重新查询以获取关联数据
      const goodsWithRelations = await prisma.goods.findUnique({
        where: { id: goods.id },
        include: {
          base: true
        }
      })

      return this.formatGoodsResponse(goodsWithRelations!)
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }
      
      logger.error('创建商品失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        baseId,
        userId
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '创建商品失败，请稍后重试'
      )
    }
  }

  /**
   * 获取基地商品列表
   */
  static async getBaseGoods(baseId: number, params: GoodsQueryParams = {}): Promise<GoodsListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        search,
        isActive,
        manufacturer,
        category
      } = params

      const skip = (page - 1) * pageSize
      
      // 构建查询条件
      const where: any = {
        baseId: baseId
      }

      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { alias: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive
      }

      if (manufacturer) {
        where.manufacturer = { contains: manufacturer, mode: 'insensitive' }
      }

      if (category) {
        where.category = category
      }

      // 查询商品列表
      const [goods, total] = await Promise.all([
        prisma.goods.findMany({
          where,
          include: {
            base: true,
            creator: true,
            updater: true
          },
          orderBy: [
            { isActive: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: pageSize
        }),
        prisma.goods.count({ where })
      ])

      return {
        data: goods.map(item => this.formatGoodsResponse(item)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    } catch (error) {
      logger.error('获取基地商品列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '获取商品列表失败，请稍后重试'
      )
    }
  }

  /**
   * 获取商品详情
   */
  static async getGoodsById(goodsId: string, baseId?: number): Promise<GoodsResponse> {
    try {
      const where: any = { id: goodsId }
      if (baseId) {
        where.baseId = baseId
      }

      const goods = await prisma.goods.findFirst({
        where,
        include: {
          base: true,
          creator: true,
          updater: true
        }
      })

      if (!goods) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          '商品不存在'
        )
      }

      return this.formatGoodsResponse(goods)
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }
      
      logger.error('获取商品详情失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId,
        baseId
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '获取商品详情失败，请稍后重试'
      )
    }
  }

  /**
   * 更新商品
   */
  static async updateGoods(goodsId: string, baseId: number, data: UpdateGoodsRequest, userId: string): Promise<GoodsResponse> {
    try {
      // 检查商品是否存在且属于该基地
      const existingGoods = await prisma.goods.findFirst({
        where: {
          id: goodsId,
          baseId: baseId
        }
      })

      if (!existingGoods) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          '商品不存在或不属于该基地'
        )
      }

      // 如果更新编码，检查是否重复
      if (data.code && data.code !== existingGoods.code) {
        const duplicateGoods = await prisma.goods.findFirst({
          where: {
            code: data.code,
            baseId: baseId,
            id: { not: goodsId }
          }
        })

        if (duplicateGoods) {
          throw new GoodsError(
            GoodsErrorType.DUPLICATE_CODE,
            `商品编码 ${data.code} 已存在`
          )
        }
      }

      // 更新商品
      const goods = await prisma.goods.update({
        where: { id: goodsId },
        data: {
          ...(data.code && { code: data.code }),
          ...(data.name && { name: data.name }),
          ...(data.category && { category: data.category }),
          ...(data.alias !== undefined && { alias: data.alias }),
          ...(data.manufacturer && { manufacturer: data.manufacturer }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.retailPrice && { retailPrice: data.retailPrice }),
          ...(data.packPrice !== undefined && { packPrice: data.packPrice }),
          ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
          ...(data.packPerBox && { packPerBox: data.packPerBox }),
          ...(data.piecePerPack && { piecePerPack: data.piecePerPack }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
          updatedBy: userId
        },
        include: {
          base: true,
          creator: true,
          updater: true
        }
      })

      logger.info('商品更新成功', {
        goodsId,
        baseId,
        userId,
        changes: Object.keys(data)
      })

      return this.formatGoodsResponse(goods)
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }
      
      logger.error('更新商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId,
        baseId,
        data,
        userId
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '更新商品失败，请稍后重试'
      )
    }
  }

  /**
   * 删除商品 (软删除 - 设为不活跃)
   */
  static async deleteGoods(goodsId: string, baseId: number, userId: string): Promise<void> {
    try {
      const goods = await prisma.goods.findFirst({
        where: {
          id: goodsId,
          baseId: baseId
        }
      })

      if (!goods) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          '商品不存在或不属于该基地'
        )
      }

      await prisma.goods.update({
        where: { id: goodsId },
        data: {
          isActive: false,
          updatedBy: userId
        }
      })

      logger.info('商品删除成功', {
        goodsId,
        baseId,
        userId
      })
    } catch (error) {
      if (error instanceof GoodsError) {
        throw error
      }
      
      logger.error('删除商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId,
        baseId,
        userId
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '删除商品失败，请稍后重试'
      )
    }
  }

  /**
   * 获取基地商品统计
   */
  static async getBaseGoodsStats(baseId: number) {
    try {
      const [totalGoods, activeGoods, manufacturers] = await Promise.all([
        prisma.goods.count({
          where: { baseId }
        }),
        prisma.goods.count({
          where: { baseId, isActive: true }
        }),
        prisma.goods.groupBy({
          by: ['manufacturer'],
          where: { baseId, isActive: true },
          _count: { manufacturer: true }
        })
      ])

      return {
        totalGoods,
        activeGoods,
        inactiveGoods: totalGoods - activeGoods,
        totalManufacturers: manufacturers.length
      }
    } catch (error) {
      logger.error('获取基地商品统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId
      })
      
      throw new GoodsError(
        GoodsErrorType.INTERNAL_ERROR,
        '获取商品统计失败，请稍后重试'
      )
    }
  }

  /**
   * 格式化商品响应数据
   */
  private static formatGoodsResponse(goods: any): GoodsResponse {
    return {
      id: goods.id,
      code: goods.code,
      name: goods.name,
      category: goods.category as GoodsCategory,
      alias: goods.alias,
      manufacturer: goods.manufacturer,
      description: goods.description,
      retailPrice: Number(goods.retailPrice),
      packPrice: goods.packPrice ? Number(goods.packPrice) : null,
      purchasePrice: goods.purchasePrice ? Number(goods.purchasePrice) : null,
      boxQuantity: goods.boxQuantity,
      packPerBox: goods.packPerBox,
      piecePerPack: goods.piecePerPack,
      imageUrl: goods.imageUrl,
      notes: goods.notes,
      baseId: goods.baseId,
      baseName: goods.base?.name,
      isActive: goods.isActive,
      createdBy: goods.createdBy,
      updatedBy: goods.updatedBy,
      createdAt: goods.createdAt,
      updatedAt: goods.updatedAt
    }
  }
}
