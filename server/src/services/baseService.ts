import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';
import type {
  BaseItem,
  BaseQueryParams,
  BaseListResponse,
  CreateBaseRequest,
  UpdateBaseRequest,
  BaseResponse,
} from '../types/base';
import { BaseError, BaseErrorType, BaseType } from '../types/base';

/**
 * 基地服务类
 */
export class BaseService {
  /**
   * 获取用户的最高角色层级
   * 层级越小权限越高
   */
  private static async getUserHighestRoleLevel(userId: string): Promise<number> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId, isActive: true },
      include: { role: true },
    });

    if (userRoles.length === 0) {
      return 99; // 无角色，最低权限
    }

    // 返回最小的 level（最高权限）
    return Math.min(...userRoles.map(ur => ur.role.level));
  }

  /**
   * 获取基地列表
   * 根据用户角色层级过滤：
   * - Level 0-1 (SUPER_ADMIN, ADMIN): 返回所有基地
   * - Level 2+ (其他角色): 只返回用户关联的基地
   */
  static async getBaseList(params: BaseQueryParams & { userId?: string }): Promise<BaseListResponse> {
    try {
      const { current = 1, pageSize = 10, name, code, type, userId } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询条件
      const where: any = {};
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }
      if (code) {
        where.code = {
          contains: code,
          mode: 'insensitive',
        };
      }
      if (type) {
        where.type = type;
      }

      // 根据用户角色层级过滤基地
      if (userId) {
        const userLevel = await this.getUserHighestRoleLevel(userId);
        
        // Level 0-1 (SUPER_ADMIN, ADMIN) 可以看到所有基地
        // Level 2+ 只能看到关联的基地
        if (userLevel > 1) {
          // 获取用户关联的基地ID列表
          const userBases = await prisma.userBase.findMany({
            where: { userId, isActive: true },
            select: { baseId: true },
          });
          
          const allowedBaseIds = userBases.map(ub => ub.baseId);
          
          if (allowedBaseIds.length === 0) {
            // 用户没有关联任何基地
            return { data: [], total: 0 };
          }
          
          where.id = { in: allowedBaseIds };
        }
      }

      // 查询数据和总数
      const [bases, total] = await Promise.all([
        prisma.base.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.base.count({ where }),
      ]);

      logger.info('获取基地列表成功', {
        service: 'milicard-api',
        count: bases.length,
        total,
        userId,
      });

      return {
        data: bases,
        total,
      };
    } catch (error) {
      logger.error('获取基地列表失败', { error, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 根据ID获取基地详情
   */
  static async getBaseById(id: number): Promise<BaseResponse> {
    try {
      const base = await prisma.base.findUnique({
        where: { id },
      });

      if (!base) {
        throw new BaseError('基地不存在', BaseErrorType.BASE_NOT_FOUND);
      }

      logger.info('获取基地详情成功', { service: 'milicard-api', baseId: id });

      return {
        id: base.id,
        code: base.code,
        name: base.name,
        type: base.type as BaseType,
        description: base.description,
        address: base.address,
        contactPerson: base.contactPerson,
        contactPhone: base.contactPhone,
        currency: base.currency,
        language: base.language,
        isActive: base.isActive,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('获取基地详情失败', { error, baseId: id, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建基地
   */
  static async createBase(data: CreateBaseRequest, userId: string): Promise<BaseResponse> {
    try {
      let { code, name, type, description, address, contactPerson, contactPhone, currency, language } = data;

      // 验证输入
      if (!name) {
        throw new BaseError('基地名称不能为空', BaseErrorType.VALIDATION_ERROR);
      }

      // 如果没有提供编号，自动生成
      if (!code) {
        code = await CodeGenerator.generateBaseCode();
      } else {
        // 如果提供了编号，检查是否已存在
        const existingBase = await prisma.base.findUnique({
          where: { code },
        });

        if (existingBase) {
          throw new BaseError('基地编号已存在', BaseErrorType.BASE_CODE_EXISTS);
        }
      }

      // 创建基地
      const base = await prisma.base.create({
        data: {
          code,
          name,
          type: type || 'LIVE_BASE',
          description,
          address,
          contactPerson,
          contactPhone,
          currency: currency || 'CNY',
          language: language || 'zh-CN',
          createdBy: userId,
          updatedBy: userId,
        },
      });

      logger.info('创建基地成功', {
        service: 'milicard-api',
        baseId: base.id,
        code: base.code,
        userId,
      });

      return {
        id: base.id,
        code: base.code,
        name: base.name,
        type: base.type as BaseType,
        description: base.description,
        address: base.address,
        contactPerson: base.contactPerson,
        contactPhone: base.contactPhone,
        currency: base.currency,
        language: base.language,
        isActive: base.isActive,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('创建基地失败', { error, data, userId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 更新基地
   */
  static async updateBase(id: number, data: UpdateBaseRequest, userId: string): Promise<BaseResponse> {
    try {
      const { code, name, type, description, address, contactPerson, contactPhone, currency, language } = data;

      // 检查基地是否存在
      const existingBase = await prisma.base.findUnique({
        where: { id },
      });

      if (!existingBase) {
        throw new BaseError('基地不存在', BaseErrorType.BASE_NOT_FOUND);
      }

      // 如果要更新编号，检查新编号是否已被其他基地使用
      if (code && code !== existingBase.code) {
        const codeExists = await prisma.base.findFirst({
          where: {
            code,
            id: { not: id },
          },
        });

        if (codeExists) {
          throw new BaseError('基地编号已存在', BaseErrorType.BASE_CODE_EXISTS);
        }
      }

      // 更新基地
      logger.info('更新基地请求数据', { data, type, service: 'milicard-api' });
      
      const updateData: any = {
        updatedBy: userId,
      };
      if (code) updateData.code = code;
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (address !== undefined) updateData.address = address;
      if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
      if (currency) updateData.currency = currency;
      if (language) updateData.language = language;
      if (type) updateData.type = type;
      
      logger.info('更新基地数据', { updateData, service: 'milicard-api' });

      const base = await prisma.base.update({
        where: { id },
        data: updateData,
      });

      logger.info('更新基地成功', {
        service: 'milicard-api',
        baseId: id,
        userId,
      });

      return {
        id: base.id,
        code: base.code,
        name: base.name,
        type: base.type as BaseType,
        description: base.description,
        address: base.address,
        contactPerson: base.contactPerson,
        contactPhone: base.contactPhone,
        currency: base.currency,
        language: base.language,
        isActive: base.isActive,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error('更新基地失败', { error, baseId: id, data, userId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 删除基地
   */
  static async deleteBase(id: number, userId: string): Promise<void> {
    try {
      // 检查基地是否存在
      const existingBase = await prisma.base.findUnique({
        where: { id },
      });

      if (!existingBase) {
        throw new BaseError('基地不存在', BaseErrorType.BASE_NOT_FOUND);
      }

      // 删除基地
      await prisma.base.delete({
        where: { id },
      });

      logger.info('删除基地成功', {
        service: 'milicard-api',
        baseId: id,
        userId,
      });
    } catch (error) {
      logger.error('删除基地失败', { error, baseId: id, userId, service: 'milicard-api' });
      throw error;
    }
  }
}
