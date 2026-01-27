/**
 * 统一库存服务
 * 
 * 库存计算公式：
 * 当前库存 = 到货总量 + 调入总量 - 调出总量 - 出库总量 - 消耗总量
 * 
 * 数据来源：
 * - 到货：ArrivalRecord (arrivalRecords)
 * - 调入：TransferRecord (destinationLocationId = 当前仓库)
 * - 调出：TransferRecord (sourceLocationId = 当前仓库)
 * - 出库：StockOut (stockOuts)
 * - 消耗：StockConsumption (stockConsumptions)
 */

import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { buildGoodsSearchConditions } from '../utils/multilingualHelper';
import { StockThreshold } from '../types/goods';
import { calculateAllStock } from './stockServiceHelper';

export interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 库存缓存接口
interface StockCacheItem {
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

interface StockCache {
  baseId: number;
  locationId?: number;
  data: StockCacheItem[];
  lastUpdated: Date;
  expiresAt: Date;
}

export interface StockInfo {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  goodsNameI18n?: NameI18n | null;
  categoryCode?: string;
  categoryName?: string;
  packPerBox: number;
  piecePerPack: number;
  locationId: number;
  locationName: string;
  // 库存数量（以盒为单位）
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  // 转换为总盒数
  totalPacks: number;
  // 平均成本
  averageCost: number;
}

export interface StockSummary {
  // 到货
  arrivalBox: number;
  arrivalPack: number;
  arrivalPiece: number;
  // 调入
  transferInBox: number;
  transferInPack: number;
  transferInPiece: number;
  // 调出
  transferOutBox: number;
  transferOutPack: number;
  transferOutPiece: number;
  // 出库
  stockOutBox: number;
  stockOutPack: number;
  stockOutPiece: number;
  // 消耗
  consumptionBox: number;
  consumptionPack: number;
  consumptionPiece: number;
  // 当前库存
  currentBox: number;
  currentPack: number;
  currentPiece: number;
  totalPacks: number;
}

export class StockService {
  // 库存缓存存储（内存缓存，按baseId+locationId组合键存储）
  private static stockCache: Map<string, StockCache> = new Map();
  // 缓存有效期：10分钟
  private static CACHE_TTL_MS = 10 * 60 * 1000;

  /**
   * 生成缓存键
   */
  private static getCacheKey(baseId: number, locationId?: number): string {
    return locationId ? `${baseId}-${locationId}` : `${baseId}`;
  }

  /**
   * 检查缓存是否有效
   */
  private static isCacheValid(cache: StockCache): boolean {
    return new Date() < cache.expiresAt;
  }

  /**
   * 清除指定基地的缓存
   */
  static clearCache(baseId: number, locationId?: number): void {
    const key = this.getCacheKey(baseId, locationId);
    this.stockCache.delete(key);
    logger.info('库存缓存已清除', { baseId, locationId });
  }

  /**
   * 清除所有缓存
   */
  static clearAllCache(): void {
    this.stockCache.clear();
    logger.info('所有库存缓存已清除');
  }

