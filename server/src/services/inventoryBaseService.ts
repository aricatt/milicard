import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 基地感知的库存服务类
 * 处理特定基地的库存管理
 */
export class InventoryBaseService {
  /**
   * 获取基地的库存列表
   */
  static async getBaseInventoryList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, goodsCode, goodsName, locationId } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询条件 - 只查询该基地的库存
      const where: any = {
        baseId: baseId
      };

      // 商品编码过滤
      if (goodsCode) {
        where.goods = {
          code: {
            contains: goodsCode,
            mode: 'insensitive'
          }
        };
      }

      // 商品名称过滤
      if (goodsName) {
        where.goods = {
          ...where.goods,
          name: {
            contains: goodsName,
            mode: 'insensitive'
          }
        };
      }

      // 位置过滤
      if (locationId) {
        where.locationId = locationId;
      }

      // 查询库存和总数
      const [inventories, total] = await Promise.all([
        prisma.inventory.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                boxQuantity: true,
                packPerBox: true,
                piecePerPack: true
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true
              }
            },
            base: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        }),
        prisma.inventory.count({ where })
      ]);

      // 转换数据格式
      const data = inventories.map(inventory => ({
        id: inventory.id,
        goodsId: inventory.goodsId,
        locationId: inventory.locationId,
        baseId: inventory.baseId,
        stockQuantity: inventory.stockQuantity,
        averageCost: inventory.averageCost,
        updatedAt: inventory.updatedAt.toISOString(),
        goods: inventory.goods,
        location: inventory.location,
        base: inventory.base,
        // 计算库存价值
        totalValue: inventory.stockQuantity * Number(inventory.averageCost)
      }));

      logger.info('获取基地库存列表成功', {
        service: 'milicard-api',
        baseId,
        count: data.length,
        total
      });

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取基地库存列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地的位置列表（用于库存管理）
   */
  static async getBaseLocations(baseId: number) {
    try {
      const locations = await prisma.location.findMany({
        where: {
          baseId: baseId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          address: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      logger.info('获取基地位置列表成功', {
        service: 'milicard-api',
        baseId,
        count: locations.length
      });

      return {
        success: true,
        data: locations
      };
    } catch (error) {
      logger.error('获取基地位置列表失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 初始化商品在基地位置的库存
   */
  static async initializeInventory(baseId: number, goodsId: string, locationId: string, initialStock: number = 0) {
    try {
      // 检查基地是否存在
      const base = await prisma.base.findUnique({
        where: { id: baseId }
      });

      if (!base) {
        throw new Error('基地不存在');
      }

      // 检查商品是否存在
      const goods = await prisma.goods.findUnique({
        where: { id: goodsId }
      });

      if (!goods) {
        throw new Error('商品不存在');
      }

      // 检查位置是否存在且属于该基地
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          baseId: baseId
        }
      });

      if (!location) {
        throw new Error('位置不存在或不属于该基地');
      }

      // 检查库存是否已存在
      const existingInventory = await prisma.inventory.findUnique({
        where: {
          goodsId_locationId: {
            goodsId,
            locationId
          }
        }
      });

      if (existingInventory) {
        throw new Error('该商品在该位置的库存已存在');
      }

      // 创建库存记录
      const inventory = await prisma.inventory.create({
        data: {
          goodsId,
          locationId,
          baseId,
          stockQuantity: initialStock,
          averageCost: 0
        }
      });

      logger.info('初始化库存成功', {
        service: 'milicard-api',
        baseId,
        goodsId,
        locationId,
        initialStock
      });

      return {
        success: true,
        data: inventory
      };
    } catch (error) {
      logger.error('初始化库存失败', { error, baseId, goodsId, locationId, initialStock, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地库存统计
   */
  static async getBaseInventoryStats(baseId: number) {
    try {
      // 获取库存统计
      const stats = await prisma.inventory.aggregate({
        where: { baseId },
        _count: {
          id: true
        },
        _sum: {
          stockQuantity: true
        }
      });

      // 获取商品种类数
      const uniqueGoods = await prisma.inventory.groupBy({
        by: ['goodsId'],
        where: { baseId }
      });

      // 获取位置数
      const uniqueLocations = await prisma.inventory.groupBy({
        by: ['locationId'],
        where: { baseId }
      });

      // 计算总库存价值
      const inventories = await prisma.inventory.findMany({
        where: { baseId },
        select: {
          stockQuantity: true,
          averageCost: true
        }
      });

      const totalValue = inventories.reduce((sum, inv) => {
        return sum + (inv.stockQuantity * Number(inv.averageCost));
      }, 0);

      const result = {
        totalItems: stats._count.id || 0,
        totalQuantity: stats._sum.stockQuantity || 0,
        uniqueGoods: uniqueGoods.length,
        uniqueLocations: uniqueLocations.length,
        totalValue: totalValue
      };

      logger.info('获取基地库存统计成功', {
        service: 'milicard-api',
        baseId,
        stats: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地库存统计失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 调整库存数量（简单版本）
   */
  static async adjustInventory(baseId: number, inventoryId: string, newQuantity: number, reason: string = '') {
    try {
      // 检查库存是否存在且属于该基地
      const inventory = await prisma.inventory.findFirst({
        where: {
          id: inventoryId,
          baseId: baseId
        }
      });

      if (!inventory) {
        throw new Error('库存记录不存在或不属于该基地');
      }

      // 更新库存数量
      const updatedInventory = await prisma.inventory.update({
        where: { id: inventoryId },
        data: {
          stockQuantity: newQuantity,
          updatedAt: new Date()
        }
      });

      logger.info('调整库存成功', {
        service: 'milicard-api',
        baseId,
        inventoryId,
        oldQuantity: inventory.stockQuantity,
        newQuantity,
        reason
      });

      return {
        success: true,
        data: updatedInventory
      };
    } catch (error) {
      logger.error('调整库存失败', { error, baseId, inventoryId, newQuantity, reason, service: 'milicard-api' });
      throw error;
    }
  }
}
