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
                handler: {
                  select: { id: true, name: true },
                },
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
      const formattedRecords = records.map((record) => ({
        id: record.id,
        profitDate: record.profitDate.toISOString().split('T')[0],
        locationId: record.locationId,
        locationName: record.location.name,
        consumptionId: record.consumptionId,
        handlerId: record.consumption?.handler?.id || '',
        handlerName: record.consumption?.handler?.name || '未关联',
        gmvAmount: Number(record.gmvAmount),
        refundAmount: Number(record.refundAmount),
        waterAmount: Number(record.offlineAmount),
        salesAmount: Number(record.dailySales),
        consumptionAmount: Number(record.consumptionValue),
        adSpendAmount: Number(record.adCost),
        platformFeeAmount: Number(record.platformFee),
        profitAmount: Number(record.profitAmount),
        profitRate: Number(record.profitRate),
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }));

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
      // 验证消耗记录存在且未被关联
      const consumption = await prisma.stockConsumption.findFirst({
        where: {
          id: data.consumptionId,
          baseId,
          anchorProfit: null, // 确保未被关联
        },
      });

      if (!consumption) {
        return {
          success: false,
          message: '消耗记录不存在或已被关联',
        };
      }

      // 使用消耗记录的直播间
      const record = await prisma.anchorProfit.create({
        data: {
          locationId: consumption.locationId,
          consumptionId: data.consumptionId,
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
      waterAmount?: number;
      consumptionAmount?: number;
      adSpendAmount?: number;
      platformFeeAmount?: number;
      salesAmount?: number;
      profitAmount?: number;
      profitRate?: number;
      notes?: string;
    }
  ) {
    try {
      const updateData: any = {};

      if (data.profitDate) updateData.profitDate = new Date(data.profitDate);
      if (data.gmvAmount !== undefined) updateData.gmvAmount = data.gmvAmount;
      if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount;
      if (data.waterAmount !== undefined) updateData.offlineAmount = data.waterAmount;
      if (data.consumptionAmount !== undefined) updateData.consumptionValue = data.consumptionAmount;
      if (data.adSpendAmount !== undefined) updateData.adCost = data.adSpendAmount;
      if (data.platformFeeAmount !== undefined) updateData.platformFee = data.platformFeeAmount;
      if (data.salesAmount !== undefined) {
        updateData.dailySales = data.salesAmount;
        if (data.platformFeeAmount !== undefined) {
          updateData.platformFeeRate = data.salesAmount > 0 
            ? (data.platformFeeAmount / data.salesAmount) * 100 
            : 0;
        }
      }
      if (data.profitAmount !== undefined) updateData.profitAmount = data.profitAmount;
      if (data.profitRate !== undefined) updateData.profitRate = data.profitRate;
      if (data.notes !== undefined) updateData.notes = data.notes;

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
   */
  static async getUnlinkedConsumptions(
    baseId: number,
    handlerId: string
  ) {
    try {
      // 查询该主播的消耗记录，排除已关联利润的
      const consumptions = await prisma.stockConsumption.findMany({
        where: {
          baseId,
          handlerId,
          anchorProfit: null, // 未关联利润
        },
        include: {
          goods: { 
            select: { 
              name: true,
              packPerBox: true,  // 多少盒/箱
              piecePerPack: true, // 多少包/盒
            } 
          },
          location: { select: { name: true } },
          handler: { select: { name: true } },
        },
        orderBy: { consumptionDate: 'desc' },
      });

      // 计算每条消耗记录的消耗金额
      const result = consumptions.map((c) => {
        const unitPricePerBox = Number(c.unitPricePerBox);
        const packPerBox = Number(c.goods.packPerBox) || 1;
        const piecePerPack = Number(c.goods.piecePerPack) || 1;
        
        // 计算单价/盒 和 单价/包
        const unitPricePerPack = unitPricePerBox / packPerBox;
        const unitPricePerPiece = unitPricePerPack / piecePerPack;
        
        // 消耗金额 = 箱数×单价/箱 + 盒数×单价/盒 + 包数×单价/包
        const consumptionAmount = 
          Number(c.boxQuantity) * unitPricePerBox +
          Number(c.packQuantity) * unitPricePerPack +
          Number(c.pieceQuantity) * unitPricePerPiece;
          
        return {
          id: c.id,
          consumptionDate: c.consumptionDate,
          goodsName: c.goods.name,
          locationName: c.location.name,
          handlerName: c.handler.name,
          boxQuantity: c.boxQuantity,
          packQuantity: c.packQuantity,
          pieceQuantity: c.pieceQuantity,
          consumptionAmount,
          label: `${c.consumptionDate.toISOString().split('T')[0]} - ${c.goods.name} (${c.boxQuantity}箱${c.packQuantity}盒${c.pieceQuantity}包) ¥${consumptionAmount.toFixed(2)}`,
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
