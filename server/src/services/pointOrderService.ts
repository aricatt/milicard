import { PrismaClient, Prisma, PointOrderStatus, PaymentStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { StockService } from './stockService';
import { buildGoodsSearchConditions } from '../utils/multilingualHelper';

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
                  nameI18n: true,
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
                nameI18n: true,
                packPerBox: true,
                piecePerPack: true,
                imageUrl: true,
                category: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
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
        select: { id: true, name: true, packPerBox: true },
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
   * @param baseId 基地ID
   * @param keyword 搜索关键词
   * @param dataFilter 数据权限过滤条件（如点位老板只能看到自己的点位）
   */
  static async getAvailablePoints(
    baseId: number, 
    keyword?: string, 
    dataFilter: Record<string, any> = {}
  ) {
    const where: Prisma.PointWhereInput = {
      baseId,
      isActive: true,
      ...dataFilter, // 应用数据权限过滤条件
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
          OR: buildGoodsSearchConditions(keyword),
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
      // 注意：retailPrice 已从 goods 表移至 goods_local_settings，这里使用点位专属单价
      return pointGoods.map(pg => ({
        ...pg.goods,
        // 使用点位专属单价
        retailPrice: pg.unitPrice || 0,
        maxBoxQuantity: pg.maxBoxQuantity,
        maxPackQuantity: pg.maxPackQuantity,
        pointGoodsId: pg.id,
      }));
    }

    // 如果没有指定点位，从基地商品设置中获取（用于管理员场景）
    // 注意：需要从 goods_local_settings 获取价格信息
    const settingsWhere: any = {
      baseId: baseId,
      isActive: true,
    };

    if (keyword) {
      settingsWhere.goods = {
        OR: buildGoodsSearchConditions(keyword),
        isActive: true,
      };
    } else {
      settingsWhere.goods = {
        isActive: true,
      };
    }

    const settings = await prisma.goodsLocalSetting.findMany({
      where: settingsWhere,
      include: {
        goods: {
          select: {
            id: true,
            code: true,
            name: true,
            packPerBox: true,
            piecePerPack: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { goods: { name: 'asc' } },
      take: 50,
    });

    return settings.map((s: any) => ({
      ...s.goods,
      retailPrice: Number(s.retailPrice),
    }));
  }

  /**
   * 确认订单（官方人员）
   */
  static async confirm(id: string, userId: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('只有待确认的订单才能确认');
    }

    const order = await prisma.pointOrder.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmer: { connect: { id: userId } },
      },
      include: {
        point: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('订单确认成功', { orderId: id, confirmedBy: userId });

    return order;
  }

  /**
   * 发货
   */
  static async ship(
    id: string,
    data: {
      deliveryPerson?: string;
      deliveryPhone?: string;
      trackingNumber?: string;
      locationId: number; // 出库仓库ID
    },
    userId: string // 操作人ID
  ) {
    // 获取订单及其商品明细
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
                packPerBox: true,
                piecePerPack: true,
              },
            },
          },
        },
        point: { select: { id: true, code: true, name: true } },
      },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    if (existing.status !== 'CONFIRMED') {
      throw new Error('只有已确认的订单才能发货');
    }

    // 验证仓库是否存在且属于该基地
    const location = await prisma.location.findFirst({
      where: {
        id: data.locationId,
        baseId: existing.baseId,
        isActive: true,
      },
    });

    if (!location) {
      throw new Error('仓库不存在或不属于该基地');
    }

    // 使用统一库存服务检查库存是否充足
    const stockCheckItems = existing.items.map(item => ({
      goodsId: item.goodsId,
      boxQuantity: item.boxQuantity,
      packQuantity: item.packQuantity,
    }));

    const stockCheck = await StockService.batchCheckStock(
      existing.baseId,
      data.locationId,
      stockCheckItems
    );

    if (!stockCheck.allSufficient) {
      const insufficientItems = stockCheck.details
        .filter(d => !d.sufficient)
        .map(d => `${d.goodsName}: 需要 ${d.requiredBox}箱${d.requiredPack}盒，库存仅 ${d.availableBox}箱${d.availablePack}盒`);
      
      throw new Error(`库存不足:\n${insufficientItems.join('\n')}`);
    }

    // 使用事务处理发货、创建出库记录
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      const order = await tx.pointOrder.update({
        where: { id },
        data: {
          status: 'SHIPPING',
          shippedAt: new Date(),
          deliveryPerson: data.deliveryPerson,
          deliveryPhone: data.deliveryPhone,
          trackingNumber: data.trackingNumber,
        },
        include: {
          point: { select: { id: true, code: true, name: true } },
        },
      });

      // 2. 创建出库记录
      for (const item of existing.items) {
        await tx.stockOut.create({
          data: {
            baseId: existing.baseId,
            date: new Date(),
            goodsId: item.goodsId,
            type: 'POINT_ORDER',
            targetName: existing.point?.name || '点位发货',
            relatedOrderId: existing.id,
            relatedOrderCode: existing.code,
            locationId: data.locationId,
            boxQuantity: item.boxQuantity,
            packQuantity: item.packQuantity,
            pieceQuantity: 0,
            remark: `点位订单 ${existing.code} 发货`,
            createdBy: userId,
          },
        });
      }

      return order;
    });

    logger.info('订单发货成功', {
      orderId: id,
      locationId: data.locationId,
      itemCount: existing.items.length,
    });

    return result;
  }

  /**
   * 获取订单商品的库存信息（用于发货前显示）
   */
  static async getOrderInventory(orderId: string, locationId: number) {
    const order = await prisma.pointOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
                packPerBox: true,
                piecePerPack: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    const inventoryInfo = [];

    for (const item of order.items) {
      // 使用统一库存服务查询库存
      const stock = await StockService.getStock(order.baseId, item.goodsId, locationId);

      const packPerBox = item.goods.packPerBox || 1;
      const requiredPacks = item.boxQuantity * packPerBox + item.packQuantity;

      inventoryInfo.push({
        goodsId: item.goodsId,
        goodsCode: item.goods.code,
        goodsName: item.goods.name,
        packPerBox,
        requiredBox: item.boxQuantity,
        requiredPack: item.packQuantity,
        requiredTotal: requiredPacks,
        availableBox: stock.currentBox,
        availablePack: stock.currentPack,
        availableTotal: stock.totalPacks,
        sufficient: stock.totalPacks >= requiredPacks,
      });
    }

    return inventoryInfo;
  }

  /**
   * 确认送达
   */
  static async deliver(id: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    if (existing.status !== 'SHIPPING') {
      throw new Error('只有配送中的订单才能确认送达');
    }

    const order = await prisma.pointOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
      include: {
        point: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('订单送达确认成功', { orderId: id });

    return order;
  }

  /**
   * 确认收款
   */
  static async confirmPayment(
    id: string,
    data: {
      amount: number;
      paymentMethod?: string;
      notes?: string;
    }
  ) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    // 已确认及之后的状态都可以收款（支持先款后货）
    if (!['CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(existing.status)) {
      throw new Error('只有已确认及之后状态的订单才能收款');
    }

    const newPaidAmount = Number(existing.paidAmount) + data.amount;
    const totalAmount = Number(existing.totalAmount);

    // 计算付款状态
    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    if (newPaidAmount <= 0) {
      paymentStatus = 'UNPAID';
    } else if (newPaidAmount >= totalAmount) {
      paymentStatus = 'PAID';
    } else {
      paymentStatus = 'PARTIAL';
    }

    // 构建付款备注
    const paymentNote = `${new Date().toLocaleString('zh-CN')} 收款 ${data.amount} 元${data.paymentMethod ? `（${data.paymentMethod}）` : ''}${data.notes ? `，${data.notes}` : ''}`;
    const paymentNotes = existing.paymentNotes 
      ? `${existing.paymentNotes}\n${paymentNote}`
      : paymentNote;

    const order = await prisma.pointOrder.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus,
        paymentNotes,
      },
      include: {
        point: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('订单收款确认成功', { orderId: id, amount: data.amount, newPaidAmount });

    return order;
  }

  /**
   * 完成订单
   */
  static async complete(id: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    if (existing.status !== 'DELIVERED') {
      throw new Error('只有已送达的订单才能完成');
    }

    const order = await prisma.pointOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        point: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('订单完成', { orderId: id });

    return order;
  }

  /**
   * 确认收货（点位老板）
   * 点位老板确认收到货物，订单状态从"配送中"变为"已完成"
   * 与"确认送达"类似，但由点位老板操作，且直接完成订单
   */
  static async receive(id: string, userId: string) {
    const existing = await prisma.pointOrder.findUnique({
      where: { id },
      include: {
        point: true,
      },
    });

    if (!existing) {
      throw new Error('订单不存在');
    }

    // 配送中或已送达状态都可以确认收货
    if (!['SHIPPING', 'DELIVERED'].includes(existing.status)) {
      throw new Error('只有配送中或已送达的订单才能确认收货');
    }

    // TODO: 可以在这里校验 userId 是否是该点位的老板
    // if (existing.point.ownerId !== userId) {
    //   throw new Error('只有点位老板才能确认收货');
    // }

    const order = await prisma.pointOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        // 如果还没有送达时间，也记录一下
        deliveredAt: existing.deliveredAt || new Date(),
      },
      include: {
        point: { select: { id: true, code: true, name: true } },
      },
    });

    logger.info('点位老板确认收货', { orderId: id, receivedBy: userId });

    return order;
  }
}
