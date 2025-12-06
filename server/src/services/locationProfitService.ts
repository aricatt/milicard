import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface LocationProfitParams {
  baseId: number;
  pointId: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  notes?: string;
  createdBy: string;
}

export interface LocationProfitResult {
  id: string;
  pointId: string;
  pointCode: string;
  pointName: string;
  startDate: string;
  endDate: string;
  totalSalesAmount: number;    // 拿货金额（销售总额）
  totalCostAmount: number;     // 采购成本
  profitAmount: number;        // 利润金额
  profitRate: number;          // 利润率 (%)
  notes?: string;
  createdAt: Date;
  createdBy: string;
  creatorName?: string;
}

// 利润预览结果（包含详细计算过程）
export interface LocationProfitPreview {
  pointId: string;
  pointCode: string;
  pointName: string;
  startDate: string;
  endDate: string;
  // 订单统计
  orderCount: number;          // 订单数量
  totalSalesAmount: number;    // 拿货金额（销售总额）
  // 商品成本明细
  goodsCostDetails: {
    goodsId: string;
    goodsCode: string;
    goodsName: string;
    totalPackQuantity: number; // 总盒数
    avgCostPerPack: number;    // 平均成本/盒
    totalCost: number;         // 该商品总成本
  }[];
  totalCostAmount: number;     // 采购成本总计
  profitAmount: number;        // 利润金额
  profitRate: number;          // 利润率 (%)
}

export interface LocationProfitListParams {
  baseId: number;
  page?: number;
  pageSize?: number;
  pointId?: string;
  startDate?: string;
  endDate?: string;
}

export class LocationProfitService {
  /**
   * 获取商品的平均采购单价（每盒）
   * 从 inventory 表读取该商品的移动加权平均成本（averageCost 是每箱成本）
   */
  static async getGoodsAverageCostPerPack(goodsId: string, baseId: number): Promise<number> {
    // 从 inventory 表获取该商品的平均成本
    const inventory = await prisma.inventory.findUnique({
      where: {
        goodsId_baseId: {
          goodsId,
          baseId,
        },
      },
      include: {
        goods: true,
      },
    });

    if (!inventory) {
      // 没有库存记录，成本按0计算
      return 0;
    }

    // averageCost 是每箱的平均成本，需要转换为每盒成本
    const averageCostPerBox = Number(inventory.averageCost);
    const packPerBox = inventory.goods?.packPerBox || 1;

    // 每盒成本 = 每箱成本 / 每箱盒数
    return averageCostPerBox / packPerBox;
  }

