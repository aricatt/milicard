import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';

const prisma = new PrismaClient();

export interface ArrivalOrderRequest {
  arrivalNo?: string;  // 可选，支持自动生成
  purchaseOrderId: string;
  locationId: string;
  arrivalDate: string;
  notes?: string;
  items: ArrivalOrderItemRequest[];
}

export interface ArrivalOrderItemRequest {
  goodsId: string;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export interface ArrivalOrderResponse {
  id: string;
  arrivalNo: string;
  purchaseOrderId: string;
  locationId: string;
  arrivalDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  items: ArrivalOrderItemResponse[];
  purchaseOrder?: {
    id: string;
    orderNo: string;
    supplierName: string;
  };
  location?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ArrivalOrderItemResponse {
  id: string;
  goodsId: string;
  quantity: number;
  unitCost: number;
  notes?: string;
  goods?: {
    id: string;
    code: string;
    name: string;
  };
}

export class ArrivalService {
  /**
   * 创建到货单
   */
  static async createArrivalOrder(data: ArrivalOrderRequest, userId: string): Promise<ArrivalOrderResponse> {
    try {
      // 生成或使用提供的到货单号
      const arrivalNo = data.arrivalNo || await CodeGenerator.generateArrivalOrderCode();

      // 检查到货单号是否已存在
      const existingArrival = await prisma.arrivalOrder.findUnique({
        where: { arrivalNo }
      });

      if (existingArrival) {
        throw new Error(`到货单号 ${arrivalNo} 已存在`);
      }

      // 验证采购订单是否存在
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId }
      });

      if (!purchaseOrder) {
        throw new Error('采购订单不存在');
      }

      // 验证位置是否存在
      const location = await prisma.location.findUnique({
        where: { id: data.locationId }
      });

      if (!location) {
        throw new Error('位置不存在');
      }

      // 使用事务创建到货单和明细
      const result = await prisma.$transaction(async (tx) => {
        // 创建到货单
        const arrivalOrder = await tx.arrivalOrder.create({
          data: {
            arrivalNo,
            purchaseOrderId: data.purchaseOrderId,
            locationId: data.locationId,
            arrivalDate: new Date(data.arrivalDate),
            notes: data.notes,
            createdBy: userId,
          },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNo: true,
                supplierName: true,
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                type: true,
              }
            }
          }
        });

        // 创建到货单明细
        const items = await Promise.all(
          data.items.map(item =>
            tx.arrivalOrderItem.create({
              data: {
                arrivalOrderId: arrivalOrder.id,
                goodsId: item.goodsId,
                quantity: item.quantity,
                unitCost: item.unitCost,
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

        return { arrivalOrder, items };
      });

      logger.info('到货单创建成功', {
        arrivalOrderId: result.arrivalOrder.id,
        arrivalNo,
        userId
      });

      return {
        id: result.arrivalOrder.id,
        arrivalNo: result.arrivalOrder.arrivalNo,
        purchaseOrderId: result.arrivalOrder.purchaseOrderId,
        locationId: result.arrivalOrder.locationId,
        arrivalDate: result.arrivalOrder.arrivalDate.toISOString(),
        notes: result.arrivalOrder.notes || undefined,
        createdBy: result.arrivalOrder.createdBy,
        createdAt: result.arrivalOrder.createdAt.toISOString(),
        purchaseOrder: result.arrivalOrder.purchaseOrder,
        location: result.arrivalOrder.location,
        items: result.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          notes: item.notes || undefined,
          goods: item.goods ? {
            id: item.goods.id,
            code: item.goods.code,
            name: JSON.parse(item.goods.name)?.zh || item.goods.name,
          } : undefined,
        }))
      };
    } catch (error) {
      logger.error('创建到货单失败', {
        error: error instanceof Error ? error.message : String(error),
        data,
        userId
      });
      throw error;
    }
  }

  /**
   * 获取到货单列表
   */
  static async getArrivalOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    purchaseOrderId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        purchaseOrderId,
        locationId,
        startDate,
        endDate
      } = params;

      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { arrivalNo: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { purchaseOrder: { orderNo: { contains: search, mode: 'insensitive' } } },
          { purchaseOrder: { supplierName: { contains: search, mode: 'insensitive' } } }
        ];
      }
      
      if (purchaseOrderId) {
        where.purchaseOrderId = purchaseOrderId;
      }
      
      if (locationId) {
        where.locationId = locationId;
      }
      
      if (startDate || endDate) {
        where.arrivalDate = {};
        if (startDate) where.arrivalDate.gte = new Date(startDate);
        if (endDate) where.arrivalDate.lte = new Date(endDate);
      }

      const [arrivalOrders, total] = await Promise.all([
        prisma.arrivalOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNo: true,
                supplierName: true,
              }
            },
            location: {
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
        prisma.arrivalOrder.count({ where })
      ]);

      return {
        success: true,
        data: arrivalOrders.map(order => ({
          id: order.id,
          arrivalNo: order.arrivalNo,
          purchaseOrderId: order.purchaseOrderId,
          locationId: order.locationId,
          arrivalDate: order.arrivalDate.toISOString(),
          notes: order.notes || undefined,
          createdBy: order.createdBy,
          createdAt: order.createdAt.toISOString(),
          purchaseOrder: order.purchaseOrder,
          location: order.location,
          items: order.items.map(item => ({
            id: item.id,
            goodsId: item.goodsId,
            quantity: item.quantity,
            unitCost: Number(item.unitCost),
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
      logger.error('获取到货单列表失败', { error, params });
      throw error;
    }
  }

  /**
   * 获取到货单详情
   */
  static async getArrivalOrderById(id: string): Promise<ArrivalOrderResponse> {
    try {
      const arrivalOrder = await prisma.arrivalOrder.findUnique({
        where: { id },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              orderNo: true,
              supplierName: true,
            }
          },
          location: {
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

      if (!arrivalOrder) {
        throw new Error('到货单不存在');
      }

      return {
        id: arrivalOrder.id,
        arrivalNo: arrivalOrder.arrivalNo,
        purchaseOrderId: arrivalOrder.purchaseOrderId,
        locationId: arrivalOrder.locationId,
        arrivalDate: arrivalOrder.arrivalDate.toISOString(),
        notes: arrivalOrder.notes || undefined,
        createdBy: arrivalOrder.createdBy,
        createdAt: arrivalOrder.createdAt.toISOString(),
        purchaseOrder: arrivalOrder.purchaseOrder,
        location: arrivalOrder.location,
        items: arrivalOrder.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          notes: item.notes || undefined,
          goods: item.goods ? {
            id: item.goods.id,
            code: item.goods.code,
            name: JSON.parse(item.goods.name)?.zh || item.goods.name,
          } : undefined,
        }))
      };
    } catch (error) {
      logger.error('获取到货单详情失败', { error, id });
      throw error;
    }
  }

  /**
   * 删除到货单
   */
  static async deleteArrivalOrder(id: string, userId: string): Promise<void> {
    try {
      await prisma.arrivalOrder.delete({
        where: { id }
      });

      logger.info('到货单删除成功', {
        arrivalOrderId: id,
        userId
      });
    } catch (error) {
      logger.error('删除到货单失败', { error, id, userId });
      throw error;
    }
  }
}
