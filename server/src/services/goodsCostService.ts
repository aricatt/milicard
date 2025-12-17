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
   * 新平均成本 = (旧平均成本 × 旧库存 + 采购单价 × 到货数量 + 物流费用) / (旧库存 + 到货数量)
   * 
   * @param goodsId 商品ID
   * @param baseId 基地ID
   * @param arrivalCost 到货单价（每箱）
   * @param arrivalQuantity 到货数量（箱）
   * @param currentStock 当前库存数量（箱）- 需要从流水表计算得出
   * @param logisticsFee 物流费用（基地货币，可选，默认0）
   */
  static async updateAverageCost(
    goodsId: string,
    baseId: number,
    arrivalCost: number,
    arrivalQuantity: number,
    currentStock: number,
    logisticsFee: number = 0
  ): Promise<number> {
    try {
      // 获取当前平均成本
      const currentAvgCost = await this.getAverageCost(goodsId, baseId);
      
      // 计算新的平均成本（含物流费用）
      // 公式：新平均成本 = (旧平均成本 × 旧库存 + 采购单价 × 到货数量 + 物流费用) / (旧库存 + 到货数量)
      let newAvgCost: number;
      if (currentStock === 0 && arrivalQuantity === 0) {
        newAvgCost = 0;
      } else if (currentStock === 0) {
        // 如果当前库存为0，计算本次到货的单位成本（含物流费用）
        newAvgCost = (arrivalCost * arrivalQuantity + logisticsFee) / arrivalQuantity;
      } else {
        // 移动加权平均（含物流费用）
        newAvgCost = (currentAvgCost * currentStock + arrivalCost * arrivalQuantity + logisticsFee) / (currentStock + arrivalQuantity);
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
   * 重新计算商品的平均成本（删除到货记录后调用）
   * 基于所有剩余到货记录重新计算加权平均成本
   * 公式：平均成本 = Σ(采购单价 × 到货数量 + 物流费用) / Σ(到货数量)
   * 
   * @param goodsId 商品ID
   * @param baseId 基地ID
   */
  static async recalculateAverageCost(
    goodsId: string,
    baseId: number
  ): Promise<number> {
    try {
      // 获取商品的拆分关系
      const goods = await prisma.goods.findUnique({
        where: { id: goodsId },
        select: { packPerBox: true, piecePerPack: true }
      });
      const packPerBox = goods?.packPerBox || 1;
      const piecePerPack = goods?.piecePerPack || 1;

      // 查询该商品所有到货记录，关联采购单获取单价
      const arrivalRecords = await prisma.arrivalRecord.findMany({
        where: {
          goodsId,
          baseId
        },
        include: {
          purchaseOrder: {
            include: {
              items: true
            }
          }
        }
      });

      // 如果没有到货记录，将平均成本设为0
      if (arrivalRecords.length === 0) {
        await prisma.inventory.upsert({
          where: {
            goodsId_baseId: { goodsId, baseId }
          },
          update: {
            averageCost: new Decimal(0)
          },
          create: {
            goodsId,
            baseId,
            averageCost: new Decimal(0)
          }
        });

        logger.info('商品无到货记录，平均成本重置为0', {
          goodsId,
          baseId,
          service: 'milicard-api'
        });

        return 0;
      }

      // 计算总成本和总数量（箱等效数量）
      let totalCost = 0;
      let totalBoxEquivalent = 0;

      for (const record of arrivalRecords) {
        const boxQty = record.boxQuantity || 0;
        const packQty = record.packQuantity || 0;
        const pieceQty = record.pieceQuantity || 0;
        const logisticsFee = Number(record.logisticsFee) || 0;
        
        // 将盒和包转换为箱等效数量
        const boxEquivalent = boxQty + packQty / packPerBox + pieceQty / (packPerBox * piecePerPack);
        
        // 从采购单明细中获取单价（每箱）
        const purchaseItem = record.purchaseOrder?.items?.find(
          item => item.goodsId === goodsId
        );
        const unitPricePerBox = purchaseItem ? Number(purchaseItem.unitPrice) : 0;

        // 累加：采购单价 × 箱等效数量 + 物流费用
        totalCost += unitPricePerBox * boxEquivalent + logisticsFee;
        totalBoxEquivalent += boxEquivalent;
      }

      // 计算新的平均成本（每箱）
      const newAvgCost = totalBoxEquivalent > 0 ? totalCost / totalBoxEquivalent : 0;

      // 更新记录
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

      logger.info('商品平均成本重新计算成功', {
        goodsId,
        baseId,
        recordCount: arrivalRecords.length,
        totalCost,
        totalBoxEquivalent,
        newAvgCost,
        packPerBox,
        piecePerPack,
        service: 'milicard-api'
      });

      return newAvgCost;
    } catch (error) {
      logger.error('重新计算商品平均成本失败', { error, goodsId, baseId });
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
   * 重新计算基地所有商品的平均成本（修复历史数据）
   * 基于所有到货记录重新计算每个商品的加权平均成本
   * 
   * @param baseId 基地ID
   * @returns 更新的商品数量
   */
  static async recalculateAllAverageCosts(baseId: number): Promise<number> {
    try {
      // 获取该基地所有有到货记录的商品ID
      const goodsWithArrivals = await prisma.arrivalRecord.findMany({
        where: { baseId },
        select: { goodsId: true },
        distinct: ['goodsId']
      });

      const goodsIds = goodsWithArrivals.map(g => g.goodsId);
      let updatedCount = 0;

      for (const goodsId of goodsIds) {
        try {
          await this.recalculateAverageCost(goodsId, baseId);
          updatedCount++;
        } catch (error) {
          logger.error('重新计算单个商品平均成本失败', {
            error: error instanceof Error ? error.message : String(error),
            goodsId,
            baseId
          });
        }
      }

      logger.info('基地所有商品平均成本重新计算完成', {
        baseId,
        totalGoods: goodsIds.length,
        updatedCount,
        service: 'milicard-api'
      });

      return updatedCount;
    } catch (error) {
      logger.error('重新计算基地所有商品平均成本失败', { error, baseId });
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
