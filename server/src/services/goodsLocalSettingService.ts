import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import { buildGoodsSearchConditions } from '../utils/multilingualHelper'

/**
 * 基地商品设置数据类型
 */
export interface GoodsLocalSettingData {
  goodsId: string
  retailPrice: number
  purchasePrice?: number
  packPrice?: number
  alias?: string
  isActive?: boolean
}

export interface GoodsLocalSettingQueryParams {
  page?: number
  pageSize?: number
  search?: string
  manufacturer?: string
  isActive?: boolean
}

/**
 * 基地商品设置服务 - 管理基地级别的商品配置（价格、别名、状态等）
 */
export class GoodsLocalSettingService {
  /**
   * 创建基地商品设置
   */
  static async create(baseId: number, data: GoodsLocalSettingData) {
    try {
      // 验证基地是否存在
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      })
      
      if (!base) {
        throw new Error(`基地 ${baseId} 不存在`)
      }

      // 验证商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id: data.goodsId }
      })

      if (!goods) {
        throw new Error(`商品 ${data.goodsId} 不存在`)
      }

      // 检查该基地是否已配置该商品
      const existingSetting = await prisma.goodsLocalSetting.findUnique({
        where: {
          goodsId_baseId: {
            goodsId: data.goodsId,
            baseId: baseId
          }
        }
      })

      if (existingSetting) {
        throw new Error(`该商品已在当前基地配置`)
      }

      // 创建设置
      const setting = await prisma.goodsLocalSetting.create({
        data: {
          goodsId: data.goodsId,
          baseId: baseId,
          retailPrice: data.retailPrice,
          purchasePrice: data.purchasePrice,
          packPrice: data.packPrice,
          alias: data.alias,
          isActive: data.isActive ?? true
        },
        include: {
          goods: true,
          base: true
        }
      })

      logger.info('基地商品设置创建成功', {
        settingId: setting.id,
        goodsId: data.goodsId,
        goodsName: goods.name,
        baseId: baseId,
        baseName: base.name
      })

      return setting
    } catch (error) {
      logger.error('创建基地商品设置失败', { error, baseId, data })
      throw error
    }
  }

  /**
   * 更新基地商品设置
   */
  static async update(baseId: number, settingId: string, data: Partial<Omit<GoodsLocalSettingData, 'goodsId'>>) {
    try {
      const existingSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          id: settingId,
          baseId: baseId
        }
      })

      if (!existingSetting) {
        throw new Error(`商品设置 ${settingId} 不存在`)
      }

      const setting = await prisma.goodsLocalSetting.update({
        where: { id: settingId },
        data: {
          ...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
          ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
          ...(data.packPrice !== undefined && { packPrice: data.packPrice }),
          ...(data.alias !== undefined && { alias: data.alias }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        include: {
          goods: true,
          base: true
        }
      })

      logger.info('基地商品设置更新成功', {
        settingId: setting.id,
        baseId: baseId
      })

      return setting
    } catch (error) {
      logger.error('更新基地商品设置失败', { error, baseId, settingId, data })
      throw error
    }
  }

  /**
   * 删除基地商品设置
   */
  static async delete(baseId: number, settingId: string) {
    try {
      const existingSetting = await prisma.goodsLocalSetting.findFirst({
        where: {
          id: settingId,
          baseId: baseId
        }
      })

      if (!existingSetting) {
        throw new Error(`商品设置 ${settingId} 不存在`)
      }

      await prisma.goodsLocalSetting.delete({
        where: { id: settingId }
      })

      logger.info('基地商品设置删除成功', {
        settingId: settingId,
        baseId: baseId
      })

      return true
    } catch (error) {
      logger.error('删除基地商品设置失败', { error, baseId, settingId })
      throw error
    }
  }

  /**
   * 获取单个基地商品设置
   */
  static async getById(baseId: number, settingId: string) {
    const setting = await prisma.goodsLocalSetting.findFirst({
      where: {
        id: settingId,
        baseId: baseId
      },
      include: {
        goods: true,
        base: true
      }
    })

    if (!setting) {
      throw new Error(`商品设置 ${settingId} 不存在`)
    }

    return setting
  }

  /**
   * 根据商品ID获取基地商品设置
   */
  static async getByGoodsId(baseId: number, goodsId: string) {
    const setting = await prisma.goodsLocalSetting.findUnique({
      where: {
        goodsId_baseId: {
          goodsId: goodsId,
          baseId: baseId
        }
      },
      include: {
        goods: true,
        base: true
      }
    })

    return setting
  }

  /**
   * 获取基地商品设置列表
   */
  static async list(baseId: number, params: GoodsLocalSettingQueryParams) {
    const {
      page = 1,
      pageSize = 20,
      search,
      manufacturer,
      isActive
    } = params

    const where: any = {
      baseId: baseId
    }

    // 搜索条件需要通过关联的 goods 表
    const goodsWhere: any = {}
    
    if (search) {
      goodsWhere.OR = buildGoodsSearchConditions(search)
    }

    if (manufacturer) {
      goodsWhere.manufacturer = { contains: manufacturer, mode: 'insensitive' }
    }

    if (Object.keys(goodsWhere).length > 0) {
      where.goods = goodsWhere
    }

    if (isActive !== undefined) {
      where.isActive = isActive === true || String(isActive) === 'true'
    }

    const [total, data] = await Promise.all([
      prisma.goodsLocalSetting.count({ where }),
      prisma.goodsLocalSetting.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          goods: {
            include: {
              category: true
            }
          }
        }
      })
    ])

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }

  /**
   * 获取基地可用商品列表（用于采购、到货等业务）
   * 返回商品信息 + 基地级价格配置
   */
  static async getAvailableGoods(baseId: number, params?: { search?: string; isActive?: boolean }) {
    const where: any = {
      baseId: baseId,
      isActive: true
    }

    if (params?.search) {
      where.goods = {
        OR: buildGoodsSearchConditions(params.search)
      }
    }

    const settings = await prisma.goodsLocalSetting.findMany({
      where,
      include: {
        goods: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        goods: {
          name: 'asc'
        }
      }
    })

    // 转换为业务需要的格式
    return settings.map(setting => ({
      id: setting.goods.id,
      code: setting.goods.code,
      name: setting.goods.name,
      category: setting.goods.category,
      manufacturer: setting.goods.manufacturer,
      packPerBox: setting.goods.packPerBox,
      piecePerPack: setting.goods.piecePerPack,
      // 基地级配置
      retailPrice: setting.retailPrice,
      purchasePrice: setting.purchasePrice,
      packPrice: setting.packPrice,
      alias: setting.alias,
      isActive: setting.isActive,
      settingId: setting.id
    }))
  }
}
