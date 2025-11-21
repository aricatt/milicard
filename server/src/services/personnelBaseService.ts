import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';

const prisma = new PrismaClient();

export class PersonnelBaseService {
  /**
   * 获取基地的人员列表
   */
  static async getBasePersonnelList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, name, role, isActive } = params;
      const skip = (Number(current) - 1) * Number(pageSize);
      const take = Number(pageSize);

      // 构建查询条件
      const where: any = {
        baseId: baseId,
      };

      if (name) {
        where.OR = [
          { name: { contains: name } },
          { code: { contains: name } },
        ];
      }

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      // 获取总数
      const total = await prisma.personnel.count({ where });

      // 获取分页数据
      const data = await prisma.personnel.findMany({
        where,
        skip,
        take,
        include: {
          base: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 转换数据格式
      const formattedData = data.map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        role: item.role,
        phone: item.phone,
        email: item.email,
        notes: item.notes,
        baseId: item.baseId,
        baseName: item.base.name,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        creatorName: '系统',
      }));

      logger.info('获取基地人员列表成功', {
        service: 'milicard-api',
        baseId,
        count: formattedData.length,
        total
      });

      return {
        success: true,
        data: formattedData,
        total,
        current: Number(current),
        pageSize: Number(pageSize)
      };
    } catch (error) {
      logger.error('获取基地人员列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建人员
   */
  static async createPersonnel(baseId: number, personnelData: any, createdBy: string) {
    try {
      // 生成业务编号
      const code = await CodeGenerator.generatePersonnelCode(personnelData.role);

      const personnel = await prisma.personnel.create({
        data: {
          code,
          name: personnelData.name,
          role: personnelData.role,
          phone: personnelData.phone,
          email: personnelData.email,
          notes: personnelData.notes,
          baseId: baseId,
          createdBy: createdBy || null,
          updatedBy: createdBy || null,
        },
        include: {
          base: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('创建人员成功', {
        service: 'milicard-api',
        baseId,
        personnelId: personnel.id,
        code: personnel.code,
        name: personnel.name,
        role: personnel.role
      });

      return {
        success: true,
        data: {
          id: personnel.id,
          code: personnel.code,
          name: personnel.name,
          role: personnel.role,
          phone: personnel.phone,
          email: personnel.email,
          notes: personnel.notes,
          baseId: personnel.baseId,
          baseName: personnel.base.name,
          isActive: personnel.isActive,
          createdAt: personnel.createdAt.toISOString(),
          updatedAt: personnel.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      logger.error('创建人员失败', { error, baseId, personnelData, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 更新人员
   */
  static async updatePersonnel(baseId: number, personnelId: string, personnelData: any, updatedBy: string) {
    try {
      // 检查人员是否属于该基地
      const existingPersonnel = await prisma.personnel.findFirst({
        where: {
          id: personnelId,
          baseId: baseId,
        },
      });

      if (!existingPersonnel) {
        throw new Error('人员不存在或不属于该基地');
      }

      const personnel = await prisma.personnel.update({
        where: { id: personnelId },
        data: {
          name: personnelData.name,
          role: personnelData.role,
          phone: personnelData.phone,
          email: personnelData.email,
          notes: personnelData.notes,
          updatedBy,
        },
        include: {
          base: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('更新人员成功', {
        service: 'milicard-api',
        baseId,
        personnelId: personnel.id,
        name: personnel.name
      });

      return {
        success: true,
        data: {
          id: personnel.id,
          code: personnel.code,
          name: personnel.name,
          role: personnel.role,
          phone: personnel.phone,
          email: personnel.email,
          notes: personnel.notes,
          baseId: personnel.baseId,
          baseName: personnel.base.name,
          isActive: personnel.isActive,
          createdAt: personnel.createdAt.toISOString(),
          updatedAt: personnel.updatedAt.toISOString(),
        }
      };
    } catch (error) {
      logger.error('更新人员失败', { error, baseId, personnelId, personnelData, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 删除人员
   */
  static async deletePersonnel(baseId: number, personnelId: string) {
    try {
      // 检查人员是否属于该基地
      const existingPersonnel = await prisma.personnel.findFirst({
        where: {
          id: personnelId,
          baseId: baseId,
        },
      });

      if (!existingPersonnel) {
        throw new Error('人员不存在或不属于该基地');
      }

      await prisma.personnel.delete({
        where: { id: personnelId },
      });

      logger.info('删除人员成功', {
        service: 'milicard-api',
        baseId,
        personnelId,
        name: existingPersonnel.name
      });

      return {
        success: true,
        message: '人员删除成功'
      };
    } catch (error) {
      logger.error('删除人员失败', { error, baseId, personnelId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地人员统计
   */
  static async getBasePersonnelStats(baseId: number) {
    try {
      const [
        totalPersonnel,
        anchors,
        warehouseKeepers,
        activePersonnel
      ] = await Promise.all([
        prisma.personnel.count({
          where: { baseId }
        }),
        prisma.personnel.count({
          where: { baseId, role: 'ANCHOR' }
        }),
        prisma.personnel.count({
          where: { baseId, role: 'WAREHOUSE_KEEPER' }
        }),
        prisma.personnel.count({
          where: { baseId, isActive: true }
        })
      ]);

      const result = {
        totalPersonnel,
        anchors,
        warehouseKeepers,
        activePersonnel
      };

      logger.info('获取基地人员统计成功', {
        service: 'milicard-api',
        baseId,
        stats: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地人员统计失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }


  /**
   * 获取人员详情
   */
  static async getPersonnelById(baseId: number, personnelId: string) {
    try {
      const personnel = await prisma.personnel.findFirst({
        where: {
          id: personnelId,
          baseId: baseId,
        },
        include: {
          base: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!personnel) {
        throw new Error('人员不存在或不属于该基地');
      }

      logger.info('获取人员详情成功', {
        service: 'milicard-api',
        baseId,
        personnelId,
        name: personnel.name
      });

      return {
        success: true,
        data: {
          id: personnel.id,
          code: personnel.code,
          name: personnel.name,
          role: personnel.role,
          phone: personnel.phone,
          email: personnel.email,
          notes: personnel.notes,
          baseId: personnel.baseId,
          baseName: personnel.base.name,
          isActive: personnel.isActive,
          createdAt: personnel.createdAt.toISOString(),
          updatedAt: personnel.updatedAt.toISOString(),
          creatorName: '系统',
        }
      };
    } catch (error) {
      logger.error('获取人员详情失败', { error, baseId, personnelId, service: 'milicard-api' });
      throw error;
    }
  }
}