  /**
   * 预览利润计算（不保存，返回详细计算过程）
   */
  static async previewProfit(params: {
    baseId: number;
    pointId: string;
    startDate: string;
    endDate: string;
  }): Promise<LocationProfitPreview> {
    const { baseId, pointId, startDate, endDate } = params;

    // 1. 获取点位信息
    const point = await prisma.point.findUnique({
      where: { id: pointId },
    });

    if (!point) {
      throw new Error('点位不存在');
    }

    // 2. 获取日期范围内该点位的所有已完成订单
    const orders = await prisma.pointOrder.findMany({
      where: {
        pointId,
        baseId,
        orderDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: {
          in: ['COMPLETED', 'DELIVERED', 'SHIPPING'],
        },
      },
      include: {
        items: {
          include: {
            goods: true,
          },
        },
      },
    });

    // 3. 计算拿货金额
    let totalSalesAmount = 0;
    for (const order of orders) {
      totalSalesAmount += Number(order.totalAmount);
    }

    // 4. 收集所有商品及其数量
    const goodsQuantityMap = new Map<string, { packQuantity: number; goods: any }>();
    
    for (const order of orders) {
      for (const item of order.items) {
        const existing = goodsQuantityMap.get(item.goodsId);
        const packPerBox = item.goods?.packPerBox || 1;
        const itemPacks = item.boxQuantity * packPerBox + item.packQuantity;
        
        if (existing) {
          existing.packQuantity += itemPacks;
        } else {
          goodsQuantityMap.set(item.goodsId, {
            packQuantity: itemPacks,
            goods: item.goods,
          });
        }
      }
    }

    // 5. 计算每个商品的成本明细
    const goodsCostDetails: LocationProfitPreview['goodsCostDetails'] = [];
    let totalCostAmount = 0;

    for (const [goodsId, data] of goodsQuantityMap) {
      const avgCostPerPack = await this.getGoodsAverageCostPerPack(goodsId, baseId);
      const totalCost = avgCostPerPack * data.packQuantity;
      totalCostAmount += totalCost;

      goodsCostDetails.push({
        goodsId,
        goodsCode: data.goods?.code || '',
        goodsName: data.goods?.name || '',
        totalPackQuantity: data.packQuantity,
        avgCostPerPack: Math.round(avgCostPerPack * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
      });
    }

    // 6. 计算利润
    const profitAmount = totalSalesAmount - totalCostAmount;
    const profitRate = totalSalesAmount > 0 ? (profitAmount / totalSalesAmount) * 100 : 0;

    return {
      pointId,
      pointCode: point.code,
      pointName: point.name,
      startDate,
      endDate,
      orderCount: orders.length,
      totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
      goodsCostDetails,
      totalCostAmount: Math.round(totalCostAmount * 100) / 100,
      profitAmount: Math.round(profitAmount * 100) / 100,
      profitRate: Math.round(profitRate * 100) / 100,
    };
  }

  /**
   * 计算指定点位在日期范围内的利润
   */
  static async calculateProfit(params: LocationProfitParams): Promise<LocationProfitResult> {
    const { baseId, pointId, startDate, endDate, notes, createdBy } = params;

    // 1. 获取点位信息
    const point = await prisma.point.findUnique({
      where: { id: pointId },
    });

    if (!point) {
      throw new Error('点位不存在');
    }

    // 2. 获取日期范围内该点位的所有已完成订单
    const orders = await prisma.pointOrder.findMany({
      where: {
        pointId,
        baseId,
        orderDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        // 只计算已完成或已发货的订单
        status: {
          in: ['COMPLETED', 'DELIVERED', 'SHIPPING'],
        },
      },
      include: {
        items: {
          include: {
            goods: true,
          },
        },
      },
    });

    // 3. 计算拿货金额（销售总额）
    let totalSalesAmount = 0;
    for (const order of orders) {
      totalSalesAmount += Number(order.totalAmount);
    }

    // 4. 计算采购成本
    let totalCostAmount = 0;
    
    // 收集所有商品及其数量
    const goodsQuantityMap = new Map<string, { packQuantity: number; goods: any }>();
    
    for (const order of orders) {
      for (const item of order.items) {
        const existing = goodsQuantityMap.get(item.goodsId);
        // 计算总盒数：boxQuantity * packPerBox + packQuantity
        const packPerBox = item.goods?.packPerBox || 1;
        const itemPacks = item.boxQuantity * packPerBox + item.packQuantity;
        
        if (existing) {
          existing.packQuantity += itemPacks;
        } else {
          goodsQuantityMap.set(item.goodsId, {
            packQuantity: itemPacks,
            goods: item.goods,
          });
        }
      }
    }

    // 计算每个商品的成本
    for (const [goodsId, data] of goodsQuantityMap) {
      const avgCostPerPack = await this.getGoodsAverageCostPerPack(goodsId, baseId);
      const itemCost = avgCostPerPack * data.packQuantity;
      totalCostAmount += itemCost;
    }

    // 5. 计算利润
    const profitAmount = totalSalesAmount - totalCostAmount;
    const profitRate = totalSalesAmount > 0 ? (profitAmount / totalSalesAmount) * 100 : 0;

    // 6. 保存利润记录
    const profitRecord = await prisma.locationProfit.create({
      data: {
        pointId,
        baseId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalSalesAmount: new Prisma.Decimal(totalSalesAmount),
        totalCostAmount: new Prisma.Decimal(totalCostAmount),
        profitAmount: new Prisma.Decimal(profitAmount),
        profitRate: new Prisma.Decimal(profitRate),
        notes,
        createdBy,
      },
      include: {
        point: true,
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    logger.info('点位利润计算完成', {
      pointId,
      startDate,
      endDate,
      totalSalesAmount,
      totalCostAmount,
      profitAmount,
      profitRate,
    });

    return {
      id: profitRecord.id,
      pointId: profitRecord.pointId,
      pointCode: profitRecord.point.code,
      pointName: profitRecord.point.name,
      startDate: profitRecord.startDate.toISOString().split('T')[0],
      endDate: profitRecord.endDate.toISOString().split('T')[0],
      totalSalesAmount: Number(profitRecord.totalSalesAmount),
      totalCostAmount: Number(profitRecord.totalCostAmount),
      profitAmount: Number(profitRecord.profitAmount),
      profitRate: Number(profitRecord.profitRate),
      notes: profitRecord.notes || undefined,
      createdAt: profitRecord.createdAt,
      createdBy: profitRecord.createdBy,
      creatorName: profitRecord.creator?.name || profitRecord.creator?.username,
    };
  }

  /**
   * 获取利润记录列表
   */
  static async getList(params: LocationProfitListParams) {
    const { baseId, page = 1, pageSize = 20, pointId, startDate, endDate } = params;

    const where: Prisma.LocationProfitWhereInput = {
      baseId,
    };

    if (pointId) {
      where.pointId = pointId;
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) };
    }

    const [total, data] = await Promise.all([
      prisma.locationProfit.count({ where }),
      prisma.locationProfit.findMany({
        where,
        include: {
          point: true,
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: data.map((record) => ({
        id: record.id,
        pointId: record.pointId,
        pointCode: record.point.code,
        pointName: record.point.name,
        startDate: record.startDate.toISOString().split('T')[0],
        endDate: record.endDate.toISOString().split('T')[0],
        totalSalesAmount: Number(record.totalSalesAmount),
        totalCostAmount: Number(record.totalCostAmount),
        profitAmount: Number(record.profitAmount),
        profitRate: Number(record.profitRate),
        notes: record.notes,
        createdAt: record.createdAt,
        createdBy: record.createdBy,
        creatorName: record.creator?.name || record.creator?.username,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取单条利润记录
   */
  static async getById(id: string): Promise<LocationProfitResult | null> {
    const record = await prisma.locationProfit.findUnique({
      where: { id },
      include: {
        point: true,
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      pointId: record.pointId,
      pointCode: record.point.code,
      pointName: record.point.name,
      startDate: record.startDate.toISOString().split('T')[0],
      endDate: record.endDate.toISOString().split('T')[0],
      totalSalesAmount: Number(record.totalSalesAmount),
      totalCostAmount: Number(record.totalCostAmount),
      profitAmount: Number(record.profitAmount),
      profitRate: Number(record.profitRate),
      notes: record.notes || undefined,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      creatorName: record.creator?.name || record.creator?.username,
    };
  }

  /**
   * 删除利润记录
   */
  static async delete(id: string): Promise<void> {
    const record = await prisma.locationProfit.findUnique({
      where: { id },
    });

    if (!record) {
      throw new Error('记录不存在');
    }

    await prisma.locationProfit.delete({
      where: { id },
    });

    logger.info('删除点位利润记录', { id });
  }

  /**
   * 获取可选点位列表
   */
  static async getAvailablePoints(baseId: number, keyword?: string) {
    const where: Prisma.PointWhereInput = {
      baseId,
      isActive: true,
    };

    if (keyword) {
      where.OR = [
        { code: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const points = await prisma.point.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: 'asc' },
    });

    return points;
  }
}
