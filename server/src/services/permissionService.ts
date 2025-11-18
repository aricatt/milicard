import { newEnforcer, Enforcer } from 'casbin'
import { PrismaCasbinAdapter } from './casbinAdapter'
import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  PermissionString,
  PermissionCheckResult,
  PermissionError,
  PermissionErrorType,
  ResourceModule,
  PermissionAction,
  SYSTEM_ROLE_PERMISSIONS,
  DataPermissionFilter
} from '../types/permission'
import path from 'path'

export class PermissionService {
  private static enforcer: Enforcer | null = null
  private static adapter: PrismaCasbinAdapter | null = null

  /**
   * 初始化权限管理器
   */
  static async initialize(): Promise<void> {
    try {
      // 创建适配器
      this.adapter = new PrismaCasbinAdapter(prisma)
      await this.adapter.ensureTableExists()

      // 创建执行器
      const modelPath = path.join(process.cwd(), 'config', 'casbin_model.conf')
      this.enforcer = await newEnforcer(modelPath, this.adapter)

      // 启用自动保存
      this.enforcer.enableAutoSave(true)

      // 初始化系统角色权限
      await this.initializeSystemRoles()

      logger.info('权限管理器初始化成功')
    } catch (error) {
      logger.error('权限管理器初始化失败', { error })
      throw error
    }
  }

  /**
   * 获取执行器实例
   */
  private static getEnforcer(): Enforcer {
    if (!this.enforcer) {
      throw new Error('权限管理器未初始化，请先调用 initialize()')
    }
    return this.enforcer
  }

  /**
   * 检查用户权限
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    try {
      const enforcer = this.getEnforcer()
      const allowed = await enforcer.enforce(userId, resource, action)

      return {
        allowed,
        reason: allowed ? undefined : '权限不足'
      }
    } catch (error) {
      logger.error('权限检查失败', { error, userId, resource, action })
      return {
        allowed: false,
        reason: '权限检查异常'
      }
    }
  }

  /**
   * 检查用户是否具有指定权限字符串
   */
  static async hasPermission(
    userId: string,
    permission: PermissionString
  ): Promise<boolean> {
    const [module, action, field] = permission.split(':')
    const resource = field ? `${module}:${field}` : module
    
    const result = await this.checkPermission(userId, resource, action)
    return result.allowed
  }

  /**
   * 检查用户是否具有多个权限（AND关系）
   */
  static async hasAllPermissions(
    userId: string,
    permissions: PermissionString[]
  ): Promise<PermissionCheckResult> {
    const missingPermissions: PermissionString[] = []

    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(userId, permission)
      if (!hasPermission) {
        missingPermissions.push(permission)
      }
    }

