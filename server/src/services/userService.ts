import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { casbinService } from './casbinService';

const prisma = new PrismaClient();

/**
 * 用户服务
 * 处理用户管理相关的业务逻辑
 */
export class UserService {
  /**
   * 获取用户的最高角色层级
   * 层级越小权限越高
   */
  static async getUserHighestRoleLevel(userId: string): Promise<number> {
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
   * 获取用户列表
   * 根据当前用户的角色层级过滤：只能看到同级或更低级别的用户
   */
  static async getUserList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    roleId?: string;
    currentUserId?: string; // 当前操作用户ID，用于层级过滤
  }) {
    const { page = 1, pageSize = 10, keyword, isActive, roleId, currentUserId } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // 根据当前用户角色层级过滤
    if (currentUserId) {
      const currentUserLevel = await this.getUserHighestRoleLevel(currentUserId);
      
      logger.info('用户列表层级过滤', { 
        currentUserId, 
        currentUserLevel,
        willFilter: currentUserLevel > 1 
      });
      
      // 只能看到角色层级 >= 当前用户层级的用户（同级或更低权限）
      // Level 0-1 (SUPER_ADMIN, ADMIN) 可以看到所有用户
      if (currentUserLevel > 1) {
        where.userRoles = {
          some: {
            isActive: true,
            role: {
              level: { gte: currentUserLevel },
            },
          },
        };
      }
    } else {
      logger.warn('用户列表查询缺少 currentUserId，无法进行层级过滤');
    }

    // 关键词搜索（用户名、姓名、手机号）
    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { name: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
      ];
    }

    // 状态筛选
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // 角色筛选（与层级过滤合并）
    if (roleId) {
      if (where.userRoles) {
        where.userRoles.some.roleId = roleId;
      } else {
        where.userRoles = {
          some: {
            roleId,
            isActive: true,
          },
        };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
          userBases: {
            where: { isActive: true },
            include: {
              base: {
                select: { id: true, code: true, name: true, type: true },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // 格式化返回数据
    const formattedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      bases: user.userBases.map((ub) => ({
        id: ub.base.id,
        code: ub.base.code,
        name: ub.base.name,
        type: ub.base.type,
      })),
    }));

    return {
      data: formattedUsers,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取用户详情
   */
  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
        userBases: {
          where: { isActive: true },
          include: {
            base: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      defaultBaseId: user.defaultBaseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoles.map((ur) => ur.role),
      bases: user.userBases.map((ub) => ub.base),
    };
  }

  /**
   * 验证角色分配权限
   * 确保当前用户只能分配同级或更低级别的角色
   */
  static async validateRoleAssignment(currentUserId: string, roleIds: string[]): Promise<void> {
    if (!roleIds || roleIds.length === 0) return;

    const currentUserLevel = await this.getUserHighestRoleLevel(currentUserId);
    
    // 获取要分配的角色的层级
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, level: true },
    });

    for (const role of roles) {
      if (role.level < currentUserLevel) {
        throw new Error(`无权分配角色 "${role.name}"，该角色权限高于您的权限`);
      }
    }
  }

  /**
   * 验证基地分配权限
   * 确保当前用户只能分配自己有权限的基地
   */
  static async validateBaseAssignment(currentUserId: string, baseIds: number[]): Promise<void> {
    if (!baseIds || baseIds.length === 0) return;

    const currentUserLevel = await this.getUserHighestRoleLevel(currentUserId);
    
    // Level 0-1 (SUPER_ADMIN, ADMIN) 可以分配任何基地
    if (currentUserLevel <= 1) return;

    // 获取当前用户关联的基地
    const userBases = await prisma.userBase.findMany({
      where: { userId: currentUserId, isActive: true },
      select: { baseId: true },
    });
    const allowedBaseIds = new Set(userBases.map(ub => ub.baseId));

    for (const baseId of baseIds) {
      if (!allowedBaseIds.has(baseId)) {
        throw new Error(`无权分配基地 ID ${baseId}，您没有该基地的访问权限`);
      }
    }
  }

  /**
   * 创建用户
   */
  static async createUser(data: {
    username: string;
    password: string;
    name: string;
    email?: string;
    phone?: string;
    roleIds?: string[];
    baseIds?: number[];
    currentUserId?: string; // 当前操作用户ID，用于权限验证
  }) {
    const { username, password, name, email, phone, roleIds = [], baseIds = [], currentUserId } = data;

    // 验证角色和基地分配权限
    if (currentUserId) {
      await this.validateRoleAssignment(currentUserId, roleIds);
      await this.validateBaseAssignment(currentUserId, baseIds);
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new Error('邮箱已被使用');
      }
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        email,
        phone,
        isActive: true,
      },
    });

    // 分配角色
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
          assignedBy: 'system',
          isActive: true,
        })),
      });
    }

    // 分配基地
    if (baseIds.length > 0) {
      await prisma.userBase.createMany({
        data: baseIds.map((baseId) => ({
          userId: user.id,
          baseId,
          isActive: true,
        })),
      });
    }

    logger.info('创建用户成功', { userId: user.id, username });

    return this.getUserById(user.id);
  }

  /**
   * 更新用户
   */
  static async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      isActive?: boolean;
      password?: string;
      roleIds?: string[];
      baseIds?: number[];
      currentUserId?: string; // 当前操作用户ID，用于权限验证
    }
  ) {
    const { name, email, phone, isActive, password, roleIds, baseIds, currentUserId } = data;

    // 验证角色和基地分配权限
    if (currentUserId) {
      if (roleIds) {
        await this.validateRoleAssignment(currentUserId, roleIds);
      }
      if (baseIds) {
        await this.validateBaseAssignment(currentUserId, baseIds);
      }
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error('用户不存在');
    }

    // 检查邮箱是否被其他用户使用
    if (email && email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new Error('邮箱已被使用');
      }
    }

    // 构建更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // 更新用户基本信息
    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // 更新角色
    if (roleIds !== undefined) {
      // 获取用户关联的基地（用于 Casbin 域）
      const userBases = await prisma.userBase.findMany({
        where: { userId: id, isActive: true },
        select: { baseId: true },
      });
      const baseIds = userBases.map(ub => ub.baseId);

      // 获取现有角色
      const existingRoles = await prisma.userRole.findMany({
        where: { userId: id, isActive: true },
        include: { role: true },
      });

      // 从 Casbin 移除旧角色
      for (const ur of existingRoles) {
        for (const baseId of baseIds) {
          await casbinService.removeRoleForUser(id, ur.role.name, baseId);
        }
        // 也移除全局角色
        await casbinService.removeRoleForUser(id, ur.role.name, '*');
      }

      // 删除现有角色关联（避免唯一约束冲突）
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // 添加新角色
      if (roleIds.length > 0) {
        // 获取新角色信息
        const newRoles = await prisma.role.findMany({
          where: { id: { in: roleIds } },
        });

        // 批量创建新角色关联
        await prisma.userRole.createMany({
          data: roleIds.map(roleId => ({
            userId: id,
            roleId,
            assignedBy: 'system',
            isActive: true,
          })),
        });

        // 同步到 Casbin
        for (const role of newRoles) {
          // 为每个基地分配角色
          for (const baseId of baseIds) {
            await casbinService.addRoleForUser(id, role.name, baseId);
          }
          // 如果没有基地，分配全局角色
          if (baseIds.length === 0) {
            await casbinService.addRoleForUser(id, role.name, '*');
          }
        }
      }

      logger.info('用户角色已更新并同步到 Casbin', { userId: id, roleIds });
    }

    // 更新基地
    if (baseIds !== undefined) {
      // 删除现有基地关联
      await prisma.userBase.deleteMany({
        where: { userId: id },
      });

      // 添加新基地关联
      if (baseIds.length > 0) {
        await prisma.userBase.createMany({
          data: baseIds.map(baseId => ({
            userId: id,
            baseId,
            isActive: true,
          })),
        });
      }
    }

    logger.info('更新用户成功', { userId: id });

    return this.getUserById(id);
  }

  /**
   * 删除用户（软删除，设置为禁用）
   */
  static async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 不允许删除 admin 用户
    if (user.username === 'admin') {
      throw new Error('不能删除管理员账号');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('删除用户成功', { userId: id });

    return { success: true };
  }

  /**
   * 重置用户密码
   */
  static async resetPassword(id: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    logger.info('重置用户密码成功', { userId: id });

    return { success: true };
  }

  /**
   * 获取所有角色列表
   */
  static async getRoleList() {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    return roles;
  }

  /**
   * 获取角色详情
   */
  static async getRoleById(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    return role;
  }

  /**
   * 创建角色
   */
  static async createRole(data: {
    name: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
    level?: number;
  }) {
    // 检查角色名是否已存在
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('角色名称已存在');
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description || '',
        permissions: data.permissions || [],
        isSystem: data.isSystem || false,
        level: data.level ?? 3, // 默认等级为3
      },
    });

    logger.info('创建角色成功', { roleId: role.id, name: role.name, level: role.level });

    return role;
  }

  /**
   * 更新角色
   */
  static async updateRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    }
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    // 系统角色不允许修改名称
    if (role.isSystem && data.name && data.name !== role.name) {
      throw new Error('系统角色不允许修改名称');
    }

    // 检查新名称是否与其他角色冲突
    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new Error('角色名称已存在');
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      },
    });

    logger.info('更新角色成功', { roleId: updatedRole.id });

    return updatedRole;
  }

  /**
   * 删除角色
   */
  static async deleteRole(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new Error('角色不存在');
    }

    if (role.isSystem) {
      throw new Error('系统角色不允许删除');
    }

    if (role._count.userRoles > 0) {
      throw new Error(`该角色已分配给 ${role._count.userRoles} 个用户，请先移除用户的角色分配`);
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    logger.info('删除角色成功', { roleId, name: role.name });

    return { success: true };
  }

  /**
   * 获取用户统计信息
   */
  static async getUserStats() {
    const [total, active, inactive] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

}
