import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';

const prisma = new PrismaClient();

export interface TransferOrderRequest {
  transferNo?: string;  // 可选，支持自动生成
  fromLocationId: string;
  toLocationId: string;
  transferDate: string;
  notes?: string;
  items: TransferOrderItemRequest[];
}

export interface TransferOrderItemRequest {
  goodsId: string;
  quantity: number;
  notes?: string;
}

export interface TransferOrderResponse {
  id: string;
  transferNo: string;
  fromLocationId: string;
  toLocationId: string;
  transferDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  items: TransferOrderItemResponse[];
  fromLocation?: {
    id: string;
    name: string;
    type: string;
  };
  toLocation?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface TransferOrderItemResponse {
  id: string;
  goodsId: string;
  quantity: number;
  notes?: string;
  goods?: {
    id: string;
    code: string;
    name: string;
  };
}

export class TransferService {
  /**
   * 创建调货单
   */
  static async createTransferOrder(data: TransferOrderRequest, userId: string): Promise<TransferOrderResponse> {
    try {
      // 生成或使用提供的调货单号
      const transferNo = data.transferNo || await CodeGenerator.generateTransferOrderCode();

      // 检查调货单号是否已存在
      const existingTransfer = await prisma.transferOrder.findUnique({
        where: { transferNo }
      });

      if (existingTransfer) {
        throw new Error(`调货单号 ${transferNo} 已存在`);
      }

      // 验证调出位置是否存在
      const fromLocation = await prisma.location.findUnique({
        where: { id: data.fromLocationId }
      });

      if (!fromLocation) {
        throw new Error('调出位置不存在');
      }

      // 验证调入位置是否存在
      const toLocation = await prisma.location.findUnique({
        where: { id: data.toLocationId }
      });

      if (!toLocation) {
        throw new Error('调入位置不存在');
      }

      // 验证调出和调入位置不能相同
      if (data.fromLocationId === data.toLocationId) {
        throw new Error('调出位置和调入位置不能相同');
      }

      // 使用事务创建调货单和明细
      const result = await prisma.$transaction(async (tx) => {
        // 创建调货单
        const transferOrder = await tx.transferOrder.create({
          data: {
            transferNo,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            transferDate: new Date(data.transferDate),
            notes: data.notes,
            createdBy: userId,
          },
          include: {
            fromLocation: {
              select: {
                id: true,
                name: true,
                type: true,
              }
            },
            toLocation: {
              select: {
                id: true,
                name: true,
                type: true,
              }
            }
          }
        });

        // 创建调货单明细
        const items = await Promise.all(
          data.items.map(item =>
            tx.transferOrderItem.create({
              data: {
                transferOrderId: transferOrder.id,
                goodsId: item.goodsId,
                quantity: item.quantity,
                notes: item.notes,
              },
              include: {
                goods: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  }
                }
              }
            })
          )
        );

        return { transferOrder, items };
      });

      logger.info('调货单创建成功', {
        transferOrderId: result.transferOrder.id,
        transferNo,
        userId
      });

      return {
        id: result.transferOrder.id,
        transferNo: result.transferOrder.transferNo,
        fromLocationId: result.transferOrder.fromLocationId,
        toLocationId: result.transferOrder.toLocationId,
        transferDate: result.transferOrder.transferDate.toISOString(),
        notes: result.transferOrder.notes || undefined,
        createdBy: result.transferOrder.createdBy,
        createdAt: result.transferOrder.createdAt.toISOString(),
        fromLocation: result.transferOrder.fromLocation,
        toLocation: result.transferOrder.toLocation,
        items: result.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          goods: item.goods ? {
            id: item.goods.id,
            code: item.goods.code,
            name: JSON.parse(item.goods.name)?.zh || item.goods.name,
          } : undefined,
        }))
      };
    } catch (error) {
      logger.error('创建调货单失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        userId
      });
      throw error;
    }
  }

  /**
   * 获取调货单列表
   */
  static async getTransferOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    fromLocationId?: string;
    toLocationId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        fromLocationId,
        toLocationId,
        startDate,
        endDate
      } = params;

      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { transferNo: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { fromLocation: { name: { contains: search, mode: 'insensitive' } } },
          { toLocation: { name: { contains: search, mode: 'insensitive' } } }
        ];
      }
      
      if (fromLocationId) {
        where.fromLocationId = fromLocationId;
      }
      
      if (toLocationId) {
        where.toLocationId = toLocationId;
      }
      
      if (startDate || endDate) {
        where.transferDate = {};
        if (startDate) where.transferDate.gte = new Date(startDate);
        if (endDate) where.transferDate.lte = new Date(endDate);
      }

      const [transferOrders, total] = await Promise.all([
        prisma.transferOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            fromLocation: {
              select: {
                id: true,
                name: true,
                type: true,
              }
            },
            toLocation: {
              select: {
                id: true,
                name: true,
                type: true,
              }
            },
            items: {
              include: {
                goods: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  }
                }
              }
            }
          }
        }),
        prisma.transferOrder.count({ where })
      ]);

      return {
        success: true,
        data: transferOrders.map(order => ({
          id: order.id,
          transferNo: order.transferNo,
          fromLocationId: order.fromLocationId,
          toLocationId: order.toLocationId,
          transferDate: order.transferDate.toISOString(),
          notes: order.notes || undefined,
          createdBy: order.createdBy,
          createdAt: order.createdAt.toISOString(),
          fromLocation: order.fromLocation,
          toLocation: order.toLocation,
          items: order.items.map(item => ({
            id: item.id,
            goodsId: item.goodsId,
            quantity: item.quantity,
            notes: item.notes || undefined,
            goods: item.goods ? {
              id: item.goods.id,
              code: item.goods.code,
              name: JSON.parse(item.goods.name)?.zh || item.goods.name,
            } : undefined,
          }))
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取调货单列表失败', { error, params });
      throw error;
    }
  }

  /**
   * 获取调货单详情
   */
  static async getTransferOrderById(id: string): Promise<TransferOrderResponse> {
    try {
      const transferOrder = await prisma.transferOrder.findUnique({
        where: { id },
        include: {
          fromLocation: {
            select: {
              id: true,
              name: true,
              type: true,
            }
          },
          toLocation: {
            select: {
              id: true,
              name: true,
              type: true,
            }
          },
          items: {
            include: {
              goods: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                }
              }
            }
          }
        }
      });

      if (!transferOrder) {
        throw new Error('调货单不存在');
      }

      return {
        id: transferOrder.id,
        transferNo: transferOrder.transferNo,
        fromLocationId: transferOrder.fromLocationId,
        toLocationId: transferOrder.toLocationId,
        transferDate: transferOrder.transferDate.toISOString(),
        notes: transferOrder.notes || undefined,
        createdBy: transferOrder.createdBy,
        createdAt: transferOrder.createdAt.toISOString(),
        fromLocation: transferOrder.fromLocation,
        toLocation: transferOrder.toLocation,
        items: transferOrder.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          goods: item.goods ? {
            id: item.goods.id,
            code: item.goods.code,
            name: JSON.parse(item.goods.name)?.zh || item.goods.name,
          } : undefined,
        }))
      };
    } catch (error) {
      logger.error('获取调货单详情失败', { error, id });
      throw error;
    }
  }

  /**
   * 删除调货单
   */
  static async deleteTransferOrder(id: string, userId: string): Promise<void> {
    try {
      await prisma.transferOrder.delete({
        where: { id }
      });

      logger.info('调货单删除成功', {
        transferOrderId: id,
        userId
      });
    } catch (error) {
      logger.error('删除调货单失败', { error, id, userId });
      throw error;
    }
  }
}