    return {
      allowed: missingPermissions.length === 0,
      reason: missingPermissions.length > 0 ? '缺少必要权限' : undefined,
      missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined
    }
  }

  /**
   * 检查用户是否具有任一权限（OR关系）
   */
  static async hasAnyPermission(
    userId: string,
    permissions: PermissionString[]
  ): Promise<boolean> {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(userId, permission)
      if (hasPermission) {
        return true
      }
    }
    return false
  }

  /**
   * 为用户添加角色
   */
  static async addRoleForUser(userId: string, role: string): Promise<boolean> {
    try {
      const enforcer = this.getEnforcer()
      const added = await enforcer.addRoleForUser(userId, role)
      
      if (added) {
        logger.info('用户角色添加成功', { userId, role })
      }
      
      return added
    } catch (error) {
      logger.error('添加用户角色失败', { error, userId, role })
      return false
    }
  }

  /**
   * 删除用户角色
   */
  static async deleteRoleForUser(userId: string, role: string): Promise<boolean> {
    try {
      const enforcer = this.getEnforcer()
      const deleted = await enforcer.deleteRoleForUser(userId, role)
      
      if (deleted) {
        logger.info('用户角色删除成功', { userId, role })
      }
      
      return deleted
    } catch (error) {
      logger.error('删除用户角色失败', { error, userId, role })
      return false
    }
  }

  /**
   * 获取用户的所有角色
   */
  static async getRolesForUser(userId: string): Promise<string[]> {
    try {
      const enforcer = this.getEnforcer()
      return await enforcer.getRolesForUser(userId)
    } catch (error) {
      logger.error('获取用户角色失败', { error, userId })
      return []
    }
  }

  /**
   * 获取角色的所有用户
   */
  static async getUsersForRole(role: string): Promise<string[]> {
    try {
      const enforcer = this.getEnforcer()
      return await enforcer.getUsersForRole(role)
    } catch (error) {
      logger.error('获取角色用户失败', { error, role })
      return []
    }
  }

  /**
   * 为角色添加权限
   */
  static async addPermissionForRole(
    role: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const enforcer = this.getEnforcer()
      const added = await enforcer.addPermissionForUser(role, resource, action)
      
      if (added) {
        logger.info('角色权限添加成功', { role, resource, action })
      }
      
      return added
    } catch (error) {
      logger.error('添加角色权限失败', { error, role, resource, action })
      return false
    }
  }

  /**
   * 删除角色权限
   */
  static async deletePermissionForRole(
    role: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const enforcer = this.getEnforcer()
      const deleted = await enforcer.deletePermissionForUser(role, resource, action)
      
      if (deleted) {
        logger.info('角色权限删除成功', { role, resource, action })
      }
      
      return deleted
    } catch (error) {
      logger.error('删除角色权限失败', { error, role, resource, action })
      return false
    }
  }

  /**
   * 获取角色的所有权限
   */
  static async getPermissionsForRole(role: string): Promise<string[][]> {
    try {
      const enforcer = this.getEnforcer()
      return await enforcer.getPermissionsForUser(role)
    } catch (error) {
      logger.error('获取角色权限失败', { error, role })
      return []
    }
  }

  /**
   * 批量添加权限
   */
  static async addPermissions(permissions: Array<{
    subject: string
    resource: string
    action: string
  }>): Promise<boolean> {
    try {
      const enforcer = this.getEnforcer()
      const rules = permissions.map(p => [p.subject, p.resource, p.action])
      const added = await enforcer.addPolicies(rules)
      
      if (added) {
        logger.info('批量权限添加成功', { count: permissions.length })
      }
      
      return added
    } catch (error) {
      logger.error('批量添加权限失败', { error, permissions })
      return false
    }
  }

  /**
   * 初始化系统角色权限
   */
  private static async initializeSystemRoles(): Promise<void> {
    try {
      const enforcer = this.getEnforcer()

      // 检查是否已经初始化过
      const existingPolicies = await enforcer.getPolicy()
      if (existingPolicies.length > 0) {
        logger.info('系统角色权限已存在，跳过初始化')
        return
      }

      // 初始化系统角色权限
      for (const [roleName, permissions] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
        for (const permission of permissions) {
          const [module, action, field] = permission.split(':')
          const resource = field ? `${module}:${field}` : module
          
          await this.addPermissionForRole(roleName, resource, action)
        }
      }

      logger.info('系统角色权限初始化完成')
    } catch (error) {
      logger.error('初始化系统角色权限失败', { error })
      throw error
    }
  }

  /**
   * 生成数据权限过滤条件
   */
  static async generateDataFilter(filter: DataPermissionFilter): Promise<any> {
    const { userId, roles, resource, action } = filter

    // 检查是否有完全管理权限
    const hasManagePermission = await this.hasPermission(
      userId,
      `${resource}:${PermissionAction.MANAGE}` as PermissionString
    )

    if (hasManagePermission) {
      // 有管理权限，返回空过滤条件（可以访问所有数据）
      return {}
    }

    // 检查是否有基础权限
    const hasBasicPermission = await this.hasPermission(
      userId,
      `${resource}:${action}` as PermissionString
    )

    if (!hasBasicPermission) {
      // 没有基础权限，返回不可能满足的条件
      return { id: 'impossible-id-that-never-exists' }
    }

    // 有基础权限但没有管理权限，只能访问自己创建的数据
    return {
      OR: [
        { createdBy: userId },
        { userId: userId }
      ]
    }
  }

  /**
   * 重新加载权限策略
   */
  static async reloadPolicy(): Promise<void> {
    try {
      const enforcer = this.getEnforcer()
      await enforcer.loadPolicy()
      logger.info('权限策略重新加载成功')
    } catch (error) {
      logger.error('重新加载权限策略失败', { error })
      throw error
    }
  }

  /**
   * 清除所有权限策略
   */
  static async clearPolicy(): Promise<void> {
    try {
      const enforcer = this.getEnforcer()
      await enforcer.clearPolicy()
      logger.info('权限策略清除成功')
    } catch (error) {
      logger.error('清除权限策略失败', { error })
      throw error
    }
  }
}
