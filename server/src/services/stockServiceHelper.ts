/**
 * 库存服务辅助方法
 * 将计算所有库存的逻辑提取到独立文件，避免文件过大
 */

import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { StockService } from './stockService';

export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

export interface StockCacheItem {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  goodsNameI18n: NameI18n | null;
  categoryCode: string;
  categoryName: string;
  categoryNameI18n: NameI18n | null;
  packPerBox: number;
  piecePerPack: number;
  stockBox: number;
  stockPack: number;
  stockPiece: number;
  warehouseNames: string;
  isLowStock: boolean;
  avgPricePerBox: number;
  avgPricePerPack: number;
  avgPricePerPiece: number;
  totalValue: number;
}

/**
 * 计算基地所有商品的库存
 * 这是一个耗时操作，会计算所有商品在所有仓库的库存
 */
export async function calculateAllStock(
  baseId: number,
  locationId?: number
): Promise<StockCacheItem[]> {
  logger.info('开始计算所有商品库存', { baseId, locationId });
  const startTime = Date.now();

  // 获取所有符合条件的商品
  const goodsWhere: any = {
    localSettings: {
      some: {
        baseId,
        isActive: true,
      },
    },
  };

  const allGoods = await prisma.goods.findMany({
    where: goodsWhere,
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      nameI18n: true,
      packPerBox: true,
      piecePerPack: true,
      category: {
        select: {
          code: true,
          name: true,
          nameI18n: true,
        },
      },
    },
  });

  // 获取仓库列表
  let locations: { id: number; name: string }[];
  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true },
    });
    locations = location ? [location] : [];
  } else {
    locations = await prisma.location.findMany({
      where: { baseId, isActive: true, type: { in: ['MAIN_WAREHOUSE', 'WAREHOUSE'] } },
      select: { id: true, name: true },
    });
  }

  const results: StockCacheItem[] = [];

  for (const goods of allGoods) {
    let totalBox = 0;
    let totalPack = 0;
    let totalPiece = 0;
    const warehouseNames: string[] = [];

    // 汇总所有仓库的库存
    for (const loc of locations) {
      const stock = await StockService.getStock(baseId, goods.id, loc.id);
      if (stock.currentBox > 0 || stock.currentPack > 0 || stock.currentPiece > 0) {
        warehouseNames.push(loc.name);
      }
      totalBox += stock.currentBox;
      totalPack += stock.currentPack;
      totalPiece += stock.currentPiece;
    }

    // 如果指定了仓库筛选，且该商品在该仓库没有库存，则跳过
    if (locationId && warehouseNames.length === 0) {
      continue;
    }

    // 获取平均成本
    let avgCostPerBox = 0;
    const inventory = await prisma.inventory.findFirst({
      where: { goodsId: goods.id, baseId },
      select: { averageCost: true },
    });

    if (inventory?.averageCost) {
      avgCostPerBox = Number(inventory.averageCost);
    } else {
      // 如果没有inventory记录，尝试从最近的到货记录关联的采购单获取单价
      const latestArrival = await prisma.arrivalRecord.findFirst({
        where: { goodsId: goods.id, baseId },
        orderBy: { createdAt: 'desc' },
        include: {
          purchaseOrder: {
            include: { items: true }
          }
        }
      });
      if (latestArrival?.purchaseOrder?.items) {
        const purchaseItem = latestArrival.purchaseOrder.items.find(
          item => item.goodsId === goods.id
        );
        if (purchaseItem) {
          avgCostPerBox = Number(purchaseItem.unitPrice) || 0;
        }
      }
    }

    const packPerBox = goods.packPerBox || 1;
    const piecePerPack = goods.piecePerPack || 1;
    const avgCostPerPack = avgCostPerBox / packPerBox;
    const avgCostPerPiece = avgCostPerPack / piecePerPack;

    // 计算总价值（转换为箱计算）
    const totalBoxEquivalent = totalBox + totalPack / packPerBox + totalPiece / (packPerBox * piecePerPack);
    const totalValue = totalBoxEquivalent * avgCostPerBox;

    // 判断库存是否不足
    const isLowStock = await StockService.isLowStock(
      baseId,
      goods.id,
      totalBox,
      totalPack,
      totalPiece,
      packPerBox,
      piecePerPack
    );

    results.push({
      goodsId: goods.id,
      goodsCode: goods.code,
      goodsName: typeof goods.name === 'string' ? goods.name : (goods.name as any)?.zh_CN || '',
      goodsNameI18n: goods.nameI18n as NameI18n | null,
      categoryCode: goods.category?.code || '',
      categoryName: goods.category?.name || '',
      categoryNameI18n: (goods.category as any)?.nameI18n as NameI18n | null,
      packPerBox,
      piecePerPack,
      stockBox: totalBox,
      stockPack: totalPack,
      stockPiece: totalPiece,
      warehouseNames: warehouseNames.join(', '),
      isLowStock,
      avgPricePerBox: Math.round(avgCostPerBox * 100) / 100,
      avgPricePerPack: Math.round(avgCostPerPack * 100) / 100,
      avgPricePerPiece: Math.round(avgCostPerPiece * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
    });
  }

  const duration = Date.now() - startTime;
  logger.info('完成计算所有商品库存', { 
    baseId, 
    locationId, 
    count: results.length, 
    duration: `${duration}ms` 
  });

  return results;
}
