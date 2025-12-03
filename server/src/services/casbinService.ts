/**
 * Casbin 权限服务
 * 提供功能权限检查、角色管理等功能
 */
import { newEnforcer, Enforcer } from 'casbin';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaCasbinAdapter } from '../lib/casbinAdapter';
import { logger } from '../utils/logger';

// 使用单例模式
let prisma: PrismaClient;
let enforcer: Enforcer | null = null;

class CasbinService {
  /**
   * 初始化 Prisma 客户端
   */
  private getPrisma(): PrismaClient {
    if (!prisma) {
      prisma = new PrismaClient();
    }
    return prisma;
  }

  /**
   * 获取 Enforcer 实例（单例）
   */
  async getEnforcer(): Promise<Enforcer> {
    if (!enforcer) {
      const modelPath = path.join(__dirname, '../../config/casbin_model.conf');
      const adapter = new PrismaCasbinAdapter(this.getPrisma());
      
      enforcer = await newEnforcer(modelPath, adapter);
      await enforcer.loadPolicy();
      
      logger.info('Casbin enforcer initialized');
    }
    return enforcer;
  }

  /**
   * 重新加载策略
   */
  async reloadPolicy(): Promise<void> {
    const e = await this.getEnforcer();
    await e.loadPolicy();
    logger.info('Casbin policy reloaded');
  }

  /**
   * 检查功能权限
   * @param userId 用户ID
   * @param baseId 基地ID
   * @param resource 资源（如 point, order）
   * @param action 操作（如 read, create, update, delete）
   */
  async checkPermission(
    userId: string,
    baseId: string | number,
    resource: string,
    action: string
  ): Promise<boolean> {
    const e = await this.getEnforcer();
    const result = await e.enforce(userId, String(baseId), resource, action);
    
    logger.debug('Permission check', {
      userId,
      baseId,
      resource,
      action,
      result,
    });
    
    return result;
  }

  /**
   * 获取用户在指定基地的所有角色
   */
  async getUserRoles(userId: string, baseId: string | number): Promise<string[]> {
    const e = await this.getEnforcer();
    return e.getRolesForUserInDomain(userId, String(baseId));
  }

  /**
   * 获取用户在所有基地的角色
   */
  async getAllUserRoles(userId: string): Promise<Array<{ baseId: string; role: string }>> {
    const e = await this.getEnforcer();
    const allRoles = await e.getImplicitRolesForUser(userId);
    
    // 从 g 策略中提取用户-角色-域关系
    const gPolicy = await e.getGroupingPolicy();
    const userRoles: Array<{ baseId: string; role: string }> = [];
    
    for (const [user, role, domain] of gPolicy) {
      if (user === userId) {
        userRoles.push({ baseId: domain, role });
      }
    }
    
    return userRoles;
  }

  /**
   * 为用户分配角色（在指定基地）
   */
  async addRoleForUser(
    userId: string,
    role: string,
    baseId: string | number
  ): Promise<boolean> {
    const e = await this.getEnforcer();
    // 使用 addGroupingPolicy 添加用户-角色-域关系
    const added = await e.addGroupingPolicy(userId, role, String(baseId));
    
    if (added) {
      await e.savePolicy();
      logger.info('Role assigned', { userId, role, baseId });
    }
    
    return added;
  }

  /**
   * 移除用户角色（在指定基地）
   */
  async removeRoleForUser(
    userId: string,
    role: string,
    baseId: string | number
  ): Promise<boolean> {
    const e = await this.getEnforcer();
    // 使用 removeGroupingPolicy 删除用户-角色-域关系
    const removed = await e.removeGroupingPolicy(userId, role, String(baseId));
    
    if (removed) {
      await e.savePolicy();
      logger.info('Role removed', { userId, role, baseId });
    }
    
    return removed;
  }

  /**
   * 添加权限策略
   * @param role 角色名
   * @param baseId 基地ID（"*" 表示所有基地）
   * @param resource 资源
   * @param action 操作（支持正则，如 "read|create"）
   * @param effect 效果（"allow" 或 "deny"）
   */
  async addPolicy(
    role: string,
    baseId: string,
    resource: string,
    action: string,
    effect: 'allow' | 'deny' = 'allow'
  ): Promise<boolean> {
    const e = await this.getEnforcer();
    const added = await e.addPolicy(role, baseId, resource, action, effect);
    
    if (added) {
      await e.savePolicy();
      logger.info('Policy added', { role, baseId, resource, action, effect });
    }
    
    return added;
  }

