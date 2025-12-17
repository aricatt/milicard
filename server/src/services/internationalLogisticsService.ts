import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';

export interface CreateInternationalLogisticsData {
  purchaseOrderId: string;
  batchNo: string;
  boxNo: string;
  length: number;
  width: number;
  height: number;
  freightRate: number;
}

export interface InternationalLogisticsResponse {
  id: string;
  purchaseOrderId: string;
  batchNo: string;
  boxNo: string;
  length: number;
  width: number;
  height: number;
  freightRate: number;
  volume: number;       // 体积(方) - 计算值
  freight: number;      // 运费 - 计算值
  createdAt: Date;
  updatedAt: Date;
}

export class InternationalLogisticsService {
  /**
   * 计算体积（立方米/方）
   * 长宽高单位为cm，需要转换为m
   */
  private static calculateVolume(length: number, width: number, height: number): number {
    // cm转m: 除以100
    const volumeM3 = (length / 100) * (width / 100) * (height / 100);
    return Math.round(volumeM3 * 10000) / 10000; // 保留4位小数
  }

  /**
   * 计算运费
   */
  private static calculateFreight(volume: number, freightRate: number): number {
    return Math.round(volume * freightRate * 100) / 100; // 保留2位小数
  }

  /**
   * 转换为响应格式（包含计算字段）
   */
  private static toResponse(record: any): InternationalLogisticsResponse {
    const length = Number(record.length);
    const width = Number(record.width);
    const height = Number(record.height);
    const freightRate = Number(record.freightRate);
    const volume = this.calculateVolume(length, width, height);
    const freight = this.calculateFreight(volume, freightRate);

    return {
      id: record.id,
      purchaseOrderId: record.purchaseOrderId,
      batchNo: record.batchNo,
      boxNo: record.boxNo,
      length,
      width,
      height,
      freightRate,
      volume,
      freight,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * 创建国际货运记录
   */
  static async create(data: CreateInternationalLogisticsData): Promise<InternationalLogisticsResponse> {
    try {
      // 验证必填字段
      if (!data.batchNo || !data.boxNo) {
        throw new BaseError('批次和箱号不能为空', BaseErrorType.VALIDATION_ERROR);
      }
      if (data.length <= 0 || data.width <= 0 || data.height <= 0) {
        throw new BaseError('长、宽、高必须大于0', BaseErrorType.VALIDATION_ERROR);
      }
      if (data.freightRate <= 0) {
        throw new BaseError('运费系数必须大于0', BaseErrorType.VALIDATION_ERROR);
      }

      // 验证采购单是否存在
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId }
      });
      if (!purchaseOrder) {
        throw new BaseError('采购单不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 检查批次+箱号是否重复
      const existing = await prisma.internationalLogistics.findUnique({
        where: {
          batchNo_boxNo: {
            batchNo: data.batchNo,
            boxNo: data.boxNo
          }
        }
      });
      if (existing) {
        throw new BaseError(`批次"${data.batchNo}"和箱号"${data.boxNo}"已存在`, BaseErrorType.VALIDATION_ERROR);
      }

      const record = await prisma.internationalLogistics.create({
        data: {
          purchaseOrderId: data.purchaseOrderId,
          batchNo: data.batchNo,
          boxNo: data.boxNo,
          length: data.length,
          width: data.width,
          height: data.height,
          freightRate: data.freightRate,
        }
      });

      logger.info('国际货运记录创建成功', {
        id: record.id,
        purchaseOrderId: data.purchaseOrderId,
        batchNo: data.batchNo,
        boxNo: data.boxNo,
        service: 'milicard-api'
      });

      return this.toResponse(record);
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('创建国际货运记录失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 获取采购单的国际货运记录列表
   */
  static async getByPurchaseOrderId(purchaseOrderId: string): Promise<InternationalLogisticsResponse[]> {
    try {
      const records = await prisma.internationalLogistics.findMany({
        where: { purchaseOrderId },
        orderBy: [
          { batchNo: 'asc' },
          { boxNo: 'asc' }
        ]
      });

      return records.map(record => this.toResponse(record));
    } catch (error) {
      logger.error('获取国际货运记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        purchaseOrderId,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 根据ID获取国际货运记录
   */
  static async getById(id: string): Promise<InternationalLogisticsResponse | null> {
    try {
      const record = await prisma.internationalLogistics.findUnique({
        where: { id }
      });

      if (!record) {
        return null;
      }

      return this.toResponse(record);
    } catch (error) {
      logger.error('获取国际货运记录失败', {
        error: error instanceof Error ? error.message : String(error),
        id,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 删除国际货运记录
   */
  static async delete(id: string): Promise<void> {
    try {
      const record = await prisma.internationalLogistics.findUnique({
        where: { id }
      });

      if (!record) {
        throw new BaseError('国际货运记录不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      await prisma.internationalLogistics.delete({
        where: { id }
      });

      logger.info('国际货运记录删除成功', {
        id,
        batchNo: record.batchNo,
        boxNo: record.boxNo,
        service: 'milicard-api'
      });
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('删除国际货运记录失败', {
        error: error instanceof Error ? error.message : String(error),
        id,
        service: 'milicard-api'
      });
      throw error;
    }
  }

  /**
   * 更新国际货运记录
   */
  static async update(id: string, data: Partial<CreateInternationalLogisticsData>): Promise<InternationalLogisticsResponse> {
    try {
      const existing = await prisma.internationalLogistics.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new BaseError('国际货运记录不存在', BaseErrorType.RESOURCE_NOT_FOUND);
      }

      // 如果修改了批次或箱号，检查唯一性
      if (data.batchNo || data.boxNo) {
        const newBatchNo = data.batchNo || existing.batchNo;
        const newBoxNo = data.boxNo || existing.boxNo;
        
        if (newBatchNo !== existing.batchNo || newBoxNo !== existing.boxNo) {
          const duplicate = await prisma.internationalLogistics.findUnique({
            where: {
              batchNo_boxNo: {
                batchNo: newBatchNo,
                boxNo: newBoxNo
              }
            }
          });
          if (duplicate && duplicate.id !== id) {
            throw new BaseError(`批次"${newBatchNo}"和箱号"${newBoxNo}"已存在`, BaseErrorType.VALIDATION_ERROR);
          }
        }
      }

      // 验证数值字段
      if (data.length !== undefined && data.length <= 0) {
        throw new BaseError('长度必须大于0', BaseErrorType.VALIDATION_ERROR);
      }
      if (data.width !== undefined && data.width <= 0) {
        throw new BaseError('宽度必须大于0', BaseErrorType.VALIDATION_ERROR);
      }
      if (data.height !== undefined && data.height <= 0) {
        throw new BaseError('高度必须大于0', BaseErrorType.VALIDATION_ERROR);
      }
      if (data.freightRate !== undefined && data.freightRate <= 0) {
        throw new BaseError('运费系数必须大于0', BaseErrorType.VALIDATION_ERROR);
      }

      const record = await prisma.internationalLogistics.update({
        where: { id },
        data: {
          ...(data.batchNo && { batchNo: data.batchNo }),
          ...(data.boxNo && { boxNo: data.boxNo }),
          ...(data.length && { length: data.length }),
          ...(data.width && { width: data.width }),
          ...(data.height && { height: data.height }),
          ...(data.freightRate && { freightRate: data.freightRate }),
        }
      });

      logger.info('国际货运记录更新成功', {
        id,
        service: 'milicard-api'
      });

      return this.toResponse(record);
    } catch (error) {
      if (error instanceof BaseError) {
        throw error;
      }
      logger.error('更新国际货运记录失败', {
        error: error instanceof Error ? error.message : String(error),
        id,
        data,
        service: 'milicard-api'
      });
      throw error;
    }
  }
}
