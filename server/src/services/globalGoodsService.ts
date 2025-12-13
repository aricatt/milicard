import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import { CodeGenerator } from '../utils/codeGenerator'

/**
 * 全局商品数据类型
 */
export interface GlobalGoodsData {
  code?: string
  name: string
  categoryId?: number
  manufacturer: string
  description?: string
  boxQuantity?: number
  packPerBox: number
  piecePerPack: number
  imageUrl?: string
  notes?: string
  isActive?: boolean
}

export interface GlobalGoodsQueryParams {
  page?: number
  pageSize?: number
  search?: string
  manufacturer?: string
  categoryId?: number
  isActive?: boolean
}

/**
 * 全局商品服务 - 管理商品的通用属性
 */
export class GlobalGoodsService {
  /**
   * 创建全局商品
   */
  static async create(data: GlobalGoodsData, userId: string) {
    try {
      // 自动生成商品编号 (如果未提供)
      let goodsCode = data.code
      if (!goodsCode) {
        goodsCode = await CodeGenerator.generateGoodsCode()
      }

      // 检查商品编码是否已存在
      const existingGoods = await prisma.goods.findUnique({
        where: { code: goodsCode }
      })

      if (existingGoods) {
        throw new Error(`商品编码 ${goodsCode} 已存在`)
      }

      // 创建商品
      const goods = await prisma.goods.create({
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
          isActive: data.isActive ?? true,
          createdBy: userId,
          updatedBy: userId
        }
      })

      logger.info('全局商品创建成功', {
        goodsId: goods.id,
        code: goods.code,
        name: goods.name,
        userId
      })

      return goods
    } catch (error) {
      logger.error('创建全局商品失败', { error, data })
      throw error
    }
  }

  /**
   * 更新全局商品
   */
  static async update(id: string, data: Partial<GlobalGoodsData>, userId: string) {
    try {
      const existingGoods = await prisma.goods.findUnique({
        where: { id }
      })

      if (!existingGoods) {
        throw new Error(`商品 ${id} 不存在`)
      }

      const goods = await prisma.goods.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
          ...(data.manufacturer && { manufacturer: data.manufacturer }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.packPerBox && { packPerBox: data.packPerBox }),
          ...(data.piecePerPack && { piecePerPack: data.piecePerPack }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          updatedBy: userId
        }
      })

      logger.info('全局商品更新成功', {
        goodsId: goods.id,
        code: goods.code,
        userId
      })

      return goods
    } catch (error) {
      logger.error('更新全局商品失败', { error, id, data })
      throw error
    }
  }

  /**
   * 删除全局商品
   */
  static async delete(id: string) {
    try {
      const existingGoods = await prisma.goods.findUnique({
        where: { id },
        include: {
          localSettings: true
        }
      })

      if (!existingGoods) {
        throw new Error(`商品 ${id} 不存在`)
      }

      // 检查是否有基地在使用该商品
      if (existingGoods.localSettings.length > 0) {
        throw new Error(`该商品已被 ${existingGoods.localSettings.length} 个基地使用，无法删除`)
      }

      await prisma.goods.delete({
        where: { id }
      })

      logger.info('全局商品删除成功', {
        goodsId: id,
        code: existingGoods.code
      })

      return true
    } catch (error) {
      logger.error('删除全局商品失败', { error, id })
      throw error
    }
  }

  /**
   * 获取单个全局商品
   */
  static async getById(id: string) {
    const goods = await prisma.goods.findUnique({
      where: { id },
      include: {
        localSettings: {
          include: {
            base: true
          }
        }
      }
    })

    if (!goods) {
      throw new Error(`商品 ${id} 不存在`)
    }

    return goods
  }

  /**
   * 获取全局商品列表
   */
  static async list(params: GlobalGoodsQueryParams) {
    const {
      page = 1,
      pageSize = 20,
      search,
      manufacturer,
      categoryId,
      isActive
    } = params

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (manufacturer) {
      where.manufacturer = { contains: manufacturer, mode: 'insensitive' }
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (isActive !== undefined) {
      where.isActive = isActive === true || String(isActive) === 'true'
    }

    const [total, data] = await Promise.all([
      prisma.goods.count({ where }),
      prisma.goods.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true
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
   * 获取所有厂家列表（去重）
   */
  static async getManufacturers(): Promise<string[]> {
    const result = await prisma.goods.findMany({
      select: {
        manufacturer: true
      },
      distinct: ['manufacturer'],
      where: {
        isActive: true
      },
      orderBy: {
        manufacturer: 'asc'
      }
    })

    return result.map(item => item.manufacturer)
  }
}
