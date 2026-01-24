import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface GlobalSettingInput {
  key: string;
  value: any;
  description?: string;
  category?: string;
  isActive?: boolean;
  isSystem?: boolean;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}

export class GlobalSettingService {
  /**
   * 获取全局配置列表
   */
  static async getList(params: ListParams) {
    const { page = 1, pageSize = 20, search, category, isActive } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      prisma.globalSetting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' },
        ],
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      prisma.globalSetting.count({ where }),
    ]);

    return {
      data,
      pagination: {
        current: page,
        pageSize,
        total,
      },
    };
  }

  /**
   * 根据 ID 获取配置
   */
  static async getById(id: string) {
    return prisma.globalSetting.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * 根据 key 获取配置
   */
  static async getByKey(key: string) {
    return prisma.globalSetting.findUnique({
      where: { key },
    });
  }

  /**
   * 获取配置值（仅返回 value）
   */
  static async getValue(key: string): Promise<any> {
    const setting = await prisma.globalSetting.findUnique({
      where: { key, isActive: true },
      select: { value: true },
    });
    return setting?.value || null;
  }

  /**
   * 批量获取配置值
   */
  static async getValues(keys: string[]): Promise<Record<string, any>> {
    const settings = await prisma.globalSetting.findMany({
      where: {
        key: { in: keys },
        isActive: true,
      },
      select: {
        key: true,
        value: true,
      },
    });

    const result: Record<string, any> = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  }

  /**
   * 创建配置
   */
  static async create(data: GlobalSettingInput, createdBy: string) {
    // 检查 key 是否已存在
    const existing = await prisma.globalSetting.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new Error('配置键名已存在');
    }

    return prisma.globalSetting.create({
      data: {
        key: data.key,
        value: data.value,
        description: data.description,
        category: data.category,
        isActive: data.isActive ?? true,
        isSystem: data.isSystem ?? false,
        creator: {
          connect: { id: createdBy },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * 更新配置
   */
  static async update(id: string, data: Partial<GlobalSettingInput>) {
    const existing = await prisma.globalSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('配置不存在');
    }

    // 系统参数不允许修改 key
    if (existing.isSystem && data.key && data.key !== existing.key) {
      throw new Error('系统预置参数不允许修改键名');
    }

    // 如果更新 key，检查是否与其他记录冲突
    if (data.key && data.key !== existing.key) {
      const conflict = await prisma.globalSetting.findUnique({
        where: { key: data.key },
      });
      if (conflict) {
        throw new Error('配置键名已存在');
      }
    }

    return prisma.globalSetting.update({
      where: { id },
      data: {
        ...(data.key !== undefined && { key: data.key }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isSystem !== undefined && { isSystem: data.isSystem }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * 删除配置
   */
  static async delete(id: string) {
    const existing = await prisma.globalSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('配置不存在');
    }

    // 系统参数不允许删除
    if (existing.isSystem) {
      throw new Error('系统预置参数不允许删除');
    }

    return prisma.globalSetting.delete({
      where: { id },
    });
  }

  /**
   * 获取所有分类
   */
  static async getCategories(): Promise<string[]> {
    const settings = await prisma.globalSetting.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    return settings
      .map(s => s.category)
      .filter((c): c is string => c !== null && c !== undefined)
      .sort();
  }

  /**
   * 批量设置配置值（upsert）
   */
  static async setValues(
    values: Array<{ key: string; value: any; description?: string; category?: string }>,
    createdBy: string
  ) {
    const results = [];

    for (const item of values) {
      const existing = await prisma.globalSetting.findUnique({
        where: { key: item.key },
      });

      if (existing) {
        const updated = await prisma.globalSetting.update({
          where: { key: item.key },
          data: { value: item.value },
        });
        results.push(updated);
      } else {
        const created = await prisma.globalSetting.create({
          data: {
            key: item.key,
            value: item.value,
            description: item.description,
            category: item.category,
            createdBy,
          },
        });
        results.push(created);
      }
    }

    return results;
  }
}
