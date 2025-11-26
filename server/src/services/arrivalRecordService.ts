import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import type {
  CreateArrivalRequest,
  UpdateArrivalRequest,
  ArrivalQueryParams,
  ArrivalResponse,
  ArrivalListResponse
} from '../types/arrival';

export class ArrivalRecordService {
  /**
   * 获取基地到货记录列表
   */
  static async getBaseArrivalRecords(
    baseId: number,
    params: ArrivalQueryParams
  ): Promise<ArrivalListResponse> {
    try {
      const {
        current = 1,
        pageSize = 10,
        warehouseId,
        purchaseOrderId,
        goodsId,
        handlerId,
        startDate,
        endDate
      } = params;

      const skip = (current - 1) * pageSize;
      
      // 构建查询条件
      const where: any = {
        baseId: baseId
      };

      if (warehouseId) {
        where.locationId = warehouseId;
      }

      if (purchaseOrderId) {
        where.purchaseOrderId = purchaseOrderId;
      }

      if (goodsId) {
        where.goodsId = goodsId;
      }

      if (handlerId) {
        where.handlerId = handlerId;
      }

      if (startDate || endDate) {
        where.arrivalDate = {};
        if (startDate) {
          where.arrivalDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.arrivalDate.lte = new Date(endDate);
        }
      }

      // 执行查询
      const [records, total] = await Promise.all([
        prisma.arrivalRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { arrivalDate: 'desc' },
          include: {
            purchaseOrder: true,
            goods: true,
            location: true,
            handler: true,
            base: true
          }
        }),
        prisma.arrivalRecord.count({ where })
      ]);

      const data = records.map(record => ({
        id: record.id,
        arrivalDate: record.arrivalDate.toISOString().split('T')[0],
        purchaseOrderId: record.purchaseOrderId,
        purchaseOrderNo: record.purchaseOrder?.code || '',
        purchaseDate: record.purchaseOrder?.purchaseDate?.toISOString().split('T')[0] || '',
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      }));

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };

    } catch (error) {
      logger.error('获取基地到货记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api'
      });
      throw new BaseError('获取到货记录列表失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 创建到货记录
   */
  static async createArrivalRecord(
    baseId: number,
    data: CreateArrivalRequest,
    userId: string
  ): Promise<ArrivalResponse> {
    try {
      // 验证必填字段（不需要goodsId，从采购单获取）
      if (!data.arrivalDate || !data.purchaseOrderId || 
          !data.locationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证采购订单是否存在且属于该基地，并获取关联的商品ID
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          id: data.purchaseOrderId,
          baseId: baseId
        },
        include: {
          items: {
            select: {
              goodsId: true
            },
            take: 1  // 取第一个商品（一个采购单通常对应一个商品）
          }
        }
      });

      if (!purchaseOrder) {
        throw new BaseError('采购订单不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 从采购单中获取商品ID
      const goodsId = purchaseOrder.items[0]?.goodsId;
      if (!goodsId) {
        throw new BaseError('采购订单没有关联商品', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证位置是否存在且属于该基地
      const location = await prisma.location.findFirst({
        where: {
          id: data.locationId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      if (!location) {
        throw new BaseError('位置不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证经手人是否存在且属于该基地
      const handler = await prisma.personnel.findFirst({
        where: {
          id: data.handlerId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          role: true
        }
      });

      if (!handler) {
        throw new BaseError('经手人不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 创建到货记录
      const record = await prisma.arrivalRecord.create({
        data: {
          arrivalDate: new Date(data.arrivalDate),
          purchaseOrderId: data.purchaseOrderId,
          goodsId: goodsId,  // 使用从采购单获取的商品ID
          locationId: data.locationId,
          handlerId: data.handlerId,
          baseId: baseId,
          boxQuantity: data.boxQuantity || 0,
          packQuantity: data.packQuantity || 0,
          pieceQuantity: data.pieceQuantity || 0,
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          purchaseOrder: true,
          goods: true,
          location: true,
          handler: true,
          base: true
        }
      });

      logger.info('到货记录创建成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        arrivalDate: record.arrivalDate.toISOString().split('T')[0],
        purchaseOrderId: record.purchaseOrderId,
        purchaseOrderNo: record.purchaseOrder?.code || '',
        purchaseDate: record.purchaseOrder?.purchaseDate?.toISOString().split('T')[0] || '',
        goodsId: record.goodsId,
        goodsCode: record.goods?.code || '',
        goodsName: record.goods?.name || '',
        locationId: record.locationId,
        locationName: record.location?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('创建到货记录失败', {
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
   * 删除到货记录
   */
  static async deleteArrivalRecord(
    baseId: number,
    recordId: string,
    userId: string
  ): Promise<void> {
    try {
      // 验证记录是否存在且属于该基地
      const record = await prisma.arrivalRecord.findFirst({
        where: {
          id: recordId,
          baseId: baseId
        }
      });

      if (!record) {
        throw new BaseError('到货记录不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 删除记录
      await prisma.arrivalRecord.delete({
        where: {
          id: recordId
        }
      });

      logger.info('到货记录删除成功', {
        recordId,
        baseId,
        userId,
        service: 'milicard-api'
      });

    } catch (error) {
      logger.error('删除到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        recordId,
        baseId,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取到货统计信息
   */
  static async getArrivalStats(baseId: number): Promise<any> {
    try {
      const [totalRecords, todayRecords, thisMonthRecords] = await Promise.all([
        // 总到货记录数
        prisma.arrivalRecord.count({
          where: { baseId }
        }),
        // 今日到货记录数
        prisma.arrivalRecord.count({
          where: {
            baseId,
            arrivalDate: {
              gte: new Date(new Date().toDateString())
            }
          }
        }),
        // 本月到货记录数
        prisma.arrivalRecord.count({
          where: {
            baseId,
            arrivalDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalRecords,
          todayRecords,
          thisMonthRecords
        }
      };

    } catch (error) {
      logger.error('获取到货统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api'
      });
      throw new BaseError('获取到货统计失败', BaseErrorType.DATABASE_ERROR);
    }
  }
}