  /**
   * 获取指定商品在指定仓库的当前库存
   * 这是最核心的库存查询接口
   */
  static async getStock(
    baseId: number,
    goodsId: string,
    locationId: number
  ): Promise<StockSummary> {
    try {
      // 并行查询各类库存变动
      const [
        arrivalSum,
        transferInSum,
        transferOutSum,
        stockOutSum,
        consumptionSum,
        goods
      ] = await Promise.all([
        // 到货总量
        prisma.arrivalRecord.aggregate({
          where: { baseId, goodsId, locationId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true,
          },
        }),
        // 调入总量（目标仓库是当前仓库）
        prisma.transferRecord.aggregate({
          where: { baseId, goodsId, destinationLocationId: locationId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true,
          },
        }),
        // 调出总量（源仓库是当前仓库）
        prisma.transferRecord.aggregate({
          where: { baseId, goodsId, sourceLocationId: locationId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true,
          },
        }),
        // 出库总量
        prisma.stockOut.aggregate({
          where: { baseId, goodsId, locationId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true,
          },
        }),
        // 消耗总量
        prisma.stockConsumption.aggregate({
          where: { baseId, goodsId, locationId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true,
          },
        }),
        // 商品信息
        prisma.goods.findUnique({
          where: { id: goodsId },
          select: { packPerBox: true, piecePerPack: true },
        }),
      ]);

      const packPerBox = goods?.packPerBox || 1;
      const piecePerPack = goods?.piecePerPack || 1;

      // 提取各项数值
      const arrival = {
        box: arrivalSum._sum.boxQuantity || 0,
        pack: arrivalSum._sum.packQuantity || 0,
        piece: arrivalSum._sum.pieceQuantity || 0,
      };
      const transferIn = {
        box: transferInSum._sum.boxQuantity || 0,
        pack: transferInSum._sum.packQuantity || 0,
        piece: transferInSum._sum.pieceQuantity || 0,
      };
      const transferOut = {
        box: transferOutSum._sum.boxQuantity || 0,
        pack: transferOutSum._sum.packQuantity || 0,
        piece: transferOutSum._sum.pieceQuantity || 0,
      };
      const stockOut = {
        box: stockOutSum._sum.boxQuantity || 0,
        pack: stockOutSum._sum.packQuantity || 0,
        piece: stockOutSum._sum.pieceQuantity || 0,
      };
      const consumption = {
        box: consumptionSum._sum.boxQuantity || 0,
        pack: consumptionSum._sum.packQuantity || 0,
        piece: consumptionSum._sum.pieceQuantity || 0,
      };

      // 计算当前库存（原始值）
      let currentBox = arrival.box + transferIn.box - transferOut.box - stockOut.box - consumption.box;
      let currentPack = arrival.pack + transferIn.pack - transferOut.pack - stockOut.pack - consumption.pack;
      let currentPiece = arrival.piece + transferIn.piece - transferOut.piece - stockOut.piece - consumption.piece;

      // 转换为总盒数（标准化）- 用于计算总量
      const totalPacks = currentBox * packPerBox + currentPack + Math.floor(currentPiece / piecePerPack);

      // 标准化库存显示：处理负数借位
      // 包数为负时，向盒数借位
      if (currentPiece < 0) {
        const borrowPacks = Math.ceil(Math.abs(currentPiece) / piecePerPack);
        currentPack -= borrowPacks;
        currentPiece += borrowPacks * piecePerPack;
      }
      // 盒数为负时，向箱数借位
      if (currentPack < 0) {
        const borrowBoxes = Math.ceil(Math.abs(currentPack) / packPerBox);
        currentBox -= borrowBoxes;
        currentPack += borrowBoxes * packPerBox;
      }

      return {
        arrivalBox: arrival.box,
        arrivalPack: arrival.pack,
        arrivalPiece: arrival.piece,
        transferInBox: transferIn.box,
        transferInPack: transferIn.pack,
        transferInPiece: transferIn.piece,
        transferOutBox: transferOut.box,
        transferOutPack: transferOut.pack,
        transferOutPiece: transferOut.piece,
        stockOutBox: stockOut.box,
        stockOutPack: stockOut.pack,
        stockOutPiece: stockOut.piece,
        consumptionBox: consumption.box,
        consumptionPack: consumption.pack,
        consumptionPiece: consumption.piece,
        currentBox,
        currentPack,
        currentPiece,
        totalPacks,
      };
    } catch (error) {
      logger.error('获取库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        goodsId,
        locationId,
      });
      throw error;
    }
  }

