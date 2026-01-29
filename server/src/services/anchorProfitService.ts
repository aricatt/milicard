import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class AnchorProfitService {
  /**
   * 获取主播利润列表
   */
  static async getAnchorProfits(
    baseId: number,
    params: {
      page?: number;
      pageSize?: number;
      handlerId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    try {
      const { page = 1, pageSize = 20, handlerId, startDate, endDate } = params;
      const skip = (page - 1) * pageSize;

      // 获取该基地的所有直播间ID
      const locations = await prisma.location.findMany({
        where: { baseId, type: 'LIVE_ROOM' },
        select: { id: true },
      });
      const locationIds = locations.map((l) => l.id);

      if (locationIds.length === 0) {
        return {
          success: true,
          data: [],
          pagination: { total: 0, page, pageSize },
        };
      }

      // 构建查询条件
      const where: any = {
        locationId: { in: locationIds },
      };

      if (startDate && endDate) {
        where.profitDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      // 查询数据
      const [records, total] = await Promise.all([
        prisma.anchorProfit.findMany({
          where,
          include: {
            location: {
              select: { id: true, name: true },
            },
            creator: {
              select: { id: true, username: true },
            },
            consumption: {
              select: {
                id: true,
                boxQuantity: true,
                packQuantity: true,
                pieceQuantity: true,
                unitPricePerBox: true, // 来自 Inventory.averageCost，用于计算拿货价
                handler: {
                  select: { id: true, name: true },
                },
                goods: {
                  select: {
                    id: true,
                    name: true,
                    nameI18n: true, // 商品名国际化
                    packPerBox: true,
                    piecePerPack: true,
                    category: {
                      select: {
                        id: true,
                        code: true, // 品类编码
                        name: true,
                        nameI18n: true, // 品类名国际化
                      }
                    },
                    localSettings: {
                      where: { baseId },
                      select: {
                        packPrice: true, // 商品平拆价（每包价格），用于计算消耗金额
                      }
                    }
                  }
                }
              },
            },
          },
          orderBy: { profitDate: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.anchorProfit.count({ where }),
      ]);

      // 格式化数据
      const formattedRecords = records.map((record) => {
        let calculatedConsumptionAmount = 0; // 消耗金额（基于 packPrice，仅用于显示）
        let calculatedCostPrice = 0; // 拿货价（基于 averageCost，用于计算毛利）
        
        if (record.consumption) {
          const packPerBox = Number(record.consumption.goods.packPerBox) || 1;
          const piecePerPack = Number(record.consumption.goods.piecePerPack) || 1;
          
          logger.info('=== 利润计算详情 ===', {
            profitId: record.id,
            goodsName: record.consumption.goods.name,
            packPerBox,
            piecePerPack,
            boxQuantity: record.consumption.boxQuantity,
            packQuantity: record.consumption.packQuantity,
            pieceQuantity: record.consumption.pieceQuantity,
          });
          
          // 1. 计算消耗金额（基于 packPrice，仅用于显示）
          const packPrice = record.consumption.goods.localSettings?.[0]?.packPrice;
          if (packPrice) {
            const unitPricePerPiece = Number(packPrice); // packPrice 是每包价格
            const unitPricePerPack = unitPricePerPiece * piecePerPack;  // 单价/盒 = 单价/包 × 包数
            const unitPricePerBox_fromPackPrice = unitPricePerPack * packPerBox; // 单价/箱 = 单价/盒 × 盒数
            
            calculatedConsumptionAmount = 
              Number(record.consumption.boxQuantity) * unitPricePerBox_fromPackPrice +
              Number(record.consumption.packQuantity) * unitPricePerPack +
              Number(record.consumption.pieceQuantity) * unitPricePerPiece;
            
            logger.info('1. 消耗金额计算（基于 packPrice，仅显示）', {
              packPrice: unitPricePerPiece,
              unitPricePerPack,
              unitPricePerBox_fromPackPrice,
              calculatedConsumptionAmount,
            });
          }
          
          // 2. 计算拿货价（基于 Inventory.averageCost，用于计算毛利）
          const unitPricePerBox = Number(record.consumption.unitPricePerBox) || 0;
          if (unitPricePerBox > 0) {
            const unitPricePerPack = unitPricePerBox / packPerBox;      // 单价/盒 = 单价/箱 ÷ 盒数
            const unitPricePerPiece = unitPricePerPack / piecePerPack;  // 单价/包 = 单价/盒 ÷ 包数
            
            calculatedCostPrice = 
              Number(record.consumption.boxQuantity) * unitPricePerBox +
              Number(record.consumption.packQuantity) * unitPricePerPack +
              Number(record.consumption.pieceQuantity) * unitPricePerPiece;
            
            logger.info('2. 拿货价计算（基于 averageCost，用于毛利计算）', {
              unitPricePerBox_fromAverageCost: unitPricePerBox,
              unitPricePerPack,
              unitPricePerPiece,
              calculatedCostPrice,
            });
          }
          
          // 3. 毛利计算
          const gmv = Number(record.gmvAmount);
          const refund = Number(record.refundAmount);
          const cancelOrder = Number(record.cancelOrderAmount);
          const shopOrder = Number(record.shopOrderAmount);
          const water = Number(record.offlineAmount);
          const adSpend = Number(record.adCost);
          const platformFee = Number(record.platformFee);
          const salesAmount = Number(record.dailySales);
          const profitAmount = Number(record.profitAmount);
          const profitRate = Number(record.profitRate);
          
          logger.info('3. 毛利计算', {
            gmv,
            refund,
            cancelOrder,
            shopOrder,
            water,
            salesAmount_stored: salesAmount,
            salesAmount_formula: `${gmv} + ${shopOrder} + ${water} - ${cancelOrder} - ${refund} = ${gmv + shopOrder + water - cancelOrder - refund}`,
            calculatedCostPrice,
            adSpend,
            platformFee,
            profitAmount_stored: profitAmount,
            profitAmount_formula: `${salesAmount} - ${calculatedCostPrice} - ${adSpend} - ${platformFee} = ${salesAmount - calculatedCostPrice - adSpend - platformFee}`,
            profitRate_stored: profitRate,
            profitRate_formula: salesAmount > 0 ? `(${profitAmount} / ${salesAmount}) * 100 = ${(profitAmount / salesAmount) * 100}` : '0',
          });
          
          logger.info('===================\n');
        }
        
        return {
          id: record.id,
          profitDate: record.profitDate.toISOString().split('T')[0],
          locationId: record.locationId,
          locationName: record.location.name,
          consumptionId: record.consumptionId,
          handlerId: record.consumption?.handler?.id || '',
          handlerName: record.consumption?.handler?.name || '未关联',
          gmvAmount: Number(record.gmvAmount),
          refundAmount: Number(record.refundAmount),
          cancelOrderAmount: Number(record.cancelOrderAmount),
          shopOrderAmount: Number(record.shopOrderAmount),
          waterAmount: Number(record.offlineAmount),
          salesAmount: Number(record.dailySales),
          consumptionAmount: calculatedConsumptionAmount, // 消耗金额（基于 packPrice，仅用于显示）
          calculatedCostPrice, // 拿货价（基于 averageCost，用于计算毛利）
          adSpendAmount: Number(record.adCost),
          platformFeeAmount: Number(record.platformFee),
          profitAmount: Number(record.profitAmount),
          profitRate: Number(record.profitRate),
          notes: record.notes,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          // 包含关联的消耗记录信息，用于前端显示品名和计算平均单包价
          consumption: record.consumption ? {
            goods: {
              name: record.consumption.goods.name,
              nameI18n: record.consumption.goods.nameI18n, // 商品名国际化
              category: record.consumption.goods.category ? {
                code: record.consumption.goods.category.code, // 品类编码
                name: record.consumption.goods.category.name,
                nameI18n: record.consumption.goods.category.nameI18n, // 品类名国际化
              } : undefined,
              packPerBox: Number(record.consumption.goods.packPerBox),
              piecePerPack: Number(record.consumption.goods.piecePerPack),
            },
            boxQuantity: Number(record.consumption.boxQuantity),
            packQuantity: Number(record.consumption.packQuantity),
            pieceQuantity: Number(record.consumption.pieceQuantity),
          } : undefined,
        };
      });

      return {
        success: true,
        data: formattedRecords,
        pagination: { total, page, pageSize },
      };
    } catch (error) {
      logger.error('获取主播利润列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 创建主播利润记录
   */
  static async createAnchorProfit(
    baseId: number,
    data: {
      profitDate: string;
      handlerId: string;
      consumptionId: string; // 关联的消耗记录ID
      gmvAmount: number;
      refundAmount: number;
      cancelOrderAmount?: number;
      shopOrderAmount?: number;
      waterAmount: number;
      adSpendAmount: number;
      platformFeeRate?: number; // 平台扣点比例，默认17%
      notes?: string;
    },
    userId: string
  ) {
    try {
      // 验证消耗记录存在且未被关联，并获取库存信息用于计算消耗金额
      const consumption = await prisma.stockConsumption.findFirst({
        where: {
          id: data.consumptionId,
          baseId,
          anchorProfit: null, // 确保未被关联
        },
        include: {
          goods: {
            include: {
              inventory: {
                where: { baseId },
                select: {
                  averageCost: true,
                },
              },
            },
          },
        },
      });

      if (!consumption) {
        return {
          success: false,
          message: '消耗记录不存在或已被关联',
        };
      }

      // 计算消耗金额（基于 Inventory.averageCost 拿货价）
      const packPerBox = Number(consumption.goods.packPerBox) || 1;
      const piecePerPack = Number(consumption.goods.piecePerPack) || 1;
      const averageCost = (consumption.goods as any)?.inventory?.[0]?.averageCost;
      
      let consumptionValue = 0;
      if (averageCost) {
        const unitPricePerBox = Number(averageCost); // averageCost 是每箱价格
        const unitPricePerPack = unitPricePerBox / packPerBox; // 单价/盒 = 单价/箱 ÷ 盒数
        const unitPricePerPiece = unitPricePerPack / piecePerPack; // 单价/包 = 单价/盒 ÷ 包数
        
        consumptionValue = 
          Number(consumption.boxQuantity) * unitPricePerBox +
          Number(consumption.packQuantity) * unitPricePerPack +
          Number(consumption.pieceQuantity) * unitPricePerPiece;
      }

      // 计算销售金额
      const salesAmount = data.gmvAmount + (data.shopOrderAmount || 0) + data.waterAmount 
        - (data.cancelOrderAmount || 0) - data.refundAmount;
      
      // 计算平台扣点
      const platformFeeRate = data.platformFeeRate ?? 17;
      const platformFee = (data.gmvAmount - (data.cancelOrderAmount || 0) - data.refundAmount) * (platformFeeRate / 100);
      
      // 计算利润
      const profitAmount = salesAmount - consumptionValue - data.adSpendAmount - platformFee;
      const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

      // 使用消耗记录的直播间，保存计算好的值
      const record = await prisma.anchorProfit.create({
        data: {
          location: {
            connect: { id: consumption.locationId }
          },
          consumption: {
            connect: { id: data.consumptionId }
          },
          creator: {
            connect: { id: userId }
          },
          profitDate: new Date(data.profitDate),
          gmvAmount: data.gmvAmount,
          refundAmount: data.refundAmount,
          cancelOrderAmount: data.cancelOrderAmount || 0,
          shopOrderAmount: data.shopOrderAmount || 0,
          offlineAmount: data.waterAmount,
          consumptionValue, // 后端计算
          adCost: data.adSpendAmount,
          platformFee, // 后端计算
          platformFeeRate,
          dailySales: salesAmount, // 后端计算
          profitAmount, // 后端计算
          profitRate, // 后端计算
          notes: data.notes,
        },
      });

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      // 捕获 Prisma 唯一约束错误
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        logger.warn('创建主播利润记录失败：唯一约束冲突', {
          error: error.message,
          baseId,
          data,
          service: 'milicard-api',
        });
        return {
          success: false,
          message: '该消耗记录已关联利润记录，或该直播间当天已有利润记录',
        };
      }

      logger.error('创建主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 更新主播利润记录
   */
  static async updateAnchorProfit(
    baseId: number,
    id: string,
    data: {
      profitDate?: string;
      handlerId?: string;
      gmvAmount?: number;
      refundAmount?: number;
      cancelOrderAmount?: number;
      shopOrderAmount?: number;
      waterAmount?: number;
      adSpendAmount?: number;
      platformFeeRate?: number;
      notes?: string;
    }
  ) {
    try {
      // 获取现有记录及其关联的消耗记录和库存信息
      const existingRecord = await prisma.anchorProfit.findUnique({
        where: { id },
        include: {
          consumption: {
            include: {
              goods: {
                include: {
                  inventory: {
                    where: { baseId },
                    select: {
                      averageCost: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existingRecord) {
        return {
          success: false,
          message: '利润记录不存在',
        };
      }

      // 准备更新数据（基础字段）
      const updateData: any = {};

      if (data.profitDate) updateData.profitDate = new Date(data.profitDate);
      if (data.gmvAmount !== undefined) updateData.gmvAmount = data.gmvAmount;
      if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount;
      if (data.cancelOrderAmount !== undefined) updateData.cancelOrderAmount = data.cancelOrderAmount;
      if (data.shopOrderAmount !== undefined) updateData.shopOrderAmount = data.shopOrderAmount;
      if (data.waterAmount !== undefined) updateData.offlineAmount = data.waterAmount;
      if (data.adSpendAmount !== undefined) updateData.adCost = data.adSpendAmount;
      if (data.platformFeeRate !== undefined) updateData.platformFeeRate = data.platformFeeRate;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // 重新计算消耗金额（如果消耗记录存在，基于 Inventory.averageCost）
      if (existingRecord.consumption) {
        const consumption = existingRecord.consumption;
        const packPerBox = Number(consumption.goods.packPerBox) || 1;
        const piecePerPack = Number(consumption.goods.piecePerPack) || 1;
        const averageCost = (consumption.goods as any)?.inventory?.[0]?.averageCost;
        
        if (averageCost) {
          const unitPricePerBox = Number(averageCost); // averageCost 是每箱价格
          const unitPricePerPack = unitPricePerBox / packPerBox; // 单价/盒 = 单价/箱 ÷ 盒数
          const unitPricePerPiece = unitPricePerPack / piecePerPack; // 单价/包 = 单价/盒 ÷ 包数
          
          updateData.consumptionValue = 
            Number(consumption.boxQuantity) * unitPricePerBox +
            Number(consumption.packQuantity) * unitPricePerPack +
            Number(consumption.pieceQuantity) * unitPricePerPiece;
        }
      }

      // 使用更新后的值或现有值进行计算
      const gmvAmount = data.gmvAmount ?? Number(existingRecord.gmvAmount);
      const refundAmount = data.refundAmount ?? Number(existingRecord.refundAmount);
      const cancelOrderAmount = data.cancelOrderAmount ?? Number(existingRecord.cancelOrderAmount);
      const shopOrderAmount = data.shopOrderAmount ?? Number(existingRecord.shopOrderAmount);
      const waterAmount = data.waterAmount ?? Number(existingRecord.offlineAmount);
      const adSpendAmount = data.adSpendAmount ?? Number(existingRecord.adCost);
      const platformFeeRate = data.platformFeeRate ?? Number(existingRecord.platformFeeRate);
      const consumptionValue = updateData.consumptionValue ?? Number(existingRecord.consumptionValue);

      // 重新计算所有派生字段
      const salesAmount = gmvAmount + shopOrderAmount + waterAmount - cancelOrderAmount - refundAmount;
      const platformFee = (gmvAmount - cancelOrderAmount - refundAmount) * (platformFeeRate / 100);
      const profitAmount = salesAmount - consumptionValue - adSpendAmount - platformFee;
      const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

      // 添加计算字段到更新数据
      updateData.dailySales = salesAmount;
      updateData.platformFee = platformFee;
      updateData.profitAmount = profitAmount;
      updateData.profitRate = profitRate;

      const record = await prisma.anchorProfit.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      logger.error('更新主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        id,
        data,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 删除主播利润记录
   */
  static async deleteAnchorProfit(baseId: number, id: string) {
    try {
      await prisma.anchorProfit.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      logger.error('删除主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        id,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 获取统计数据
   */
  static async getStats(baseId: number) {
    try {
      // 获取该基地的所有直播间ID
      const locations = await prisma.location.findMany({
        where: { baseId, type: 'LIVE_ROOM' },
        select: { id: true },
      });
      const locationIds = locations.map((l) => l.id);

      if (locationIds.length === 0) {
        return {
          success: true,
          data: {
            totalRecords: 0,
            totalGmv: 0,
            totalRefund: 0,
            totalSales: 0,
            totalConsumption: 0,
            totalAdSpend: 0,
            totalPlatformFee: 0,
            totalProfit: 0,
            avgProfitRate: 0,
            todayRecords: 0,
          },
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalStats, todayCount] = await Promise.all([
        prisma.anchorProfit.aggregate({
          where: { locationId: { in: locationIds } },
          _count: true,
          _sum: {
            gmvAmount: true,
            refundAmount: true,
            dailySales: true,
            consumptionValue: true,
            adCost: true,
            platformFee: true,
            profitAmount: true,
          },
          _avg: {
            profitRate: true,
          },
        }),
        prisma.anchorProfit.count({
          where: {
            locationId: { in: locationIds },
            profitDate: { gte: today },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          totalRecords: totalStats._count,
          totalGmv: Number(totalStats._sum.gmvAmount || 0),
          totalRefund: Number(totalStats._sum.refundAmount || 0),
          totalSales: Number(totalStats._sum.dailySales || 0),
          totalConsumption: Number(totalStats._sum.consumptionValue || 0),
          totalAdSpend: Number(totalStats._sum.adCost || 0),
          totalPlatformFee: Number(totalStats._sum.platformFee || 0),
          totalProfit: Number(totalStats._sum.profitAmount || 0),
          avgProfitRate: Number(totalStats._avg.profitRate || 0),
          todayRecords: todayCount,
        },
      };
    } catch (error) {
      logger.error('获取主播利润统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 获取未关联利润的消耗记录（根据主播）
   * @param baseId 基地ID
   * @param handlerId 主播ID
   * @param currentConsumptionId 当前编辑记录的消耗ID（编辑时需要包含）
   */
  static async getUnlinkedConsumptions(
    baseId: number,
    handlerId: string,
    currentConsumptionId?: string
  ) {
    try {
      // 查询该主播的消耗记录，排除已关联利润的（但包含当前编辑的）
      const consumptions = await prisma.stockConsumption.findMany({
        where: {
          baseId,
          handlerId,
          OR: [
            { anchorProfit: null }, // 未关联利润
            { id: currentConsumptionId }, // 或者是当前编辑记录的消耗
          ],
        },
        include: {
          goods: { 
            select: { 
              name: true,
              nameI18n: true,  // 商品名国际化
              packPerBox: true,  // 多少盒/箱
              piecePerPack: true, // 多少包/盒
              category: {
                select: {
                  code: true,
                  name: true,
                  nameI18n: true,  // 品类名国际化
                }
              },
              localSettings: {
                where: { baseId },
                select: {
                  packPrice: true,
                }
              }
            } 
          },
          location: { select: { name: true } },
          handler: { select: { name: true } },
        },
        orderBy: { consumptionDate: 'desc' },
      });

      // 计算每条消耗记录的消耗金额和拿货价
      const result = consumptions.map((c) => {
        const packPerBox = Number(c.goods.packPerBox) || 1;
        const piecePerPack = Number(c.goods.piecePerPack) || 1;
        
        // 1. 计算消耗金额（基于 packPrice，仅用于显示）
        let consumptionAmount = 0;
        const packPrice = (c.goods as any)?.localSettings?.[0]?.packPrice;
        if (packPrice) {
          const unitPricePerPiece = Number(packPrice); // packPrice 是每包价格
          const unitPricePerPack = unitPricePerPiece * piecePerPack;  // 单价/盒 = 单价/包 × 包数
          const unitPricePerBox_fromPackPrice = unitPricePerPack * packPerBox; // 单价/箱 = 单价/盒 × 盒数
          
          consumptionAmount = 
            Number(c.boxQuantity) * unitPricePerBox_fromPackPrice +
            Number(c.packQuantity) * unitPricePerPack +
            Number(c.pieceQuantity) * unitPricePerPiece;
        }
        
        // 2. 计算拿货价（基于 Inventory.averageCost，用于计算毛利）
        let costPrice = 0;
        const unitPricePerBox = Number(c.unitPricePerBox) || 0;
        if (unitPricePerBox > 0) {
          const unitPricePerPack = unitPricePerBox / packPerBox;      // 单价/盒 = 单价/箱 ÷ 盒数
          const unitPricePerPiece = unitPricePerPack / piecePerPack;  // 单价/包 = 单价/盒 ÷ 包数
          
          costPrice = 
            Number(c.boxQuantity) * unitPricePerBox +
            Number(c.packQuantity) * unitPricePerPack +
            Number(c.pieceQuantity) * unitPricePerPiece;
        }
          
        // 品类和商品名的国际化处理将在前端完成
        // 这里返回原始数据和国际化数据
        const categoryCode = c.goods.category?.code || '';
        const categoryName = c.goods.category?.name || '';
        const categoryNameI18n = c.goods.category?.nameI18n || {};
        const goodsName = c.goods.name || '未知商品';
        const goodsNameI18n = c.goods.nameI18n || {};
        
        // 构建基础 label（不含国际化，前端会重新构建）
        const dateStr = c.consumptionDate.toISOString().split('T')[0];
        const categoryDisplay = categoryName ? `[${categoryName}]` : '';
        const quantityStr = `${c.boxQuantity}箱${c.packQuantity}盒${c.pieceQuantity}包`;
        const amountStr = `¥${consumptionAmount.toFixed(2)}`;
        const label = `${dateStr} - ${categoryDisplay}${goodsName} (${quantityStr}) ${amountStr}`;
        
        return {
          id: c.id,
          consumptionDate: c.consumptionDate,
          goodsName,
          goodsNameI18n,  // 商品名国际化
          categoryCode,
          categoryName,
          categoryNameI18n,  // 品类名国际化
          locationName: c.location.name,
          handlerName: c.handler.name,
          boxQuantity: c.boxQuantity,
          packQuantity: c.packQuantity,
          pieceQuantity: c.pieceQuantity,
          // 返回计算所需的基础字段
          packPerBox,
          piecePerPack,
          packPrice: packPrice ? Number(packPrice) : 0, // 商品平拆价（每包价格），用于计算消耗金额
          unitPricePerBox, // 来自 Inventory.averageCost，用于计算拿货价
          // 返回计算好的值
          consumptionAmount, // 消耗金额（基于 packPrice，仅用于显示）
          costPrice, // 拿货价（基于 averageCost，用于计算毛利）
          label, // 基础 label（前端会根据语言重新构建）
        };
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('获取未关联消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        handlerId,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 获取消耗金额（根据消耗记录ID）
   */
  static async getConsumptionAmount(
    baseId: number,
    consumptionId: string
  ) {
    try {
      const consumption = await prisma.stockConsumption.findFirst({
        where: {
          id: consumptionId,
          baseId,
        },
      });

      if (!consumption) {
        return {
          success: false,
          message: '消耗记录不存在',
        };
      }

      // 消耗金额 = 消耗箱数 * 单价/箱
      const amount = Number(consumption.boxQuantity) * Number(consumption.unitPricePerBox);

      return {
        success: true,
        data: { 
          amount,
          consumptionDate: consumption.consumptionDate,
          handlerId: consumption.handlerId,
          locationId: consumption.locationId,
        },
      };
    } catch (error) {
      logger.error('获取消耗金额失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        consumptionId,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 导入主播利润记录
   */
  static async importAnchorProfit(
    baseId: number,
    data: {
      profitDate: string;
      handlerName: string;
      gmvAmount: number;
      refundAmount: number;
      waterAmount: number;
      consumptionAmount: number;
      adSpendAmount: number;
      platformFeeAmount: number;
      salesAmount: number;
      profitAmount: number;
      profitRate: number;
      notes?: string;
    },
    userId: string
  ) {
    try {
      // 根据主播名称查找主播
      const personnel = await prisma.personnel.findFirst({
        where: {
          baseId,
          name: data.handlerName,
          role: 'ANCHOR',
        },
      });

      if (!personnel) {
        return {
          success: false,
          message: `未找到主播: ${data.handlerName}`,
        };
      }

      // 获取该基地的第一个直播间
      const location = await prisma.location.findFirst({
        where: { baseId, type: 'LIVE_ROOM' },
      });

      if (!location) {
        return {
          success: false,
          message: '未找到直播间',
        };
      }

      // 检查是否已存在同一天同一主播的记录
      const existingRecord = await prisma.anchorProfit.findFirst({
        where: {
          locationId: location.id,
          profitDate: new Date(data.profitDate),
        },
      });

      if (existingRecord) {
        return {
          success: false,
          message: `${data.profitDate} ${data.handlerName} 的利润记录已存在`,
        };
      }

      const record = await prisma.anchorProfit.create({
        data: {
          locationId: location.id,
          profitDate: new Date(data.profitDate),
          gmvAmount: data.gmvAmount,
          refundAmount: data.refundAmount,
          offlineAmount: data.waterAmount,
          consumptionValue: data.consumptionAmount,
          adCost: data.adSpendAmount,
          platformFee: data.platformFeeAmount,
          platformFeeRate: data.salesAmount > 0 
            ? (data.platformFeeAmount / data.salesAmount) * 100 
            : 0,
          dailySales: data.salesAmount,
          profitAmount: data.profitAmount,
          profitRate: data.profitRate,
          notes: data.notes,
          createdBy: userId,
        },
      });

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      logger.error('导入主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        service: 'milicard-api',
      });
      throw error;
    }
  }
}
