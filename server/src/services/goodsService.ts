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
 * 商品服务 - 重构后版本
 * 支持全局商品 + 基地级设置的数据模型
 * 
 * 数据模型：
 * - goods 表：存储商品的全局属性（名称、规格、厂商等）
 * - goods_local_settings 表：存储基地级别的配置（价格、别名、状态等）
 */
export class GoodsService {
  /**
   * 创建商品 (基地级别)
   * 会同时创建全局商品记录和基地设置记录
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

      // 检查商品编码是否已存在（全局唯一）
      const existingGoods = await prisma.goods.findUnique({
        where: { code: goodsCode }
      })

      let goods: any

      if (existingGoods) {
        // 商品已存在，检查该基地是否已配置
        const existingSetting = await prisma.goodsLocalSetting.findUnique({
          where: {
            goodsId_baseId: {
              goodsId: existingGoods.id,
              baseId: baseId
            }
          }
        })

        if (existingSetting) {
          throw new GoodsError(
            GoodsErrorType.DUPLICATE_CODE,
            `商品编码 ${goodsCode} 在基地 ${base.name} 中已存在`
          )
        }

        // 为现有商品添加基地设置
        await prisma.goodsLocalSetting.create({
          data: {
            goodsId: existingGoods.id,
            baseId: baseId,
            retailPrice: data.retailPrice,
            purchasePrice: data.purchasePrice,
            packPrice: data.packPrice,
            alias: data.alias,
            isActive: true
          }
        })

        goods = existingGoods
      } else {
        // 创建新商品和基地设置
        goods = await prisma.goods.create({
          data: {
            code: goodsCode,
            name: data.name,
            categoryId: data.categoryId,
            manufacturer: data.manufacturer,
            description: data.description,
            boxQuantity: 1,
            packPerBox: data.packPerBox,
            piecePerPack: data.piecePerPack,
            imageUrl: data.imageUrl,
            notes: data.notes,
            isActive: true,
            createdBy: userId,
            updatedBy: userId,
            localSettings: {
              create: {
                baseId: baseId,
                retailPrice: data.retailPrice,
                purchasePrice: data.purchasePrice,
                packPrice: data.packPrice,
                alias: data.alias,
                isActive: true
              }
            }
          }
        })
      }

      logger.info('商品创建成功', {
        goodsId: goods.id,
        code: goods.code,
        name: goods.name,
        baseId: baseId,
        baseName: base.name,
        userId
      })

      // 重新查询以获取完整数据
      return await this.getGoodsById(goods.id, baseId)
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
   * 返回合并了全局商品信息和基地设置的数据
   */
  static async getBaseGoods(baseId: number, params: GoodsQueryParams = {}): Promise<GoodsListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        search,
        isActive,
        manufacturer,
        categoryId
      } = params

      const skip = (page - 1) * pageSize
      
      // 构建查询条件 - 基于 goods_local_settings 表
      const where: any = {
        baseId: baseId
      }

      // 搜索条件需要通过关联的 goods 表
      const goodsWhere: any = {}
      
      if (search) {
        goodsWhere.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (manufacturer) {
        goodsWhere.manufacturer = { contains: manufacturer, mode: 'insensitive' }
      }

      if (categoryId) {
        goodsWhere.categoryId = categoryId
      }

      if (Object.keys(goodsWhere).length > 0) {
        where.goods = goodsWhere
      }

      // 也可以搜索别名
      if (search) {
        where.OR = [
          { alias: { contains: search, mode: 'insensitive' } },
          ...(where.goods ? [{ goods: where.goods }] : [])
        ]
        delete where.goods
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive
      }

      // 查询商品设置列表
      const [settings, total] = await Promise.all([
        prisma.goodsLocalSetting.findMany({
          where,
          include: {
            goods: {
              include: {
                creator: true,
                updater: true,
                category: true
              }
            },
            base: true
          },
          orderBy: [
            { isActive: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: pageSize
        }),
        prisma.goodsLocalSetting.count({ where })
      ])

      return {
        data: settings.map(setting => this.formatGoodsResponse(setting)),
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
      if (baseId) {
        // 获取基地级别的商品数据
        const setting = await prisma.goodsLocalSetting.findFirst({
          where: {
            goodsId: goodsId,
            baseId: baseId
          },
          include: {
            goods: {
              include: {
                creator: true,
                updater: true
              }
            },
            base: true
          }
        })

        if (!setting) {
          throw new GoodsError(
            GoodsErrorType.NOT_FOUND,
            '商品不存在或不属于该基地'
          )
        }

        return this.formatGoodsResponse(setting)
      } else {
        // 获取全局商品数据（不含基地设置）
        const goods = await prisma.goods.findUnique({
          where: { id: goodsId },
          include: {
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

        return this.formatGlobalGoodsResponse(goods)
      }
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
      // 检查商品设置是否存在
      const existingSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          goodsId: goodsId,
          baseId: baseId
        },
        include: {
          goods: true
        }
      })

      if (!existingSetting) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          '商品不存在或不属于该基地'
        )
      }

      // 分离全局属性和基地属性
      const globalUpdates: any = {}
      const localUpdates: any = {}

      // 全局属性
      if (data.name) globalUpdates.name = data.name
      if (data.categoryId !== undefined) globalUpdates.categoryId = data.categoryId
      if (data.manufacturer) globalUpdates.manufacturer = data.manufacturer
      if (data.description !== undefined) globalUpdates.description = data.description
      if (data.packPerBox) globalUpdates.packPerBox = data.packPerBox
      if (data.piecePerPack) globalUpdates.piecePerPack = data.piecePerPack
      if (data.imageUrl !== undefined) globalUpdates.imageUrl = data.imageUrl
      if (data.notes !== undefined) globalUpdates.notes = data.notes

      // 基地属性
      if (data.retailPrice !== undefined) localUpdates.retailPrice = data.retailPrice
      if (data.packPrice !== undefined) localUpdates.packPrice = data.packPrice
      if (data.purchasePrice !== undefined) localUpdates.purchasePrice = data.purchasePrice
      if (data.alias !== undefined) localUpdates.alias = data.alias
      if (typeof data.isActive === 'boolean') localUpdates.isActive = data.isActive

      // 更新全局商品属性
      if (Object.keys(globalUpdates).length > 0) {
        globalUpdates.updatedBy = userId
        await prisma.goods.update({
          where: { id: goodsId },
          data: globalUpdates
        })
      }

      // 更新基地设置
      if (Object.keys(localUpdates).length > 0) {
        await prisma.goodsLocalSetting.update({
          where: { id: existingSetting.id },
          data: localUpdates
        })
      }

      logger.info('商品更新成功', {
        goodsId,
        baseId,
        userId,
        globalChanges: Object.keys(globalUpdates),
        localChanges: Object.keys(localUpdates)
      })

      return await this.getGoodsById(goodsId, baseId)
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
      const setting = await prisma.goodsLocalSetting.findFirst({
        where: {
          goodsId: goodsId,
          baseId: baseId
        }
      })

      if (!setting) {
        throw new GoodsError(
          GoodsErrorType.NOT_FOUND,
          '商品不存在或不属于该基地'
        )
      }

      // 软删除：将基地设置设为不活跃
      await prisma.goodsLocalSetting.update({
        where: { id: setting.id },
        data: { isActive: false }
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
        prisma.goodsLocalSetting.count({
          where: { baseId }
        }),
        prisma.goodsLocalSetting.count({
          where: { baseId, isActive: true }
        }),
        prisma.goodsLocalSetting.findMany({
          where: { baseId, isActive: true },
          include: {
            goods: {
              select: { manufacturer: true }
            }
          },
          distinct: ['goodsId']
        })
      ])

      // 统计不同厂家数量
      const uniqueManufacturers = new Set(manufacturers.map(m => m.goods.manufacturer))

      return {
        totalGoods,
        activeGoods,
        inactiveGoods: totalGoods - activeGoods,
        totalManufacturers: uniqueManufacturers.size
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
   * 格式化商品响应数据（包含基地设置）
   */
  private static formatGoodsResponse(setting: any): GoodsResponse {
    const goods = setting.goods
    return {
      id: goods.id,
      code: goods.code,
      name: goods.name,
      categoryId: goods.categoryId,
      categoryName: goods.category?.name || null,
      alias: setting.alias,
      manufacturer: goods.manufacturer,
      description: goods.description,
      retailPrice: Number(setting.retailPrice),
      packPrice: setting.packPrice ? Number(setting.packPrice) : null,
      purchasePrice: setting.purchasePrice ? Number(setting.purchasePrice) : null,
      boxQuantity: goods.boxQuantity,
      packPerBox: goods.packPerBox,
      piecePerPack: goods.piecePerPack,
      imageUrl: goods.imageUrl,
      notes: goods.notes,
      baseId: setting.baseId,
      baseName: setting.base?.name,
      isActive: setting.isActive,
      createdBy: goods.createdBy,
      updatedBy: goods.updatedBy,
      createdAt: goods.createdAt,
      updatedAt: goods.updatedAt
    }
  }

  /**
   * 格式化全局商品响应数据（不含基地设置）
   */
  private static formatGlobalGoodsResponse(goods: any): GoodsResponse {
    return {
      id: goods.id,
      code: goods.code,
      name: goods.name,
      categoryId: goods.categoryId,
      categoryName: goods.category?.name || null,
      alias: null,
      manufacturer: goods.manufacturer,
      description: goods.description,
      retailPrice: 0,
      packPrice: null,
      purchasePrice: null,
      boxQuantity: goods.boxQuantity,
      packPerBox: goods.packPerBox,
      piecePerPack: goods.piecePerPack,
      imageUrl: goods.imageUrl,
      notes: goods.notes,
      baseId: 0,
      baseName: undefined,
      isActive: goods.isActive,
      createdBy: goods.createdBy,
      updatedBy: goods.updatedBy,
      createdAt: goods.createdAt,
      updatedAt: goods.updatedAt
    }
  }
}