  /**
   * 获取指定商品在所有仓库的库存汇总
   */
  static async getGoodsStockByLocations(
    baseId: number,
    goodsId: string
  ): Promise<{ locationId: number; locationName: string; stock: StockSummary }[]> {
    try {
      // 获取基地的所有仓库
      const locations = await prisma.location.findMany({
        where: { baseId, isActive: true },
        select: { id: true, name: true },
      });

      const results = [];
      for (const location of locations) {
        const stock = await this.getStock(baseId, goodsId, location.id);
        results.push({
          locationId: location.id,
          locationName: location.name,
          stock,
        });
      }

      return results;
    } catch (error) {
      logger.error('获取商品各仓库库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        goodsId,
      });
      throw error;
    }
  }

  /**
   * 获取指定仓库的所有商品库存
   */
  static async getLocationStock(
    baseId: number,
    locationId: number
  ): Promise<StockInfo[]> {
    try {
      // 获取该仓库有库存变动的所有商品
      const goodsWithActivity = await prisma.$queryRaw<{ goodsId: string }[]>`
        SELECT DISTINCT "goods_id" as "goodsId" FROM (
          SELECT "goods_id" FROM "arrival_records" WHERE "base_id" = ${baseId} AND "location_id" = ${locationId}
          UNION
          SELECT "goods_id" FROM "transfer_records" WHERE "base_id" = ${baseId} AND ("source_location_id" = ${locationId} OR "destination_location_id" = ${locationId})
          UNION
          SELECT "goods_id" FROM "stock_outs" WHERE "base_id" = ${baseId} AND "location_id" = ${locationId}
          UNION
          SELECT "goods_id" FROM "stock_consumptions" WHERE "base_id" = ${baseId} AND "location_id" = ${locationId}
        ) AS combined
      `;

      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { name: true },
      });

      const results: StockInfo[] = [];

      for (const { goodsId } of goodsWithActivity) {
        const goods = await prisma.goods.findUnique({
          where: { id: goodsId },
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

        if (!goods) continue;

        const stock = await this.getStock(baseId, goodsId, locationId);

        // 获取平均成本
        const inventory = await prisma.inventory.findFirst({
          where: { goodsId, baseId },
          select: { averageCost: true },
        });

        results.push({
          goodsId: goods.id,
          goodsCode: goods.code,
          goodsName: typeof goods.name === 'string' ? goods.name : (goods.name as any)?.zh_CN || '',
          goodsNameI18n: goods.nameI18n as NameI18n | null,
          categoryCode: goods.category?.code || '',
          categoryName: goods.category?.name || '',
          packPerBox: goods.packPerBox || 1,
          piecePerPack: goods.piecePerPack || 1,
          locationId,
          locationName: location?.name || '',
          boxQuantity: stock.currentBox,
          packQuantity: stock.currentPack,
          pieceQuantity: stock.currentPiece,
          totalPacks: stock.totalPacks,
          averageCost: Number(inventory?.averageCost || 0),
        });
      }

      return results;
    } catch (error) {
      logger.error('获取仓库库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        locationId,
      });
      throw error;
    }
  }

  /**
   * 检查库存是否充足
   */
  static async checkStockSufficient(
    baseId: number,
    goodsId: string,
    locationId: number,
    requiredBox: number,
    requiredPack: number,
    requiredPiece: number = 0
  ): Promise<{ sufficient: boolean; available: StockSummary; required: { box: number; pack: number; piece: number; totalPacks: number } }> {
    const stock = await this.getStock(baseId, goodsId, locationId);

    // 获取商品信息
    const goods = await prisma.goods.findUnique({
      where: { id: goodsId },
      select: { packPerBox: true, piecePerPack: true },
    });

    const packPerBox = goods?.packPerBox || 1;
    const piecePerPack = goods?.piecePerPack || 1;

    // 计算需要的总盒数
    const requiredTotalPacks = requiredBox * packPerBox + requiredPack + Math.floor(requiredPiece / piecePerPack);

    return {
      sufficient: stock.totalPacks >= requiredTotalPacks,
      available: stock,
      required: {
        box: requiredBox,
        pack: requiredPack,
        piece: requiredPiece,
        totalPacks: requiredTotalPacks,
      },
    };
  }

  /**
   * 批量检查多个商品的库存
   */
  static async batchCheckStock(
    baseId: number,
    locationId: number,
    items: { goodsId: string; boxQuantity: number; packQuantity: number; pieceQuantity?: number }[]
  ): Promise<{
    allSufficient: boolean;
    details: {
      goodsId: string;
      goodsName: string;
      sufficient: boolean;
      requiredBox: number;
      requiredPack: number;
      availableBox: number;
      availablePack: number;
    }[];
  }> {
    const details = [];
    let allSufficient = true;

    for (const item of items) {
      const goods = await prisma.goods.findUnique({
        where: { id: item.goodsId },
        select: { name: true },
      });

      const check = await this.checkStockSufficient(
        baseId,
        item.goodsId,
        locationId,
        item.boxQuantity,
        item.packQuantity,
        item.pieceQuantity || 0
      );

      if (!check.sufficient) {
        allSufficient = false;
      }

      details.push({
        goodsId: item.goodsId,
        goodsName: typeof goods?.name === 'string' ? goods.name : (goods?.name as any)?.zh_CN || '',
        sufficient: check.sufficient,
        requiredBox: item.boxQuantity,
        requiredPack: item.packQuantity,
        availableBox: check.available.currentBox,
        availablePack: check.available.currentPack,
      });
    }

    return { allSufficient, details };
  }

  /**
   * 获取基地总仓库（MAIN_WAREHOUSE类型）
   */
  static async getMainWarehouse(baseId: number): Promise<{ id: number; name: string } | null> {
    const mainWarehouse = await prisma.location.findFirst({
      where: {
        baseId,
        type: 'MAIN_WAREHOUSE',
        isActive: true,
      },
      select: { id: true, name: true },
    });

    return mainWarehouse;
  }

  /**
   * 获取基地所有仓库
   */
  static async getWarehouses(baseId: number): Promise<{ id: number; name: string; type: string }[]> {
    const warehouses = await prisma.location.findMany({
      where: {
        baseId,
        isActive: true,
        type: { in: ['MAIN_WAREHOUSE', 'WAREHOUSE'] },
      },
      select: { id: true, name: true, type: true },
      orderBy: [
        { type: 'asc' }, // MAIN_WAREHOUSE 排在前面
        { name: 'asc' },
      ],
    });

    return warehouses;
  }

  /**
   * 获取基地所有商品的实时库存汇总
   * 按商品汇总所有仓库的库存
   * 使用10分钟缓存机制，避免频繁计算
   */
  static async getBaseRealTimeStock(
    baseId: number,
    params?: {
      goodsName?: string;
      goodsCode?: string;
      categoryCode?: string;
      stockStatus?: string;
      locationId?: number;
      stockThreshold?: number;
      stockUnit?: 'box' | 'pack' | 'piece';
      current?: number;
      pageSize?: number;
      sortField?: string;
      sortOrder?: 'ascend' | 'descend';
    }
  ): Promise<{
    data: {
      goodsId: string;
      goodsCode: string;
      goodsName: string;
      packPerBox: number;
      piecePerPack: number;
      // 库存数量
      stockBox: number;
      stockPack: number;
      stockPiece: number;
      // 平均价格
      avgPricePerBox: number;
      avgPricePerPack: number;
      avgPricePerPiece: number;
      // 总价值
      totalValue: number;
    }[];
    total: number;
    lastUpdated: Date;
  }> {
    try {
      const { goodsName, goodsCode, categoryCode, locationId, stockThreshold, stockUnit, current = 1, pageSize = 20 } = params || {};

      // 检查缓存
      const cacheKey = this.getCacheKey(baseId, locationId);
      let cache = this.stockCache.get(cacheKey);
      let allResults: StockCacheItem[] = [];
      let lastUpdated: Date;

      // 如果缓存不存在或已过期，重新计算
      if (!cache || !this.isCacheValid(cache)) {
        logger.info('库存缓存不存在或已过期，开始重新计算', { baseId, locationId });
        allResults = await calculateAllStock(baseId, locationId);
        
        // 更新缓存
        const now = new Date();
        cache = {
          baseId,
          locationId,
          data: allResults,
          lastUpdated: now,
          expiresAt: new Date(now.getTime() + this.CACHE_TTL_MS),
        };
        this.stockCache.set(cacheKey, cache);
        lastUpdated = now;
        logger.info('库存缓存已更新', { baseId, locationId, count: allResults.length });
      } else {
        // 使用缓存数据
        allResults = cache.data;
        lastUpdated = cache.lastUpdated;
        logger.info('使用库存缓存数据', { baseId, locationId, lastUpdated });
      }

      // 从缓存数据中筛选
      let filteredResults = allResults;

      // 应用商品名称筛选
      if (goodsName) {
        const searchLower = goodsName.toLowerCase();
        filteredResults = filteredResults.filter(item => 
          item.goodsName.toLowerCase().includes(searchLower) ||
          item.goodsCode.toLowerCase().includes(searchLower)
        );
      }

      // 应用商品编号筛选
      if (goodsCode) {
        const codeLower = goodsCode.toLowerCase();
        filteredResults = filteredResults.filter(item =>
          item.goodsCode.toLowerCase().includes(codeLower)
        );
      }

      // 应用品类筛选
      if (categoryCode) {
        const categoryCodes = categoryCode.split(',').filter(code => code.trim());
        if (categoryCodes.length > 0) {
          filteredResults = filteredResults.filter(item =>
            categoryCodes.includes(item.categoryCode)
          );
        }
      }

      // 应用状态筛选
      const { stockStatus } = params || {};
      if (stockStatus) {
        const statusList = stockStatus.split(',').filter(s => s.trim());
        if (statusList.length > 0) {
          filteredResults = filteredResults.filter(item => {
            // 判断当前商品的状态
            let currentStatus = '';
            if (item.stockBox === 0 && item.stockPack === 0 && item.stockPiece === 0) {
              currentStatus = 'out_of_stock'; // 无库存
            } else if (item.isLowStock) {
              currentStatus = 'low_stock'; // 库存不足
            } else {
              currentStatus = 'normal'; // 库存充足
            }
            return statusList.includes(currentStatus);
          });
        }
      }

      // 应用库存阈值筛选
      if (stockThreshold !== undefined && stockThreshold > 0 && stockUnit) {
        filteredResults = filteredResults.filter(item => {
          let totalInSelectedUnit = 0;
          const { stockBox, stockPack, stockPiece, packPerBox, piecePerPack } = item;
          
          if (stockUnit === 'box') {
            totalInSelectedUnit = stockBox + stockPack / packPerBox + stockPiece / (packPerBox * piecePerPack);
          } else if (stockUnit === 'pack') {
            totalInSelectedUnit = stockBox * packPerBox + stockPack + stockPiece / piecePerPack;
          } else if (stockUnit === 'piece') {
            totalInSelectedUnit = stockBox * packPerBox * piecePerPack + stockPack * piecePerPack + stockPiece;
          }
          
          return totalInSelectedUnit < stockThreshold;
        });
      }

      // 应用排序
      const { sortField, sortOrder } = params || {};
      if (sortField && sortOrder) {
        filteredResults.sort((a, b) => {
          let compareResult = 0;
          
          if (sortField === 'status') {
            // 状态排序：无库存(0) < 库存不足(1) < 库存充足(2)
            const getStatusPriority = (item: StockCacheItem) => {
              if (item.stockBox === 0 && item.stockPack === 0 && item.stockPiece === 0) {
                return 0; // 无库存
              }
              if (item.isLowStock) {
                return 1; // 库存不足
              }
              return 2; // 库存充足
            };
            compareResult = getStatusPriority(a) - getStatusPriority(b);
          }
          
          // 根据排序方向调整结果
          return sortOrder === 'ascend' ? compareResult : -compareResult;
        });
      }

      // 对筛选和排序后的结果进行分页
      const total = filteredResults.length;
      const startIndex = (current - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);

      return { data: paginatedResults, total, lastUpdated };
    } catch (error) {
      logger.error('获取基地实时库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
      });
      throw error;
    }
  }

  /**
   * 获取基地实时库存统计
   */
  static async getBaseStockStats(baseId: number): Promise<{
    totalGoods: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    try {
      // 获取所有商品 - 商品现在是全局的，通过 localSettings 关联基地
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
        select: { id: true, packPerBox: true, piecePerPack: true },
      });

      // 获取所有仓库
      const locations = await prisma.location.findMany({
        where: { baseId, isActive: true, type: { in: ['MAIN_WAREHOUSE', 'WAREHOUSE'] } },
        select: { id: true },
      });

      let totalValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      for (const goods of allGoods) {
        let totalBox = 0;
        let totalPack = 0;
        let totalPiece = 0;

        for (const loc of locations) {
          const stock = await this.getStock(baseId, goods.id, loc.id);
          totalBox += stock.currentBox;
          totalPack += stock.currentPack;
          totalPiece += stock.currentPiece;
        }

        const packPerBox = goods.packPerBox || 1;
        const piecePerPack = goods.piecePerPack || 1;

        // 检查是否无库存
        if (totalBox === 0 && totalPack === 0 && totalPiece === 0) {
          outOfStockCount++;
        } else {
          // 使用 isLowStock 方法判断库存不足
          const isLow = await this.isLowStock(
            baseId,
            goods.id,
            totalBox,
            totalPack,
            totalPiece,
            packPerBox,
            piecePerPack
          );
          if (isLow) {
            lowStockCount++;
          }
        }

        // 获取平均成本
        const inventory = await prisma.inventory.findFirst({
          where: { goodsId: goods.id, baseId },
          select: { averageCost: true },
        });

        const avgCostPerBox = Number(inventory?.averageCost || 0);
        const totalBoxEquivalent = totalBox + totalPack / packPerBox + totalPiece / (packPerBox * piecePerPack);
        totalValue += totalBoxEquivalent * avgCostPerBox;
      }

      return {
        totalGoods: allGoods.length,
        totalValue: Math.round(totalValue * 100) / 100,
        lowStockCount,
        outOfStockCount,
      };
    } catch (error) {
      logger.error('获取基地库存统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
      });
      throw error;
    }
  }

  /**
   * 判断库存是否不足
   * 优先级：商品自定义阈值 > 全局默认阈值 > 硬编码默认值
   */
  static async isLowStock(
    baseId: number,
    goodsId: string,
    stockBox: number,
    stockPack: number,
    stockPiece: number,
    packPerBox: number,
    piecePerPack: number
  ): Promise<boolean> {
    try {
      // 1. 优先使用商品自定义阈值
      const goodsSetting = await prisma.goodsLocalSetting.findFirst({
        where: { goodsId, baseId },
        select: { stockThreshold: true },
      });

      if (goodsSetting?.stockThreshold) {
        const threshold = goodsSetting.stockThreshold as any as StockThreshold;
        if (threshold.enabled) {
          const totalInUnit = this.convertToUnit(
            stockBox,
            stockPack,
            stockPiece,
            packPerBox,
            piecePerPack,
            threshold.unit
          );
          return totalInUnit < threshold.value;
        }
      }

      // 2. 其次使用全局默认阈值
      const globalSetting = await prisma.globalSetting.findUnique({
        where: { key: 'stock.low_quantity_threshold' },
      });

      if (globalSetting?.value) {
        const threshold = globalSetting.value as any as StockThreshold;
        if (threshold.enabled) {
          const totalInUnit = this.convertToUnit(
            stockBox,
            stockPack,
            stockPiece,
            packPerBox,
            piecePerPack,
            threshold.unit
          );
          return totalInUnit < threshold.value;
        }
      }

      // 3. 最后使用硬编码默认值
      return stockBox < 5;
    } catch (error) {
      logger.error('判断库存不足失败', { error, goodsId, baseId });
      // 出错时使用硬编码默认值
      return stockBox < 5;
    }
  }

  /**
   * 将库存换算成指定单位
   */
  private static convertToUnit(
    stockBox: number,
    stockPack: number,
    stockPiece: number,
    packPerBox: number,
    piecePerPack: number,
    unit: string
  ): number {
    if (unit === 'box') {
      return stockBox + stockPack / packPerBox + stockPiece / (packPerBox * piecePerPack);
    } else if (unit === 'pack') {
      return stockBox * packPerBox + stockPack + stockPiece / piecePerPack;
    } else if (unit === 'piece') {
      return stockBox * packPerBox * piecePerPack + stockPack * piecePerPack + stockPiece;
    }
    return stockBox;
  }
}
