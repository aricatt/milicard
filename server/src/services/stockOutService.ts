/**
 * 出库服务
 */
import { prisma } from '../utils/database';
import { StockOutType, Prisma } from '@prisma/client';
import { buildRelatedGoodsSearchConditions } from '../utils/multilingualHelper';

export interface CreateStockOutDto {
  baseId: number;
  date: Date | string;
  goodsId: string;
  type: StockOutType;
  targetName?: string;
  relatedOrderId?: string;
  relatedOrderCode?: string;
  locationId: number;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  remark?: string;
  createdBy: string;
}

export interface UpdateStockOutDto {
  date?: Date | string;
  goodsId?: string;
  targetName?: string;
  locationId?: number;
  boxQuantity?: number;
  packQuantity?: number;
  pieceQuantity?: number;
  remark?: string;
}

export interface StockOutQueryParams {
  baseId: number;
  page?: number;
  pageSize?: number;
  type?: StockOutType;
  goodsId?: string;
  locationId?: number;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

class StockOutService {
  /**
   * 创建出库记录
   */
  async create(data: CreateStockOutDto) {
    const stockOut = await prisma.stockOut.create({
      data: {
        baseId: data.baseId,
        date: new Date(data.date),
        goodsId: data.goodsId,
        type: data.type,
        targetName: data.targetName,
        relatedOrderId: data.relatedOrderId,
        relatedOrderCode: data.relatedOrderCode,
        locationId: data.locationId,
        boxQuantity: data.boxQuantity || 0,
        packQuantity: data.packQuantity || 0,
        pieceQuantity: data.pieceQuantity || 0,
        remark: data.remark,
        createdBy: data.createdBy,
      },
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
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return stockOut;
  }

  /**
   * 批量创建出库记录（用于点位订单发货）
   */
  async createMany(dataList: CreateStockOutDto[]) {
    const results = await Promise.all(
      dataList.map(data => this.create(data))
    );
    return results;
  }

  /**
   * 获取出库记录列表
   */
  async getList(params: StockOutQueryParams) {
    const {
      baseId,
      page = 1,
      pageSize = 20,
      type,
      goodsId,
      locationId,
      startDate,
      endDate,
      keyword,
    } = params;

    const where: Prisma.StockOutWhereInput = {
      baseId,
    };

    if (type) {
      where.type = type;
    }

    if (goodsId) {
      where.goodsId = goodsId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (keyword) {
      where.OR = [
        { targetName: { contains: keyword, mode: 'insensitive' } },
        { relatedOrderCode: { contains: keyword, mode: 'insensitive' } },
        { remark: { contains: keyword, mode: 'insensitive' } },
        ...buildRelatedGoodsSearchConditions(keyword),
      ];
    }

    const [total, data] = await Promise.all([
      prisma.stockOut.count({ where }),
      prisma.stockOut.findMany({
        where,
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true,
              nameI18n: true,
              packPerBox: true,
              piecePerPack: true,
              category: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          location: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
        ],
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
   * 获取单个出库记录
   */
  async getById(id: string) {
    const stockOut = await prisma.stockOut.findUnique({
      where: { id },
      include: {
        goods: {
          select: {
            id: true,
            code: true,
            name: true,
            nameI18n: true,
            packPerBox: true,
            piecePerPack: true,
            category: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return stockOut;
  }

  /**
   * 更新出库记录（仅手动出库可更新）
   */
  async update(id: string, data: UpdateStockOutDto) {
    const existing = await prisma.stockOut.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('出库记录不存在');
    }

    if (existing.type !== 'MANUAL') {
      throw new Error('只有手动出库记录可以编辑');
    }

    const updateData: Prisma.StockOutUpdateInput = {};

    if (data.date !== undefined) {
      updateData.date = new Date(data.date);
    }
    if (data.goodsId !== undefined) {
      updateData.goods = { connect: { id: data.goodsId } };
    }
    if (data.targetName !== undefined) {
      updateData.targetName = data.targetName;
    }
    if (data.locationId !== undefined) {
      updateData.location = { connect: { id: data.locationId } };
    }
    if (data.boxQuantity !== undefined) {
      updateData.boxQuantity = data.boxQuantity;
    }
    if (data.packQuantity !== undefined) {
      updateData.packQuantity = data.packQuantity;
    }
    if (data.pieceQuantity !== undefined) {
      updateData.pieceQuantity = data.pieceQuantity;
    }
    if (data.remark !== undefined) {
      updateData.remark = data.remark;
    }

    const stockOut = await prisma.stockOut.update({
      where: { id },
      data: updateData,
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
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return stockOut;
  }

  /**
   * 删除出库记录（仅手动出库可删除）
   */
  async delete(id: string) {
    const existing = await prisma.stockOut.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('出库记录不存在');
    }

    if (existing.type !== 'MANUAL') {
      throw new Error('只有手动出库记录可以删除');
    }

    await prisma.stockOut.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * 获取统计数据
   */
  async getStats(baseId: number, startDate?: string, endDate?: string) {
    const where: Prisma.StockOutWhereInput = { baseId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const [total, byType, byLocation] = await Promise.all([
      prisma.stockOut.count({ where }),
      prisma.stockOut.groupBy({
        by: ['type'],
        where,
        _count: { id: true },
      }),
      prisma.stockOut.groupBy({
        by: ['locationId'],
        where,
        _count: { id: true },
      }),
    ]);

    // 获取仓库名称
    const locationIds = byLocation.map(l => l.locationId);
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locations.map(l => [l.id, l.name]));

    return {
      total,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count.id,
      })),
      byLocation: byLocation.map(l => ({
        locationId: l.locationId,
        locationName: locationMap.get(l.locationId) || '未知',
        count: l._count.id,
      })),
    };
  }
}

export const stockOutService = new StockOutService();
