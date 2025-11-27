import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 商品成本服务
 * 管理商品的移动加权平均成本
 */
export class GoodsCostService {
  /**
   * 获取商品的平均成本
   */
  static async getAverageCost(goodsId: string, baseId: number): Promise<number> {
    try {
      const inventory = await prisma.inventory.findUnique({
        where: {
          goodsId_baseId: { goodsId, baseId }
        }
      });
      return inventory ? Number(inventory.averageCost) : 0;
    } catch (error) {
      logger.error('获取商品平均成本失败', { error, goodsId, baseId });
      throw error;
    }
  }

  /**
   * 更新商品的平均成本（到货时调用）
   * 使用移动加权平均法：
   * 新平均成本 = (旧平均成本 × 旧库存 + 新到货成本 × 到货数量) / (旧库存 + 到货数量)
   * 
   * @param goodsId 商品ID
   * @param baseId 基地ID
   * @param arrivalCost 到货单价（每箱）
   * @param arrivalQuantity 到货数量（箱）
   * @param currentStock 当前库存数量（箱）- 需要从流水表计算得出
   */
  static async updateAverageCost(
    goodsId: string,
    baseId: number,
    arrivalCost: number,
    arrivalQuantity: number,
    currentStock: number
  ): Promise<number> {
    try {
      // 获取当前平均成本
      const currentAvgCost = await this.getAverageCost(goodsId, baseId);
      
      // 计算新的平均成本
      let newAvgCost: number;
      if (currentStock === 0) {
        // 如果当前库存为0，直接使用到货成本
        newAvgCost = arrivalCost;
      } else {
        // 移动加权平均
        newAvgCost = (currentAvgCost * currentStock + arrivalCost * arrivalQuantity) / (currentStock + arrivalQuantity);
      }

      // 更新或创建记录
      await prisma.inventory.upsert({
        where: {
          goodsId_baseId: { goodsId, baseId }
        },
        update: {
          averageCost: new Decimal(newAvgCost.toFixed(2))
        },
        create: {
          goodsId,
          baseId,
          averageCost: new Decimal(newAvgCost.toFixed(2))
        }
      });

      logger.info('更新商品平均成本成功', {
        goodsId,
        baseId,
        oldAvgCost: currentAvgCost,
        newAvgCost,
        arrivalCost,
        arrivalQuantity,
        currentStock
      });

      return newAvgCost;
    } catch (error) {
      logger.error('更新商品平均成本失败', { error, goodsId, baseId });
      throw error;
    }
  }

  /**
   * 批量获取商品的平均成本
   */
  static async getBatchAverageCost(goodsIds: string[], baseId: number): Promise<Map<string, number>> {
    try {
      const inventories = await prisma.inventory.findMany({
        where: {
          goodsId: { in: goodsIds },
          baseId
        }
      });

      const costMap = new Map<string, number>();
      for (const inv of inventories) {
        costMap.set(inv.goodsId, Number(inv.averageCost));
      }
      
      // 对于没有记录的商品，返回0
      for (const goodsId of goodsIds) {
        if (!costMap.has(goodsId)) {
          costMap.set(goodsId, 0);
        }
      }

      return costMap;
    } catch (error) {
      logger.error('批量获取商品平均成本失败', { error, goodsIds, baseId });
      throw error;
    }
  }

  /**
   * 获取基地所有商品的成本列表
   */
  static async getBaseCostList(baseId: number) {
    try {
      const inventories = await prisma.inventory.findMany({
        where: { baseId },
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return inventories.map(inv => ({
        goodsId: inv.goodsId,
        goodsCode: inv.goods.code,
        goodsName: inv.goods.name,
        averageCost: Number(inv.averageCost),
        updatedAt: inv.updatedAt
      }));
    } catch (error) {
      logger.error('获取基地商品成本列表失败', { error, baseId });
      throw error;
    }
  }
}
