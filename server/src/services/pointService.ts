import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PointListParams {
  baseId: number;
  page?: number;
  pageSize?: number;
  keyword?: string;
  isActive?: boolean;
  ownerId?: string;
  dealerId?: string;
}

export interface CreatePointData {
  code?: string;
  name: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  baseId: number;
  ownerId?: string;
  dealerId?: string;
  notes?: string;
}

export interface UpdatePointData {
  name?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  ownerId?: string | null;
  dealerId?: string | null;
  notes?: string;
  isActive?: boolean;
}

export class PointService {
  /**
   * 生成点位编号
   */
  static async generateCode(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `POINT-${timestamp}${random}`;
  }

  /**
   * 获取点位列表
   */
  static async getList(params: PointListParams) {
    const {
      baseId,
      page = 1,
      pageSize = 20,
      keyword,
      isActive,
      ownerId,
      dealerId,
    } = params;

    const where: Prisma.PointWhereInput = {
      baseId,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { address: { contains: keyword, mode: 'insensitive' } },
        { contactPerson: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (dealerId) {
      where.dealerId = dealerId;
    }

    const [total, data] = await Promise.all([
      prisma.point.count({ where }),
      prisma.point.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              name: true,
              phone: true,
            },
          },
          dealer: {
            select: {
              id: true,
              username: true,
              name: true,
              phone: true,
            },
          },
          base: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              pointOrders: true,
              pointInventory: true,
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
   * 获取点位详情
   */
  static async getById(id: string) {
    const point = await prisma.point.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        dealer: {
          select: {
            id: true,
            username: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        base: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            pointOrders: true,
            pointInventory: true,
            pointGoods: true,
          },
        },
      },
    });

    if (!point) {
      throw new Error('点位不存在');
    }

    return point;
  }

  /**
   * 创建点位
   */
  static async create(data: CreatePointData) {
    // 生成编号
    const code = data.code || await this.generateCode();

    // 检查编号是否已存在
    const existing = await prisma.point.findUnique({
      where: { code },
    });

    if (existing) {
      throw new Error('点位编号已存在');
    }

    // 验证基地存在
    const base = await prisma.base.findUnique({
      where: { id: data.baseId },
    });

    if (!base) {
      throw new Error('所属大区不存在');
    }

    // 验证老板用户存在（如果指定）
    if (data.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: data.ownerId },
      });
      if (!owner) {
        throw new Error('指定的老板用户不存在');
      }
    }

    // 验证经销商用户存在（如果指定）
    if (data.dealerId) {
      const dealer = await prisma.user.findUnique({
        where: { id: data.dealerId },
      });
      if (!dealer) {
        throw new Error('指定的经销商用户不存在');
      }
    }

    const point = await prisma.point.create({
      data: {
        code,
        name: data.name,
        address: data.address,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        baseId: data.baseId,
        ownerId: data.ownerId,
        dealerId: data.dealerId,
        notes: data.notes,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        dealer: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        base: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    logger.info('创建点位成功', { pointId: point.id, code: point.code });

    return point;
  }

  /**
   * 更新点位
   */
  static async update(id: string, data: UpdatePointData) {
    // 检查点位是否存在
    const existing = await prisma.point.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('点位不存在');
    }

    // 验证老板用户存在（如果指定）
    if (data.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: data.ownerId },
      });
      if (!owner) {
        throw new Error('指定的老板用户不存在');
      }
    }

    // 验证经销商用户存在（如果指定）
    if (data.dealerId) {
      const dealer = await prisma.user.findUnique({
        where: { id: data.dealerId },
      });
      if (!dealer) {
        throw new Error('指定的经销商用户不存在');
      }
    }

    const point = await prisma.point.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        ownerId: data.ownerId,
        dealerId: data.dealerId,
        notes: data.notes,
        isActive: data.isActive,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        dealer: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        base: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    logger.info('更新点位成功', { pointId: point.id });

    return point;
  }

  /**
   * 删除点位
   */
  static async delete(id: string) {
    // 检查点位是否存在
    const existing = await prisma.point.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            pointOrders: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('点位不存在');
    }

    // 检查是否有关联订单
    if (existing._count.pointOrders > 0) {
      throw new Error('该点位存在关联订单，无法删除');
    }

    await prisma.point.delete({
      where: { id },
    });

    logger.info('删除点位成功', { pointId: id });

    return { success: true };
  }

  /**
   * 获取点位库存
   */
  static async getInventory(pointId: string) {
    const inventory = await prisma.pointInventory.findMany({
      where: { pointId },
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
      orderBy: { updatedAt: 'desc' },
    });

    return inventory;
  }

  /**
   * 获取点位订单列表
   */
  static async getOrders(pointId: string, params: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 20, status } = params;

    const where: Prisma.PointOrderWhereInput = {
      pointId,
    };

    if (status) {
      where.status = status as any;
    }

    const [total, data] = await Promise.all([
      prisma.pointOrder.count({ where }),
      prisma.pointOrder.findMany({
        where,
        include: {
          creator: {
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
                },
              },
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
   * 获取可选用户列表（用于选择老板/经销商）
   */
  static async getAvailableUsers(baseId: number, role?: string) {
    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    // 如果指定了角色，筛选该角色的用户
    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
          isActive: true,
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }
}
