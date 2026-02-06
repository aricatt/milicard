/**
 * 数据权限服务
 * 提供行级数据过滤和字段级权限控制
 */
import { PrismaClient } from '@prisma/client';
import { casbinService } from './casbinService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PermissionContext {
  userId: string;
  baseId: number;
  roles: string[];
}

export interface DataFilter {
  [key: string]: any;
}

export interface FieldPermissions {
  readable: string[];
  writable: string[];
}

class DataPermissionService {
  /**
   * 检查用户是否拥有管理员级别权限（基于角色的 level 属性）
   * level <= 1 的角色被视为管理员（0=超级管理员，1=管理员）
   */
  private async isAdminRole(roles: string[]): Promise<boolean> {
    if (roles.length === 0) return false;
    
    const adminRoles = await prisma.role.findMany({
      where: {
        name: { in: roles },
        level: { lte: 1 }, // level 0 或 1 视为管理员
      },
    });
    
    return adminRoles.length > 0;
  }

  /**
   * 获取数据过滤条件
   * 根据用户角色生成 Prisma where 条件
   */
  async getDataFilter(
    ctx: PermissionContext,
    resource: string
  ): Promise<DataFilter> {
    // 管理员级别角色不过滤数据
    if (await this.isAdminRole(ctx.roles)) {
      return {};
    }

    // 获取所有角色的数据权限规则
    const rules = await prisma.dataPermissionRule.findMany({
      where: {
        role: { name: { in: ctx.roles } },
        resource,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    if (rules.length === 0) {
      // 没有规则，返回空过滤（允许访问所有数据）
      // 如果需要默认拒绝，可以返回 { id: 'NONE' }
      logger.debug('No data permission rules found', { userId: ctx.userId, resource, roles: ctx.roles });
      return {};
    }

    // 构建过滤条件
    const filters: DataFilter[] = [];

    for (const rule of rules) {
      try {
        const value = await this.resolveValue(rule, ctx);
        
        if (value === null || value === undefined) {
          continue;
        }

        switch (rule.operator) {
          case 'eq':
            filters.push({ [rule.field]: value });
            break;
          case 'in':
            filters.push({ [rule.field]: { in: Array.isArray(value) ? value : [value] } });
            break;
          case 'contains':
            filters.push({ [rule.field]: { contains: value } });
            break;
          case 'notEq':
            filters.push({ [rule.field]: { not: value } });
            break;
        }
      } catch (error) {
        logger.error('Error resolving data permission rule', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (filters.length === 0) {
      return {};
    }

    // 多个规则用 OR 连接
    const result = filters.length === 1 ? filters[0] : { OR: filters };
    
    logger.debug('Data filter generated', {
      userId: ctx.userId,
      resource,
      filter: JSON.stringify(result),
    });

    return result;
  }

  /**
   * 解析规则值
   */
  private async resolveValue(
    rule: { valueType: string; fixedValue: string | null; field: string },
    ctx: PermissionContext
  ): Promise<any> {
    switch (rule.valueType) {
      case 'currentUser':
        return ctx.userId;

      case 'currentBase':
        return ctx.baseId;

      case 'currentUserBases':
        // 获取用户关联的所有基地
        const userBases = await prisma.userBase.findMany({
          where: { userId: ctx.userId, isActive: true },
          select: { baseId: true },
        });
        return userBases.map((ub) => ub.baseId);

      case 'currentUserPoints':
        // 获取用户拥有的所有点位
        const ownedPoints = await prisma.point.findMany({
          where: { ownerId: ctx.userId },
          select: { id: true },
        });
        return ownedPoints.map((p) => p.id);

      case 'currentUserDealerPoints':
        // 获取用户作为经销商的所有点位
        const dealerPoints = await prisma.point.findMany({
          where: { dealerId: ctx.userId },
          select: { id: true },
        });
        return dealerPoints.map((p) => p.id);

      case 'fixed':
        return rule.fixedValue;

      default:
        logger.warn('Unknown value type in data permission rule', { valueType: rule.valueType });
        return null;
    }
  }

  /**
   * 获取字段权限
   */
  async getFieldPermissions(
    ctx: PermissionContext,
    resource: string
  ): Promise<FieldPermissions> {
    // 管理员级别角色拥有所有字段权限
    if (await this.isAdminRole(ctx.roles)) {
      console.log('🔍 [字段权限查询] 管理员角色，返回所有权限', {
        roles: ctx.roles,
        resource
      });
      return { readable: ['*'], writable: ['*'] };
    }

    const permissions = await prisma.fieldPermission.findMany({
      where: {
        role: { name: { in: ctx.roles } },
        resource,
      },
      include: {
        role: true
      }
    });

    console.log('🔍 [字段权限查询] 数据库查询结果', {
      roles: ctx.roles,
      resource,
      totalPermissions: permissions.length,
      permissions: permissions.map(p => ({
        role: p.role.name,
        field: p.field,
        canRead: p.canRead,
        canWrite: p.canWrite
      }))
    });

    if (permissions.length === 0) {
      // 没有配置字段权限，默认允许所有
      console.log('⚠️ [字段权限查询] 未找到任何字段权限配置，默认允许所有', {
        roles: ctx.roles,
        resource
      });
      return { readable: ['*'], writable: ['*'] };
    }

    // 🔧 修复：当有字段权限配置时，只返回明确允许的字段
    // 如果所有配置的字段都是 canRead=false，说明这是一个限制性配置
    // 此时应该返回空数组，而不是默认允许所有字段
    const readable = permissions.filter((p) => p.canRead).map((p) => p.field);
    const writable = permissions.filter((p) => p.canWrite).map((p) => p.field);

    console.log('🔍 [字段权限查询] 过滤后的结果', {
      roles: ctx.roles,
      resource,
      totalConfigured: permissions.length,
      readableCount: readable.length,
      readable: readable.sort(),
      writableCount: writable.length,
      writable: writable.sort(),
      note: readable.length === 0 ? '⚠️ 所有配置的字段都被禁止，将过滤所有字段' : '✅ 只允许已配置的字段'
    });

    // 🔧 关键修复：如果有字段权限配置但 readable 为空，说明所有字段都被明确禁止
    // 此时应该返回空数组，让 filterObject 过滤掉所有字段（除了 alwaysIncludeFields）
    return { readable, writable };
  }

  /**
   * 过滤响应字段（移除不可读字段）
   */
  filterReadableFields<T extends Record<string, any>>(
    data: T,
    allowedFields: string[]
  ): Partial<T> {
    if (allowedFields.includes('*')) {
      return data;
    }

    const filtered: Partial<T> = {};
    for (const field of allowedFields) {
      if (field in data) {
        filtered[field as keyof T] = data[field];
      }
    }
    return filtered;
  }

  /**
   * 过滤请求字段（移除不可写字段）
   */
  filterWritableFields<T extends Record<string, any>>(
    data: T,
    allowedFields: string[]
  ): Partial<T> {
    if (allowedFields.includes('*')) {
      return data;
    }

    const filtered: Partial<T> = {};
    for (const field of allowedFields) {
      if (field in data) {
        filtered[field as keyof T] = data[field];
      }
    }
    return filtered;
  }

  /**
   * 创建数据权限规则
   */
  async createRule(data: {
    roleId: string;
    resource: string;
    field: string;
    operator: string;
    valueType: string;
    fixedValue?: string;
    description?: string;
  }) {
    const rule = await prisma.dataPermissionRule.create({
      data: {
        roleId: data.roleId,
        resource: data.resource,
        field: data.field,
        operator: data.operator,
        valueType: data.valueType,
        fixedValue: data.fixedValue,
        description: data.description,
      },
    });

    logger.info('Data permission rule created', { ruleId: rule.id, resource: data.resource });
    return rule;
  }

  /**
   * 删除数据权限规则
   */
  async deleteRule(ruleId: string) {
    await prisma.dataPermissionRule.delete({
      where: { id: ruleId },
    });

    logger.info('Data permission rule deleted', { ruleId });
  }

  /**
   * 获取角色的数据权限规则
   */
  async getRoleDataRules(roleId: string) {
    return prisma.dataPermissionRule.findMany({
      where: { roleId },
      orderBy: { resource: 'asc' },
    });
  }

  /**
   * 获取角色的字段权限
   */
  async getRoleFieldPermissions(roleId: string) {
    return prisma.fieldPermission.findMany({
      where: { roleId },
      orderBy: [{ resource: 'asc' }, { field: 'asc' }],
    });
  }

  /**
   * 更新角色的字段权限
   */
  async updateFieldPermission(data: {
    roleId: string;
    resource: string;
    field: string;
    canRead: boolean;
    canWrite: boolean;
  }) {
    return prisma.fieldPermission.upsert({
      where: {
        roleId_resource_field: {
          roleId: data.roleId,
          resource: data.resource,
          field: data.field,
        },
      },
      update: {
        canRead: data.canRead,
        canWrite: data.canWrite,
      },
      create: data,
    });
  }

  /**
   * 删除指定资源的所有字段权限配置
   */
  async deleteResourceFieldPermissions(roleId: string, resource: string) {
    return prisma.fieldPermission.deleteMany({
      where: {
        roleId,
        resource,
      },
    });
  }
}

export const dataPermissionService = new DataPermissionService();
