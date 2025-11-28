import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';

export interface ConsumptionQueryParams {
  current?: number;
  pageSize?: number;
  goodsId?: string;
  goodsName?: string;
  locationId?: number;
  handlerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateConsumptionRequest {
  consumptionDate: string;
  goodsId: string;
  locationId: number;
  handlerId: string;
  // 期初（调入总量）
  openingBoxQty: number;
  openingPackQty: number;
  openingPieceQty: number;
  // 期末（用户填写的剩余）
  closingBoxQty: number;
  closingPackQty: number;
  closingPieceQty: number;
  notes?: string;
}

export interface ConsumptionResponse {
  id: string;
  consumptionDate: string;
  goodsId: string;
  goodsCode?: string;
  goodsName?: string;
  packPerBox?: number;
  piecePerPack?: number;
  locationId: number;
  locationName?: string;
  handlerId: string;
  handlerName?: string;
  baseId: number;
  baseName?: string;
  // 期初
  openingBoxQty: number;
  openingPackQty: number;
  openingPieceQty: number;
  // 期末
  closingBoxQty: number;
  closingPackQty: number;
  closingPieceQty: number;
  // 消耗
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  // 平均单价/箱
  unitPricePerBox: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class ConsumptionService {
  /**
   * 获取基地消耗记录列表
   */
  static async getConsumptionList(
    baseId: number,
    params: ConsumptionQueryParams
  ): Promise<{ success: boolean; data: ConsumptionResponse[]; total: number }> {
    try {
      const { current = 1, pageSize = 10, goodsId, goodsName, locationId, handlerId, startDate, endDate } = params;
      const skip = (current - 1) * pageSize;

      const where: any = { baseId };

      if (goodsId) {
        where.goodsId = goodsId;
      }

      if (goodsName) {
        where.goods = {
          name: { contains: goodsName, mode: 'insensitive' }
        };
      }

      if (locationId) {
        where.locationId = locationId;
      }

      if (handlerId) {
        where.handlerId = handlerId;
      }

      if (startDate || endDate) {
        where.consumptionDate = {};
        if (startDate) {
          where.consumptionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.consumptionDate.lte = new Date(endDate);
        }
      }

      const [records, total] = await Promise.all([
        prisma.stockConsumption.findMany({
          where,
          include: {
            goods: { select: { id: true, code: true, name: true, packPerBox: true, piecePerPack: true } },
            location: { select: { id: true, name: true } },
            handler: { select: { id: true, name: true } },
            base: { select: { id: true, name: true } }
          },
          orderBy: [
            { consumptionDate: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: pageSize
        }),
        prisma.stockConsumption.count({ where })
      ]);

      const data = records.map(record => ({
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }));

      return { success: true, data, total };

    } catch (error) {
      logger.error('获取消耗记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api'
      });
      throw new BaseError('获取消耗记录列表失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 创建消耗记录
   */
  static async createConsumption(
    baseId: number,
    data: CreateConsumptionRequest,
    userId: string
  ): Promise<ConsumptionResponse> {
    try {
      // 验证必填字段
      if (!data.consumptionDate || !data.goodsId || !data.locationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证商品是否存在
      const goods = await prisma.goods.findFirst({
        where: { id: data.goodsId, baseId }
      });
      if (!goods) {
        throw new BaseError('商品不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证位置是否存在
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, baseId }
      });
      if (!location) {
        throw new BaseError('直播间/仓库不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证主播是否存在
      const handler = await prisma.personnel.findFirst({
        where: { id: data.handlerId, baseId }
      });
      if (!handler) {
        throw new BaseError('主播不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 获取平均单价/箱（从Inventory获取）
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId: data.goodsId, baseId }
      });
      const unitPricePerBox = inventory?.averageCost || 0;

      // 计算消耗 = 期初 - 期末
      const boxQuantity = data.openingBoxQty - data.closingBoxQty;
      const packQuantity = data.openingPackQty - data.closingPackQty;
      const pieceQuantity = data.openingPieceQty - data.closingPieceQty;

      // 创建消耗记录
      const record = await prisma.stockConsumption.create({
        data: {
          consumptionDate: new Date(data.consumptionDate),
          goodsId: data.goodsId,
          locationId: data.locationId,
          handlerId: data.handlerId,
          baseId,
          openingBoxQty: data.openingBoxQty,
          openingPackQty: data.openingPackQty,
          openingPieceQty: data.openingPieceQty,
          closingBoxQty: data.closingBoxQty,
          closingPackQty: data.closingPackQty,
          closingPieceQty: data.closingPieceQty,
          boxQuantity,
          packQuantity,
          pieceQuantity,
          unitPricePerBox,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          goods: { select: { id: true, code: true, name: true, packPerBox: true, piecePerPack: true } },
          location: { select: { id: true, name: true } },
          handler: { select: { id: true, name: true } },
          base: { select: { id: true, name: true } }
        }
      });

      logger.info('消耗记录创建成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('创建消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取期初数据（调入总量）
   * 按主播查询某商品调入给该主播的总量
   * 注意：直播间的货物归属是人，所以按 handlerId 查询
   */
  static async getOpeningStock(
    baseId: number,
    goodsId: string,
    handlerId: string
  ): Promise<{
    success: boolean;
    data: {
      openingBoxQty: number;
      openingPackQty: number;
      openingPieceQty: number;
      unitPricePerBox: number;
    };
  }> {
    try {
      // 查询调入给该主播的调货记录（目标主播是该人）
      const transferRecords = await prisma.transferRecord.findMany({
        where: {
          baseId,
          destinationHandlerId: handlerId,
          goodsId
        },
        select: {
          boxQuantity: true,
          packQuantity: true,
          pieceQuantity: true
        }
      });

      // 计算调入总量
      const openingBoxQty = transferRecords.reduce((sum, r) => sum + r.boxQuantity, 0);
      const openingPackQty = transferRecords.reduce((sum, r) => sum + r.packQuantity, 0);
      const openingPieceQty = transferRecords.reduce((sum, r) => sum + r.pieceQuantity, 0);

      // 获取平均单价/箱（从Inventory获取）
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId, baseId }
      });
      const unitPricePerBox = inventory?.averageCost ? Number(inventory.averageCost) : 0;

      return {
        success: true,
        data: {
          openingBoxQty,
          openingPackQty,
          openingPieceQty,
          unitPricePerBox
        }
      };

    } catch (error) {
      logger.error('获取期初数据失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        goodsId,
        handlerId,
        service: 'milicard-api'
      });
      throw new BaseError('获取期初数据失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 导入消耗记录（通过名称匹配）
   * 导入时直接使用消耗数量，不需要期初期末
   */
  static async importConsumption(
    baseId: number,
    data: {
      consumptionDate: string;
      goodsName: string;
      locationName: string;
      handlerName: string;
      boxQuantity?: number;
      packQuantity?: number;
      pieceQuantity?: number;
      notes?: string;
    },
    userId: string
  ): Promise<ConsumptionResponse> {
    try {
      // 验证必填字段
      if (!data.consumptionDate || !data.goodsName || !data.locationName || !data.handlerName) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 根据名称查找商品
      const goods = await prisma.goods.findFirst({
        where: { name: data.goodsName, baseId }
      });
      if (!goods) {
        throw new BaseError(`商品不存在: ${data.goodsName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 根据名称查找位置
      const location = await prisma.location.findFirst({
        where: { name: data.locationName, baseId }
      });
      if (!location) {
        throw new BaseError(`直播间不存在: ${data.locationName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 根据名称查找主播
      const handler = await prisma.personnel.findFirst({
        where: { name: data.handlerName, baseId }
      });
      if (!handler) {
        throw new BaseError(`主播不存在: ${data.handlerName}`, BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 获取平均单价/箱
      const inventory = await prisma.inventory.findFirst({
        where: { goodsId: goods.id, baseId }
      });
      const unitPricePerBox = inventory?.averageCost || 0;

      // 导入时直接使用消耗数量，期初期末设为0（历史数据导入）
      const boxQuantity = data.boxQuantity || 0;
      const packQuantity = data.packQuantity || 0;
      const pieceQuantity = data.pieceQuantity || 0;

      // 创建消耗记录
      const record = await prisma.stockConsumption.create({
        data: {
          consumptionDate: new Date(data.consumptionDate),
          goodsId: goods.id,
          locationId: location.id,
          handlerId: handler.id,
          baseId,
          openingBoxQty: 0,
          openingPackQty: 0,
          openingPieceQty: 0,
          closingBoxQty: 0,
          closingPackQty: 0,
          closingPieceQty: 0,
          boxQuantity,
          packQuantity,
          pieceQuantity,
          unitPricePerBox,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          goods: { select: { id: true, code: true, name: true, packPerBox: true, piecePerPack: true } },
          location: { select: { id: true, name: true } },
          handler: { select: { id: true, name: true } },
          base: { select: { id: true, name: true } }
        }
      });

      logger.info('消耗记录导入成功', {
        recordId: record.id,
        goodsName: data.goodsName,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        consumptionDate: record.consumptionDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        packPerBox: record.goods?.packPerBox || 1,
        piecePerPack: record.goods?.piecePerPack || 1,
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        openingBoxQty: record.openingBoxQty,
        openingPackQty: record.openingPackQty,
        openingPieceQty: record.openingPieceQty,
        closingBoxQty: record.closingBoxQty,
        closingPackQty: record.closingPackQty,
        closingPieceQty: record.closingPieceQty,
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        unitPricePerBox: Number(record.unitPricePerBox),
        notes: record.notes || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('导入消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        data,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 删除消耗记录
   */
  static async deleteConsumption(baseId: number, recordId: string): Promise<void> {
    try {
      const record = await prisma.stockConsumption.findFirst({
        where: { id: recordId, baseId }
      });

      if (!record) {
        throw new BaseError('消耗记录不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      await prisma.stockConsumption.delete({
        where: { id: recordId }
      });

      logger.info('消耗记录删除成功', {
        recordId,
        baseId,
        service: 'milicard-api'
      });

    } catch (error) {
      logger.error('删除消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        recordId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取消耗统计
   */
  static async getConsumptionStats(baseId: number): Promise<{
    success: boolean;
    data: {
      totalRecords: number;
      totalGoods: number;
      totalBoxQuantity: number;
      totalPackQuantity: number;
      totalPieceQuantity: number;
      todayRecords: number;
    };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalRecords, totalGoods, quantityStats, todayRecords] = await Promise.all([
        prisma.stockConsumption.count({ where: { baseId } }),
        prisma.stockConsumption.groupBy({
          by: ['goodsId'],
          where: { baseId }
        }),
        prisma.stockConsumption.aggregate({
          where: { baseId },
          _sum: {
            boxQuantity: true,
            packQuantity: true,
            pieceQuantity: true
          }
        }),
        prisma.stockConsumption.count({
          where: {
            baseId,
            consumptionDate: { gte: today, lt: tomorrow }
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalRecords,
          totalGoods: totalGoods.length,
          totalBoxQuantity: quantityStats._sum.boxQuantity || 0,
          totalPackQuantity: quantityStats._sum.packQuantity || 0,
          totalPieceQuantity: quantityStats._sum.pieceQuantity || 0,
          todayRecords
        }
      };

    } catch (error) {
      logger.error('获取消耗统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api'
      });
      throw new BaseError('获取消耗统计失败', BaseErrorType.DATABASE_ERROR);
    }
  }
}
