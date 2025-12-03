import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 用户服务
 * 处理用户管理相关的业务逻辑
 */
export class UserService {
  /**
   * 获取用户列表
   */
  static async getUserList(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    isActive?: boolean;
    roleId?: string;
  }) {
    const { page = 1, pageSize = 10, keyword, isActive, roleId } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};

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

    // 角色筛选
    if (roleId) {
      where.userRoles = {
        some: {
          roleId,
          isActive: true,
        },
      };
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
  }) {
    const { username, password, name, email, phone, roleIds = [], baseIds = [] } = data;

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
    }
  ) {
    const { name, email, phone, isActive, password, roleIds, baseIds } = data;

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
      // 禁用现有角色
      await prisma.userRole.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false },
      });

      // 添加新角色
      if (roleIds.length > 0) {
        for (const roleId of roleIds) {
          await prisma.userRole.upsert({
            where: {
              uk_user_role_active: {
                userId: id,
                roleId,
                isActive: true,
              },
            },
            update: { isActive: true },
            create: {
              userId: id,
              roleId,
              assignedBy: 'system',
              isActive: true,
            },
          });
        }
      }
    }

    // 更新基地
    if (baseIds !== undefined) {
      // 禁用现有基地关联
      await prisma.userBase.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false },
      });

      // 添加新基地关联
      if (baseIds.length > 0) {
        for (const baseId of baseIds) {
          await prisma.userBase.upsert({
            where: {
              userId_baseId: {
                userId: id,
                baseId,
              },
            },
            update: { isActive: true },
            create: {
              userId: id,
              baseId,
              isActive: true,
            },
          });
        }
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
      },
    });

    logger.info('创建角色成功', { roleId: role.id, name: role.name });

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