  /**
   * 删除权限策略
   */
  async removePolicy(
    role: string,
    baseId: string,
    resource: string,
    action: string,
    effect: 'allow' | 'deny' = 'allow'
  ): Promise<boolean> {
    const e = await this.getEnforcer();
    const removed = await e.removePolicy(role, baseId, resource, action, effect);
    
    if (removed) {
      await e.savePolicy();
      logger.info('Policy removed', { role, baseId, resource, action, effect });
    }
    
    return removed;
  }

  /**
   * 获取角色的所有权限策略
   */
  async getRolePolicies(role: string): Promise<string[][]> {
    const e = await this.getEnforcer();
    return e.getFilteredPolicy(0, role);
  }

  /**
   * 删除角色的所有权限策略
   */
  async deleteRolePolicies(role: string): Promise<boolean> {
    const e = await this.getEnforcer();
    const removed = await e.removeFilteredPolicy(0, role);
    
    if (removed) {
      await e.savePolicy();
      logger.info('All policies removed for role', { role });
    }
    
    return removed;
  }

  /**
   * 获取所有策略
   */
  async getAllPolicies(): Promise<string[][]> {
    const e = await this.getEnforcer();
    return e.getPolicy();
  }

  /**
   * 获取所有角色分配关系
   */
  async getAllRoleAssignments(): Promise<string[][]> {
    const e = await this.getEnforcer();
    return e.getGroupingPolicy();
  }

  /**
   * 同步角色权限到 Casbin
   * 从 Role.permissions JSON 迁移到 Casbin 策略
   */
  async syncRolePermissions(roleId: string, roleName: string, permissions: string[]): Promise<void> {
    const e = await this.getEnforcer();
    
    // 先删除该角色的所有策略
    await e.removeFilteredPolicy(0, roleName);
    
    // 添加新策略
    for (const perm of permissions) {
      // 解析权限格式：module:action 或 module:*
      const [resource, action] = perm.split(':');
      if (resource && action) {
        await e.addPolicy(roleName, '*', resource, action, 'allow');
      }
    }
    
    await e.savePolicy();
    logger.info('Role permissions synced to Casbin', { roleId, roleName, count: permissions.length });
  }

  /**
   * 初始化超级管理员权限
   */
  async initSuperAdminPolicy(): Promise<void> {
    const e = await this.getEnforcer();
    
    // 超级管理员拥有所有权限
    const exists = await e.hasPolicy('SUPER_ADMIN', '*', '*', '.*', 'allow');
    if (!exists) {
      await e.addPolicy('SUPER_ADMIN', '*', '*', '.*', 'allow');
      await e.savePolicy();
      logger.info('Super admin policy initialized');
    }
  }

  /**
   * 完整初始化 Casbin 权限系统
   * 在服务器启动时调用，确保：
   * 1. 超级管理员和管理员有全部权限
   * 2. 数据库中的用户角色同步到 Casbin
   */
  async initialize(): Promise<void> {
    const e = await this.getEnforcer();
    
    // 1. 初始化超级管理员和管理员的全局权限
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    for (const role of adminRoles) {
      const exists = await e.hasPolicy(role, '*', '*', '.*', 'allow');
      if (!exists) {
        await e.addPolicy(role, '*', '*', '.*', 'allow');
        logger.info(`${role} global policy initialized`);
      }
    }

    // 2. 同步数据库中的用户角色到 Casbin
    const prisma = this.getPrisma();
    const userRoles = await prisma.userRole.findMany({
      where: { isActive: true },
      include: { role: true }
    });

    let synced = 0;
    for (const ur of userRoles) {
      // 检查是否已存在
      const exists = await e.hasGroupingPolicy(ur.userId, ur.role.name, '*');
      if (!exists) {
        await e.addGroupingPolicy(ur.userId, ur.role.name, '*');
        synced++;
      }
    }

    await e.savePolicy();
    logger.info('Casbin initialized', { 
      userRolesSynced: synced, 
      totalUserRoles: userRoles.length 
    });
  }
}

export const casbinService = new CasbinService();
