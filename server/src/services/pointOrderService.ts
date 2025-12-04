import { PrismaClient, Prisma, PointOrderStatus, PaymentStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PointOrderListParams {
  baseId: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  pointId?: string;
  status?: PointOrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  dataFilter?: Record<string, any>;
}

export interface CreatePointOrderData {
  pointId: string;
  baseId: number;
  orderDate: string;
  shippingAddress?: string;
  shippingPhone?: string;
  customerNotes?: string;
  createdBy: string;
  items: {
    goodsId: string;
    boxQuantity: number;
    packQuantity: number;
    unitPrice: number;
  }[];
}

export interface UpdatePointOrderData {
  status?: PointOrderStatus;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paymentNotes?: string;
  shippingAddress?: string;
  shippingPhone?: string;
  trackingNumber?: string;
  deliveryPerson?: string;
  deliveryPhone?: string;
  staffNotes?: string;
  confirmedBy?: string;
  items?: {
    id?: string;
    goodsId: string;
    boxQuantity: number;
    packQuantity: number;
    unitPrice: number;
    actualBoxQty?: number;
    actualPackQty?: number;
  }[];
}

export class PointOrderService {
  /**
   * 生成订单编号
   * 格式: PTO-XXXXXXXXXXX (11位随机字符)
   */
  static async generateCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 11; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PTO-${randomPart}`;
  }

  /**
   * 获取点位订单列表
   */
  static async getList(params: PointOrderListParams) {
    const {
      baseId,
      page = 1,
      pageSize = 20,
      keyword,
      pointId,
      status,
      paymentStatus,
      startDate,
      endDate,
      dataFilter = {},
    } = params;

    const where: Prisma.PointOrderWhereInput = {
      baseId,
      ...dataFilter,
    };

    if (pointId) {
      where.pointId = pointId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.orderDate.lte = new Date(endDate);
      }
    }

    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { point: { name: { contains: keyword, mode: 'insensitive' } } },
        { point: { code: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.pointOrder.count({ where }),
      prisma.pointOrder.findMany({
        where,
        include: {
          point: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          confirmer: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          items: {
            include: {
              goods: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  retailPrice: true,
                  packPerBox: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取订单详情
   */
  static async getById(id: string) {
    const order = await prisma.pointOrder.findUnique({
      where: { id },
      include: {
        point: {
          select: {
            id: true,
            code: true,
            name: true,
            address: true,
            contactPerson: true,
            contactPhone: true,
            owner: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            dealer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        base: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        confirmer: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        items: {
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
                retailPrice: true,
                packPerBox: true,
                piecePerPack: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    return order;
  }

  /**
   * 创建点位订单
   */
  static async create(data: CreatePointOrderData) {
    const code = await this.generateCode();

    // 验证点位存在
    const point = await prisma.point.findUnique({
      where: { id: data.pointId },
    });

    if (!point) {
      throw new Error('点位不存在');
    }

    if (!point.isActive) {
      throw new Error('该点位已停用，无法下单');
    }

    // 验证商品并计算总金额
    let totalAmount = 0;
    const itemsData: Prisma.PointOrderItemCreateManyPointOrderInput[] = [];

    for (const item of data.items) {
      const goods = await prisma.goods.findUnique({
        where: { id: item.goodsId },
        select: { id: true, name: true, retailPrice: true, packPerBox: true },
      });

      if (!goods) {
        throw new Error(`商品不存在: ${item.goodsId}`);
      }

      // 计算总盒数和总价
      const totalPacks = item.boxQuantity * (goods.packPerBox || 1) + item.packQuantity;
      const itemTotal = totalPacks * item.unitPrice;
      totalAmount += itemTotal;

      itemsData.push({
        goodsId: item.goodsId,
        boxQuantity: item.boxQuantity,
        packQuantity: item.packQuantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      });
    }

    // 创建订单
    const order = await prisma.pointOrder.create({
      data: {
        code,
        pointId: data.pointId,
        baseId: data.baseId,
        orderDate: new Date(data.orderDate),
        totalAmount,
        shippingAddress: data.shippingAddress || point.address,
        shippingPhone: data.shippingPhone || point.contactPhone,
        customerNotes: data.customerNotes,
        createdBy: data.createdBy,
        items: {
          createMany: {
            data: itemsData,
          },
        },
      },
      include: {
        point: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: {
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    logger.info('创建点位订单成功', { orderId: order.id, code: order.code });

    return order;
  }

  /**
   * 更新订单
   */
  static async update(id: string, data: UpdatePointOrderData, userId: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    // 构建更新数据
    const updateData: Prisma.PointOrderUpdateInput = {};

    // 状态变更处理
    if (data.status && data.status !== existing.status) {
      updateData.status = data.status;

      // 记录状态变更时间
      switch (data.status) {
        case 'CONFIRMED':
          updateData.confirmedAt = new Date();
          updateData.confirmer = { connect: { id: userId } };
          break;
        case 'SHIPPING':
          updateData.shippedAt = new Date();
          break;
        case 'DELIVERED':
          updateData.deliveredAt = new Date();
          break;
        case 'COMPLETED':
          updateData.completedAt = new Date();
          break;
        case 'CANCELLED':
          updateData.cancelledAt = new Date();
          break;
      }
    }

    // 付款信息
    if (data.paymentStatus !== undefined) {
      updateData.paymentStatus = data.paymentStatus;
    }
    if (data.paidAmount !== undefined) {
      updateData.paidAmount = data.paidAmount;
    }
    if (data.paymentNotes !== undefined) {
      updateData.paymentNotes = data.paymentNotes;
    }

    // 配送信息
    if (data.shippingAddress !== undefined) {
      updateData.shippingAddress = data.shippingAddress;
    }
    if (data.shippingPhone !== undefined) {
      updateData.shippingPhone = data.shippingPhone;
    }
    if (data.trackingNumber !== undefined) {
      updateData.trackingNumber = data.trackingNumber;
    }
    if (data.deliveryPerson !== undefined) {
      updateData.deliveryPerson = data.deliveryPerson;
    }
    if (data.deliveryPhone !== undefined) {
      updateData.deliveryPhone = data.deliveryPhone;
    }
    if (data.staffNotes !== undefined) {
      updateData.staffNotes = data.staffNotes;
    }

    // 更新订单明细（如果提供）
    if (data.items && data.items.length > 0) {
      // 只有待确认状态才能修改明细
      if (existing.status !== 'PENDING') {
        throw new Error('只有待确认状态的订单才能修改商品明细');
      }

      // 删除旧明细，创建新明细
      await prisma.pointOrderItem.deleteMany({
        where: { pointOrderId: id },
      });

      let totalAmount = 0;
      const itemsData: Prisma.PointOrderItemCreateManyInput[] = [];

      for (const item of data.items) {
        const goods = await prisma.goods.findUnique({
          where: { id: item.goodsId },
          select: { packPerBox: true },
        });

        const totalPacks = item.boxQuantity * (goods?.packPerBox || 1) + item.packQuantity;
        const itemTotal = totalPacks * item.unitPrice;
        totalAmount += itemTotal;

        itemsData.push({
          pointOrderId: id,
          goodsId: item.goodsId,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          actualBoxQty: item.actualBoxQty,
          actualPackQty: item.actualPackQty,
        });
      }

      await prisma.pointOrderItem.createMany({
        data: itemsData,
      });

      updateData.totalAmount = totalAmount;
    }

    const order = await prisma.pointOrder.update({
      where: { id },
      data: updateData,
      include: {
        point: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: {
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    logger.info('更新点位订单成功', { orderId: order.id });

    return order;
  }

  /**
   * 删除订单
   */
  static async delete(id: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    // 只有待确认或已取消的订单才能删除
    if (!['PENDING', 'CANCELLED'].includes(existing.status)) {
      throw new Error('只有待确认或已取消的订单才能删除');
    }

    await prisma.pointOrder.delete({
      where: { id },
    });

    logger.info('删除点位订单成功', { orderId: id });

    return { success: true };
  }

  /**
   * 获取订单统计
   */
  static async getStats(baseId: number, params: { startDate?: string; endDate?: string }) {
    const where: Prisma.PointOrderWhereInput = { baseId };

    if (params.startDate || params.endDate) {
      where.orderDate = {};
      if (params.startDate) {
        where.orderDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.orderDate.lte = new Date(params.endDate);
      }
    }

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      completedOrders,
      totalAmountResult,
      unpaidAmountResult,
    ] = await Promise.all([
      prisma.pointOrder.count({ where }),
      prisma.pointOrder.count({ where: { ...where, status: 'PENDING' } }),
      prisma.pointOrder.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.pointOrder.count({ where: { ...where, status: 'SHIPPING' } }),
      prisma.pointOrder.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.pointOrder.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.pointOrder.aggregate({
        where: { ...where, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    const totalAmount = totalAmountResult._sum.totalAmount?.toNumber() || 0;
    const unpaidTotal = unpaidAmountResult._sum.totalAmount?.toNumber() || 0;
    const paidAmount = unpaidAmountResult._sum.paidAmount?.toNumber() || 0;
    const unpaidAmount = unpaidTotal - paidAmount;

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      completedOrders,
      totalAmount,
      unpaidAmount,
    };
  }

  /**
   * 获取可选点位列表（用于下单时选择）
   */
  static async getAvailablePoints(baseId: number, keyword?: string) {
    const where: Prisma.PointWhereInput = {
      baseId,
      isActive: true,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const points = await prisma.point.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        contactPerson: true,
        contactPhone: true,
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return points;
  }

  /**
   * 获取可选商品列表（用于下单时选择）
   * 如果指定了pointId，则只返回该点位配置的可购商品
   */
  static async getAvailableGoods(baseId: number, pointId?: string, keyword?: string) {
    // 如果指定了点位，从点位可购商品中获取
    if (pointId) {
      const pointGoodsWhere: Prisma.PointGoodsWhereInput = {
        pointId,
        isActive: true,
      };

      if (keyword) {
        pointGoodsWhere.goods = {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { code: { contains: keyword, mode: 'insensitive' } },
          ],
          isActive: true,
        };
      } else {
        pointGoodsWhere.goods = {
          isActive: true,
        };
      }

      const pointGoods = await prisma.pointGoods.findMany({
        where: pointGoodsWhere,
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true,
              retailPrice: true,
              packPerBox: true,
              piecePerPack: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { goods: { name: 'asc' } },
        take: 50,
      });

      // 返回商品信息，并附带点位专属配置
      return pointGoods.map(pg => ({
        ...pg.goods,
        // 如果点位有专属单价，使用专属单价；否则使用商品默认价格
        retailPrice: pg.unitPrice || pg.goods.retailPrice,
        maxBoxQuantity: pg.maxBoxQuantity,
        maxPackQuantity: pg.maxPackQuantity,
        pointGoodsId: pg.id,
      }));
    }

    // 如果没有指定点位，返回所有商品（用于管理员场景）
    const where: Prisma.GoodsWhereInput = {
      isActive: true,
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const goods = await prisma.goods.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        retailPrice: true,
        packPerBox: true,
        piecePerPack: true,
        imageUrl: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return goods;
  }
}
