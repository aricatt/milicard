import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import type {
  BaseItem,
  BaseQueryParams,
  BaseListResponse,
  CreateBaseRequest,
  UpdateBaseRequest,
  BaseResponse,
} from '../types/base';
import { BaseError, BaseErrorType } from '../types/base';

/**
 * 基地服务类
 */
export class BaseService {
  /**
   * 获取基地列表
   */
  static async getBaseList(params: BaseQueryParams): Promise<BaseListResponse> {
    try {
      const { current = 1, pageSize = 10, name, code } = params;
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
        params,
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
      const { code, name } = data;

      // 验证输入
      if (!code || !name) {
        throw new BaseError('基地编号和名称不能为空', BaseErrorType.VALIDATION_ERROR);
      }

      // 检查编号是否已存在
      const existingBase = await prisma.base.findUnique({
        where: { code },
      });

      if (existingBase) {
        throw new BaseError('基地编号已存在', BaseErrorType.BASE_CODE_EXISTS);
      }

      // 创建基地
      const base = await prisma.base.create({
        data: {
          code,
          name,
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
      const { code, name } = data;

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
      const updateData: any = {
        updatedBy: userId,
      };
      if (code) updateData.code = code;
      if (name) updateData.name = name;

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
