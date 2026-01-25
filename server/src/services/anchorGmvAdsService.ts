import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

export class AnchorGmvAdsService {
  /**
   * 获取月度GMV-ADS统计数据
   */
  static async getMonthlyGmvAdsStats(
    baseId: number,
    params: {
      month: string;          // 格式: "2026-01"
      handlerIds?: string[];  // 主播ID列表（多选）
      selectedDates?: string[]; // 选中的日期列表
    }
  ) {
    try {
      const { month, handlerIds, selectedDates } = params;
      
      // 计算月份的起止日期
      const startDate = dayjs(month, 'YYYY-MM').startOf('month').toDate();
      const endDate = dayjs(month, 'YYYY-MM').endOf('month').toDate();

      // 构建查询条件
      const where: any = {
        baseId,
        month,
      };

      if (handlerIds && handlerIds.length > 0) {
        where.handlerId = { in: handlerIds };
      }

      // 查询ADS数据
      const adsRecords = await prisma.anchorMonthlyAds.findMany({
        where,
        include: {
          handler: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 查询GMV数据（从主播利润表）
      const gmvWhere: any = {
        location: {
          baseId,
        },
        profitDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (handlerIds && handlerIds.length > 0) {
        gmvWhere.consumption = {
          handlerId: { in: handlerIds },
        };
      }

      const profitRecords = await prisma.anchorProfit.findMany({
        where: gmvWhere,
        include: {
          consumption: {
            select: {
              handlerId: true,
              handler: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // 按主播分组GMV数据，同时收集主播信息
      const gmvByHandler = new Map<string, { gmvData: Map<number, number>, handlerName: string }>();
      
      profitRecords.forEach(record => {
        const handlerId = record.consumption?.handlerId;
        const handlerName = record.consumption?.handler?.name;
        if (!handlerId) return;

        if (!gmvByHandler.has(handlerId)) {
          gmvByHandler.set(handlerId, {
            gmvData: new Map(),
            handlerName: handlerName || '',
          });
        }

        const day = dayjs(record.profitDate).date();
        const handlerInfo = gmvByHandler.get(handlerId)!;
        const currentGmv = handlerInfo.gmvData.get(day) || 0;
        handlerInfo.gmvData.set(day, currentGmv + Number(record.gmvAmount));
      });

      // 收集所有主播ID（ADS + GMV）
      const allHandlerIds = new Set<string>();
      adsRecords.forEach(record => allHandlerIds.add(record.handlerId));
      gmvByHandler.forEach((_, handlerId) => allHandlerIds.add(handlerId));

      // 合并ADS和GMV数据
      const results = Array.from(allHandlerIds).map(handlerId => {
        const adsRecord = adsRecords.find(r => r.handlerId === handlerId);
        const gmvInfo = gmvByHandler.get(handlerId);
        const handlerGmv = gmvInfo?.gmvData || new Map();
        const handlerName = adsRecord?.handlerName || adsRecord?.handler?.name || gmvInfo?.handlerName || '';

        // 构建每日数据
        const dailyData: any = {
          id: adsRecord?.id || `temp-${handlerId}`, // 如果没有ADS记录，使用临时ID
          baseId,
          month,
          handlerId,
          handlerName,
        };

        // 添加每日GMV和ADS
        for (let day = 1; day <= 31; day++) {
          dailyData[`day${day}Gmv`] = Number(handlerGmv.get(day) || 0);
          dailyData[`day${day}Ads`] = Number((adsRecord as any)?.[`day${day}Ads`] || 0);
        }

        // 计算统计字段
        const stats = this.calculateStats(dailyData, selectedDates, month);
        
        return {
          ...dailyData,
          ...stats,
          createdAt: adsRecord?.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: adsRecord?.updatedAt?.toISOString() || new Date().toISOString(),
        };
      });

      return {
        success: true,
        data: results,
        total: results.length,
      };
    } catch (error) {
      logger.error('获取月度GMV-ADS统计数据失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 计算统计字段
   */
  private static calculateStats(
    dailyData: any,
    selectedDates?: string[],
    month?: string
  ) {
    let totalGmv = 0;
    let totalAds = 0;
    let liveDays = 0;

    // 如果没有选中日期，默认选中整月
    const daysInMonth = month ? dayjs(month, 'YYYY-MM').daysInMonth() : 31;
    const daysToCalculate = selectedDates && selectedDates.length > 0
      ? selectedDates.map(d => dayjs(d).date())
      : Array.from({ length: daysInMonth }, (_, i) => i + 1);

    daysToCalculate.forEach(day => {
      const gmv = Number(dailyData[`day${day}Gmv`] || 0);
      const ads = Number(dailyData[`day${day}Ads`] || 0);

      totalGmv += gmv;
      totalAds += ads;

      if (gmv > 0) {
        liveDays++;
      }
    });

    const adsRatio = totalGmv > 0 ? (totalAds / totalGmv) * 100 : 0;
    const avgDailyGmv = liveDays > 0 ? totalGmv / liveDays : 0;

    return {
      totalGmv,
      totalAds,
      adsRatio,
      liveDays,
      avgDailyGmv,
    };
  }

  /**
   * 创建或更新ADS记录
   */
  static async upsertAdsRecord(
    baseId: number,
    data: {
      month: string;
      handlerId: string;
      handlerName?: string;
      [key: string]: any; // day1Ads, day2Ads, ... day31Ads
    }
  ) {
    try {
      const { month, handlerId, handlerName, ...dailyAds } = data;

      // 验证月份格式
      const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
      if (!monthRegex.test(month)) {
        return {
          success: false,
          message: '月份格式错误，应为 YYYY-MM',
        };
      }

      // 验证主播存在
      const handler = await prisma.personnel.findFirst({
        where: {
          id: handlerId,
          baseId,
          role: 'ANCHOR',
          isActive: true,
        },
      });

      if (!handler) {
        return {
          success: false,
          message: '主播不存在或已停用',
        };
      }

      // 准备ADS数据
      const adsData: any = {};
      for (let day = 1; day <= 31; day++) {
        const key = `day${day}Ads`;
        if (dailyAds[key] !== undefined) {
          adsData[key] = Number(dailyAds[key]) || 0;
        }
      }

      // 创建或更新记录
      const record = await prisma.anchorMonthlyAds.upsert({
        where: {
          baseId_month_handlerId: {
            baseId,
            month,
            handlerId,
          },
        },
        create: {
          baseId,
          month,
          handlerId,
          handlerName: handlerName || handler.name,
          ...adsData,
        },
        update: {
          handlerName: handlerName || handler.name,
          ...adsData,
        },
      });

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      logger.error('创建/更新ADS记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 获取主播列表（用于下拉选择）
   */
  static async getHandlerOptions(baseId: number) {
    try {
      const handlers = await prisma.personnel.findMany({
        where: {
          baseId,
          role: 'ANCHOR',
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return {
        success: true,
        data: handlers,
      };
    } catch (error) {
      logger.error('获取主播列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api',
      });
      throw error;
    }
  }

  /**
   * 删除ADS记录
   */
  static async deleteAdsRecord(baseId: number, id: string) {
    try {
      await prisma.anchorMonthlyAds.delete({
        where: {
          id,
          baseId,
        },
      });

      return {
        success: true,
        message: '删除成功',
      };
    } catch (error) {
      logger.error('删除ADS记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        id,
        service: 'milicard-api',
      });
      throw error;
    }
  }
}
