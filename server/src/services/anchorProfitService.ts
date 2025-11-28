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
        handlerId: '', // TODO: 从调货记录获取
        handlerName: record.location.name, // 暂时用直播间名称
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
      // 根据主播获取直播间（暂时用第一个直播间）
      const location = await prisma.location.findFirst({
        where: { baseId, type: 'LIVE_ROOM' },
      });

      if (!location) {
        return {
          success: false,
          message: '未找到直播间',
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
   * 获取消耗金额（根据日期和主播）
   */
  static async getConsumptionAmount(
    baseId: number,
    date: string,
    handlerId: string
  ) {
    try {
      // 从消耗记录中汇总该主播当天的消耗金额
      // TODO: 需要根据实际的消耗记录表结构来实现
      // 暂时返回0
      return {
        success: true,
        data: { amount: 0 },
      };
    } catch (error) {
      logger.error('获取消耗金额失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        date,
        handlerId,
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
