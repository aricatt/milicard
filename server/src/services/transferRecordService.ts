import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import type {
  CreateTransferRequest,
  UpdateTransferRequest,
  TransferQueryParams,
  TransferResponse,
  TransferListResponse,
  TransferStatsResponse,
  TransferStatus
} from '../types/transfer';

export class TransferRecordService {
  /**
   * 获取基地调货记录列表
   */
  static async getBaseTransferRecords(
    baseId: number,
    params: TransferQueryParams
  ): Promise<TransferListResponse> {
    try {
      const {
        current = 1,
        pageSize = 10,
        sourceLocationId,
        destinationLocationId,
        goodsId,
        handlerId,
        status,
        startDate,
        endDate
      } = params;

      const skip = (current - 1) * pageSize;
      
      // 构建查询条件
      const where: any = {
        baseId: baseId
      };

      if (sourceLocationId) {
        where.sourceLocationId = sourceLocationId;
      }

      if (destinationLocationId) {
        where.destinationLocationId = destinationLocationId;
      }

      if (goodsId) {
        where.goodsId = goodsId;
      }

      if (handlerId) {
        where.handlerId = handlerId;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.transferDate = {};
        if (startDate) {
          where.transferDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.transferDate.lte = new Date(endDate);
        }
      }

      // 执行查询
      const [records, total] = await Promise.all([
        prisma.transferRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { transferDate: 'desc' },
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            sourceLocation: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            destinationLocation: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            handler: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            base: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.transferRecord.count({ where })
      ]);

      const data: TransferResponse[] = records.map(record => ({
        id: record.id,
        transferDate: record.transferDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsName: record.goods?.name || '',
        sourceLocationId: record.sourceLocationId,
        sourceLocationName: record.sourceLocation?.name || '',
        destinationLocationId: record.destinationLocationId,
        destinationLocationName: record.destinationLocation?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        status: record.status as TransferStatus,
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
      logger.error('获取基地调货记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        params,
        service: 'milicard-api'
      });
      throw new BaseError('获取调货记录列表失败', BaseErrorType.DATABASE_ERROR);
    }
  }

  /**
   * 创建调货记录
   */
  static async createTransferRecord(
    baseId: number,
    data: CreateTransferRequest,
    userId: string
  ): Promise<TransferResponse> {
    try {
      // 验证必填字段
      if (!data.transferDate || !data.goodsId || !data.sourceLocationId || 
          !data.destinationLocationId || !data.handlerId) {
        throw new BaseError('缺少必填字段', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证调出和调入位置不能相同
      if (data.sourceLocationId === data.destinationLocationId) {
        throw new BaseError('调出位置和调入位置不能相同', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证商品是否存在且属于该基地
      const goods = await prisma.goods.findFirst({
        where: {
          id: data.goodsId,
          goodsBases: {
            some: {
              baseId: baseId
            }
          }
        },
        select: {
          id: true,
          code: true,
          name: true
        }
      });

      if (!goods) {
        throw new BaseError('商品不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证调出位置是否存在且属于该基地
      const sourceLocation = await prisma.location.findFirst({
        where: {
          id: data.sourceLocationId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      if (!sourceLocation) {
        throw new BaseError('调出位置不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 验证调入位置是否存在且属于该基地
      const destinationLocation = await prisma.location.findFirst({
        where: {
          id: data.destinationLocationId,
          baseId: baseId
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      });

      if (!destinationLocation) {
        throw new BaseError('调入位置不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
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

      // 创建调货记录
      const record = await prisma.transferRecord.create({
        data: {
          transferDate: new Date(data.transferDate),
          goodsId: data.goodsId,
          sourceLocationId: data.sourceLocationId,
          destinationLocationId: data.destinationLocationId,
          handlerId: data.handlerId,
          baseId: baseId,
          boxQuantity: data.boxQuantity || 0,
          packQuantity: data.packQuantity || 0,
          pieceQuantity: data.pieceQuantity || 0,
          status: data.status || 'PENDING',
          notes: data.notes,
          createdBy: userId,
          updatedBy: userId
        },
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          sourceLocation: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          destinationLocation: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          handler: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          base: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info('调货记录创建成功', {
        recordId: record.id,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        transferDate: record.transferDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsName: record.goods?.name || '',
        sourceLocationId: record.sourceLocationId,
        sourceLocationName: record.sourceLocation?.name || '',
        destinationLocationId: record.destinationLocationId,
        destinationLocationName: record.destinationLocation?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        status: record.status as TransferStatus,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('创建调货记录失败', {
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
   * 更新调货记录状态
   */
  static async updateTransferStatus(
    baseId: number,
    recordId: string,
    status: TransferStatus,
    userId: string
  ): Promise<TransferResponse> {
    try {
      // 验证记录是否存在且属于该基地
      const existingRecord = await prisma.transferRecord.findFirst({
        where: {
          id: recordId,
          baseId: baseId
        }
      });

      if (!existingRecord) {
        throw new BaseError('调货记录不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 更新记录状态
      const record = await prisma.transferRecord.update({
        where: {
          id: recordId
        },
        data: {
          status: status,
          updatedBy: userId
        },
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          sourceLocation: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          destinationLocation: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          handler: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          base: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info('调货记录状态更新成功', {
        recordId,
        status,
        baseId,
        userId,
        service: 'milicard-api'
      });

      return {
        id: record.id,
        transferDate: record.transferDate.toISOString().split('T')[0],
        goodsId: record.goodsId,
        goodsName: record.goods?.name || '',
        sourceLocationId: record.sourceLocationId,
        sourceLocationName: record.sourceLocation?.name || '',
        destinationLocationId: record.destinationLocationId,
        destinationLocationName: record.destinationLocation?.name || '',
        handlerId: record.handlerId,
        handlerName: record.handler?.name || '',
        baseId: record.baseId,
        baseName: record.base?.name || '',
        boxQuantity: record.boxQuantity,
        packQuantity: record.packQuantity,
        pieceQuantity: record.pieceQuantity,
        status: record.status as TransferStatus,
        notes: record.notes || undefined,
        createdBy: record.createdBy || undefined,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
      };

    } catch (error) {
      logger.error('更新调货记录状态失败', {
        error: error instanceof Error ? error.message : String(error),
        recordId,
        status,
        baseId,
        userId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 删除调货记录
   */
  static async deleteTransferRecord(
    baseId: number,
    recordId: string,
    userId: string
  ): Promise<void> {
    try {
      // 验证记录是否存在且属于该基地
      const record = await prisma.transferRecord.findFirst({
        where: {
          id: recordId,
          baseId: baseId
        }
      });

      if (!record) {
        throw new BaseError('调货记录不存在或不属于该基地', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 删除记录
      await prisma.transferRecord.delete({
        where: {
          id: recordId
        }
      });

      logger.info('调货记录删除成功', {
        recordId,
        baseId,
        userId,
        service: 'milicard-api'
      });

    } catch (error) {
      logger.error('删除调货记录失败', {
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
   * 获取调货统计信息
   */
  static async getTransferStats(baseId: number): Promise<TransferStatsResponse> {
    try {
      const [totalRecords, pendingRecords, completedRecords, cancelledRecords] = await Promise.all([
        // 总调货记录数
        prisma.transferRecord.count({
          where: { baseId }
        }),
        // 待处理记录数
        prisma.transferRecord.count({
          where: {
            baseId,
            status: 'PENDING'
          }
        }),
        // 已完成记录数
        prisma.transferRecord.count({
          where: {
            baseId,
            status: 'COMPLETED'
          }
        }),
        // 已取消记录数
        prisma.transferRecord.count({
          where: {
            baseId,
            status: 'CANCELLED'
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalRecords,
          pendingRecords,
          completedRecords,
          cancelledRecords
        }
      };

    } catch (error) {
      logger.error('获取调货统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId,
        service: 'milicard-api'
      });
      throw new BaseError('获取调货统计失败', BaseErrorType.DATABASE_ERROR);
    }
  }
}
