import { Request, Response, NextFunction } from 'express'
import { PermissionService } from '../services/permissionService'
import { casbinService } from '../services/casbinService'
import { dataPermissionService } from '../services/dataPermissionService'
import { prisma } from '../utils/database'
import {
  PermissionMiddlewareOptions,
  PermissionError,
  PermissionErrorType,
  PermissionString,
  ResourceModule,
  PermissionAction
} from '../types/permission'
import { logger } from '../utils/logger'

/**
 * 基于 Casbin 的功能权限检查中间件
 * @param resource 资源名称（如 'point', 'order'）
 * @param action 操作名称（如 'read', 'create', 'update', 'delete'）
 */
export const checkPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      const baseId = req.params.baseId || req.body?.baseId || req.query?.baseId

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '未登录',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      if (!baseId) {
        res.status(400).json({
          success: false,
          message: '缺少基地ID',
          code: 'MISSING_BASE_ID'
        })
        return
      }

      const hasPermission = await casbinService.checkPermission(
        userId,
        String(baseId),
        resource,
        action
      )

      if (hasPermission) {
        next()
        return
      }

      logger.warn('Casbin 权限检查失败', {
        userId,
        baseId,
        resource,
        action,
        ip: req.ip,
        path: req.path
      })

      res.status(403).json({
        success: false,
        message: '没有权限执行此操作',
        code: 'PERMISSION_DENIED',
        requiredPermission: `${resource}:${action}`
      })
    } catch (error) {
      logger.error('Casbin 权限检查异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '权限检查失败'
      })
    }
  }
}

/**
 * 系统级权限检查中间件（不需要 baseId）
 * 用于系统管理功能，如用户管理、角色管理等
 * @param resource 资源名称（如 'role', 'user'）
 * @param action 操作名称（如 'read', 'create', 'update', 'delete'）
 */
export const checkSystemPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '未登录',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // 使用 '*' 作为全局域检查系统级权限
      const hasPermission = await casbinService.checkPermission(
        userId,
        '*',
        resource,
        action
      )

      if (hasPermission) {
        next()
        return
      }

      logger.warn('系统权限检查失败', {
        userId,
        resource,
        action,
        ip: req.ip,
        path: req.path
      })

      res.status(403).json({
        success: false,
        message: '没有权限执行此操作',
        code: 'PERMISSION_DENIED',
        requiredPermission: `${resource}:${action}`
      })
    } catch (error) {
      logger.error('系统权限检查异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '权限检查失败'
      })
    }
  }
}

/**
 * 数据权限注入中间件（基于 Casbin）
 * 将数据过滤条件注入到 req.permissionContext
 * @param resource 主资源名称
 * @param relatedResources 相关资源名称数组（用于多表JOIN场景，合并字段权限）
 */
export const injectDataPermission = (resource: string, relatedResources: string[] = []) => {
  console.log('🚀 injectDataPermission 被调用:', { resource, relatedResources })
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      const baseId = parseInt(req.params.baseId || req.body?.baseId || req.query?.baseId || '0')

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '未登录'
        })
        return
      }

      // 获取用户在该基地的角色
      let roles = await casbinService.getUserRoles(userId, baseId)
      
      // 如果没有基地角色，检查全局角色
      if (roles.length === 0) {
        roles = await casbinService.getUserRoles(userId, '*')
      }

      // 获取数据过滤条件
      const dataFilter = await dataPermissionService.getDataFilter(
        { userId, baseId, roles },
        resource
      )

      // 获取主资源的字段权限
      const fieldPermissions = await dataPermissionService.getFieldPermissions(
        { userId, baseId, roles },
        resource
      )

      console.log('🔍 检查 relatedResources:', {
        relatedResources,
        type: typeof relatedResources,
        isArray: Array.isArray(relatedResources),
        length: relatedResources?.length
      })

      // 如果有相关资源，合并它们的字段权限
      if (relatedResources && relatedResources.length > 0) {
        console.log('🔍 开始合并字段权限:', { resource, relatedResources, roles })
        
        const allReadableFields = new Set<string>()
        const allWritableFields = new Set<string>()
        
        // 记录主资源明确禁止的字段（用于优先级控制）
        const mainResourceForbiddenFields = new Set<string>()

        console.log('📋 主资源字段权限:', { 
          resource, 
          readable: fieldPermissions.readable,
          readableCount: fieldPermissions.readable.length 
        })

        // 特殊字段映射：处理别名字段（用于主资源）
        const specialFieldMap: Record<string, string[]> = {
          'code': ['orderNo'],  // purchaseOrder.code -> orderNo
          'id': ['purchaseOrderId']  // purchaseOrder.id -> purchaseOrderId (仅用于采购单明细项)
        }

        // 字段前缀映射：资源名 -> 字段前缀
        const fieldPrefixMap: Record<string, string> = {
          'goods': 'goods',
          'category': 'category',
          'supplier': 'supplier',
          'base': 'base',
          'location': 'location'
        }

        // 先处理相关资源的字段权限
        for (const relatedResource of relatedResources) {
          const relatedPermissions = await dataPermissionService.getFieldPermissions(
            { userId, baseId, roles },
            relatedResource
          )
          
          console.log(`📋 相关资源 ${relatedResource} 字段权限:`, {
            readable: relatedPermissions.readable,
            readableCount: relatedPermissions.readable.length
          })
          
          // 🔧 修复：如果相关资源返回 ['*']，跳过合并，因为主资源的配置应该优先
          // 只有当主资源也是 ['*'] 时，才会最终返回 ['*']
          if (relatedPermissions.readable.includes('*')) {
            console.log(`⚠️ 相关资源 ${relatedResource} 返回 ['*']，跳过合并（主资源配置优先）`)
            continue
          }
          
          const prefix = fieldPrefixMap[relatedResource]
          
          // 合并可读字段（原始字段名 + 带前缀的字段名）
          relatedPermissions.readable.forEach(field => {
            allReadableFields.add(field) // 原始字段名
            if (prefix && field !== 'id') {
              // 添加带前缀的字段名，如 name -> goodsName, code -> categoryCode
              const prefixedField = prefix + field.charAt(0).toUpperCase() + field.slice(1)
              allReadableFields.add(prefixedField)
            }
          })
          
          // 合并可写字段
          if (!relatedPermissions.writable.includes('*')) {
            relatedPermissions.writable.forEach(field => {
              allWritableFields.add(field)
              if (prefix && field !== 'id') {
                const prefixedField = prefix + field.charAt(0).toUpperCase() + field.slice(1)
                allWritableFields.add(prefixedField)
              }
            })
          }
        }

        // 最后处理主资源字段权限（优先级最高）
        // 如果主资源明确配置了某个字段，则以主资源的配置为准
        fieldPermissions.readable.forEach(field => {
          allReadableFields.add(field)
        })
        
        fieldPermissions.writable.forEach(field => {
          allWritableFields.add(field)
        })

        // 为主资源添加特殊别名字段
        if (resource === 'purchaseOrder') {
          fieldPermissions.readable.forEach(field => {
            if (specialFieldMap[field]) {
              specialFieldMap[field].forEach(alias => {
                allReadableFields.add(alias)
              })
            }
          })
        }

        // 移除主资源中明确禁止的字段
        // 检查主资源是否有字段权限配置，如果有配置但不在可读列表中，说明是明确禁止的
        const mainResourceConfiguredFields = new Set(fieldPermissions.readable)
        
        // 如果主资源有配置字段权限（不是默认的 *），则检查哪些字段被明确禁止
        if (!fieldPermissions.readable.includes('*')) {
          // 获取主资源的所有可能字段（从前端定义或数据库schema）
          // 这里我们通过检查相关资源的字段来推断主资源可能有哪些字段
          for (const relatedResource of relatedResources) {
            if (relatedResource === 'goods') {
              // 如果 goods 的 retailPrice 在可读列表中，但主资源的 retailPrice 不在，说明主资源明确禁止
              if (allReadableFields.has('retailPrice') && !mainResourceConfiguredFields.has('retailPrice')) {
                allReadableFields.delete('retailPrice')
                console.log('🚫 移除主资源明确禁止的字段: retailPrice')
              }
            }
          }
        }

        fieldPermissions.readable = Array.from(allReadableFields)
        fieldPermissions.writable = Array.from(allWritableFields)

        console.log('✅ 合并后的字段权限:', {
          readableCount: fieldPermissions.readable.length,
          readable: fieldPermissions.readable
        })

        // 调试日志
        logger.debug('injectDataPermission - 合并多资源字段权限', {
          resource,
          relatedResources,
          roles,
          readableCount: fieldPermissions.readable.length,
          writableCount: fieldPermissions.writable.length
        })
      } else {
        // 调试日志
        logger.debug('injectDataPermission - 字段权限', {
          resource,
          roles,
          readable: fieldPermissions.readable,
          writable: fieldPermissions.writable
        })
      }

      // 注入到请求对象
      req.permissionContext = {
        userId,
        baseId,
        roles,
        dataFilter,
        fieldPermissions,
      }

      next()
    } catch (error) {
      logger.error('数据权限注入异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        resource
      })

      res.status(500).json({
        success: false,
        message: '数据权限检查失败'
      })
    }
  }
}

/**
 * 权限检查中间件工厂函数（兼容旧版）
 */
export const requirePermission = (options: PermissionMiddlewareOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户是否已认证
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      const { resource, action, field, allowOwner = false, ownerField = 'userId' } = options
      const userId = req.user.id

      // 构建权限字符串
      const permission: PermissionString = field 
        ? `${resource}:${action}:${field}` as PermissionString
        : `${resource}:${action}` as PermissionString

      // 检查基础权限
      const hasPermission = await PermissionService.hasPermission(userId, permission)

      if (hasPermission) {
        // 有权限，直接通过
        next()
        return
      }

      // 如果允许所有者访问，检查资源所有权
      if (allowOwner) {
        const resourceId = req.params.id || req.params.resourceId
        if (resourceId) {
          const isOwner = await checkResourceOwnership(userId, resource, resourceId, ownerField)
          if (isOwner) {
            // 是资源所有者，允许访问
            next()
            return
          }
        }
      }

      // 记录权限拒绝日志
      logger.warn('权限检查失败', {
        userId,
        username: req.user.username,
        permission,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      })

      res.status(403).json({
        success: false,
        message: '权限不足',
        code: PermissionErrorType.INSUFFICIENT_PERMISSION,
        requiredPermission: permission
      })
    } catch (error) {
      logger.error('权限中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '权限检查异常'
      })
    }
  }
}

/**
 * 检查多个权限（AND关系）
 */
export const requireAllPermissions = (permissions: PermissionString[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      const userId = req.user.id
      const result = await PermissionService.hasAllPermissions(userId, permissions)

      if (result.allowed) {
        next()
        return
      }

      logger.warn('多权限检查失败', {
        userId,
        username: req.user.username,
        permissions,
        missingPermissions: result.missingPermissions,
        ip: req.ip,
        path: req.path
      })

      res.status(403).json({
        success: false,
        message: result.reason || '权限不足',
        code: PermissionErrorType.INSUFFICIENT_PERMISSION,
        requiredPermissions: permissions,
        missingPermissions: result.missingPermissions
      })
    } catch (error) {
      logger.error('多权限检查中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '权限检查异常'
      })
    }
  }
}

/**
 * 检查任一权限（OR关系）
 */
export const requireAnyPermission = (permissions: PermissionString[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      const userId = req.user.id
      const hasAnyPermission = await PermissionService.hasAnyPermission(userId, permissions)

      if (hasAnyPermission) {
        next()
        return
      }

      logger.warn('任一权限检查失败', {
        userId,
        username: req.user.username,
        permissions,
        ip: req.ip,
        path: req.path
      })

      res.status(403).json({
        success: false,
        message: '权限不足',
        code: PermissionErrorType.INSUFFICIENT_PERMISSION,
        requiredPermissions: permissions
      })
    } catch (error) {
      logger.error('任一权限检查中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '权限检查异常'
      })
    }
  }
}

/**
 * 角色检查中间件（兼容现有的角色中间件）
 */
export const requireRole = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      const userId = req.user.id
      const userRoles = await PermissionService.getRolesForUser(userId)

      if (userRoles.includes(role)) {
        next()
        return
      }

      logger.warn('角色检查失败', {
        userId,
        username: req.user.username,
        requiredRole: role,
        userRoles,
        ip: req.ip,
        path: req.path
      })

      res.status(403).json({
        success: false,
        message: '角色权限不足',
        code: PermissionErrorType.INSUFFICIENT_PERMISSION,
        requiredRole: role
      })
    } catch (error) {
      logger.error('角色检查中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '角色检查异常'
      })
    }
  }
}

/**
 * 检查用户是否拥有管理员级别权限（基于角色的 level 属性）
 * level <= 1 的角色被视为管理员（0=超级管理员，1=管理员）
 */
async function isAdminRole(roles: string[]): Promise<boolean> {
  if (roles.length === 0) return false;
  
  const adminRoles = await prisma.role.findMany({
    where: {
      name: { in: roles },
      level: { lte: 1 },
    },
  });
  
  return adminRoles.length > 0;
}

/**
 * 超级管理员权限中间件（基于角色 level = 0）
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '需要身份认证',
        code: 'AUTHENTICATION_REQUIRED'
      })
      return
    }

    const superAdminRoles = await prisma.role.findMany({
      where: {
        name: { in: req.user.roles },
        level: 0, // 只有 level 0 是超级管理员
      },
    });

    if (superAdminRoles.length > 0) {
      next()
      return
    }

    res.status(403).json({
      success: false,
      message: '需要超级管理员权限',
      code: PermissionErrorType.INSUFFICIENT_PERMISSION
    })
  } catch (error) {
    logger.error('超级管理员检查异常', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    })
    res.status(500).json({
      success: false,
      message: '权限检查异常'
    })
  }
}

/**
 * 管理员权限中间件（基于角色 level <= 1）
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '需要身份认证',
        code: 'AUTHENTICATION_REQUIRED'
      })
      return
    }

    const isAdmin = await isAdminRole(req.user.roles)
    if (isAdmin) {
      next()
      return
    }

    res.status(403).json({
      success: false,
      message: '需要管理员权限',
      code: PermissionErrorType.INSUFFICIENT_PERMISSION
    })
  } catch (error) {
    logger.error('管理员检查异常', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    })
    res.status(500).json({
      success: false,
      message: '权限检查异常'
    })
  }
}

/**
 * 检查资源所有权
 */
async function checkResourceOwnership(
  userId: string,
  resource: ResourceModule,
  resourceId: string,
  ownerField: string
): Promise<boolean> {
  try {
    // 这里需要根据不同的资源类型查询数据库
    // 为了简化，我们先返回false，后续可以根据具体需求实现
    
    // 示例实现（需要根据实际情况调整）
    switch (resource) {
      case ResourceModule.USER:
        // 用户只能访问自己的信息
        return resourceId === userId
      
      default:
        // 其他资源暂时不支持所有者检查
        return false
    }
  } catch (error) {
    logger.error('检查资源所有权失败', { error, userId, resource, resourceId })
    return false
  }
}

/**
 * 数据权限过滤中间件
 * 在查询数据时自动应用权限过滤
 */
export const applyDataPermission = (resource: ResourceModule | string, action?: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证'
        })
        return
      }

      const userId = req.user.id
      const baseId = parseInt(req.params.baseId || req.query.baseId as string || '0')
      const resourceName = typeof resource === 'string' ? resource : resource

      // 获取用户在该基地的角色（使用 Casbin）
      let roles = await casbinService.getUserRoles(userId, baseId)
      
      // 如果没有基地角色，检查全局角色
      if (roles.length === 0) {
        roles = await casbinService.getUserRoles(userId, '*')
      }

      // 使用新的数据权限服务生成过滤条件
      const dataFilter = await dataPermissionService.getDataFilter(
        { userId, baseId, roles },
        resourceName
      )

      // 获取字段权限
      const fieldPermissions = await dataPermissionService.getFieldPermissions(
        { userId, baseId, roles },
        resourceName
      )

      // 将过滤条件添加到请求对象中，供后续使用
      req.dataFilter = dataFilter
      req.permissionContext = {
        userId,
        baseId,
        roles,
        dataFilter,
        fieldPermissions,
      }

      next()
    } catch (error) {
      logger.error('数据权限过滤中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        resource
      })

      res.status(500).json({
        success: false,
        message: '数据权限检查异常'
      })
    }
  }
}

/**
 * 字段权限过滤响应中间件
 * 在响应发送前过滤不可读字段
 */
export const filterResponseFields = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res)
    
    res.json = (body: any) => {
      const fieldPermissions = req.permissionContext?.fieldPermissions
      
      // 开发环境下，附加字段权限调试信息
      const isDev = process.env.NODE_ENV === 'development'
      
      // 🔍 添加详细日志：检查字段权限配置（仅开发环境）
      if (isDev) {
        console.log('🔍 [字段权限过滤] 开始执行', {
          url: req.url,
          method: req.method,
          user: req.user?.username,
          roles: req.permissionContext?.roles,
          resource: req.permissionContext?.resource,
          hasFieldPermissions: !!fieldPermissions,
          readable: fieldPermissions?.readable,
          readableCount: fieldPermissions?.readable?.length
        })
      }
      
      // 如果没有字段权限配置或允许所有字段，直接返回
      if (!fieldPermissions || fieldPermissions.readable.includes('*')) {
        if (isDev) {
          console.log('⚠️ [字段权限过滤] 跳过过滤 - 无限制或允许所有字段', {
            reason: !fieldPermissions ? '无字段权限配置' : '允许所有字段(*)'
          })
        }
        if (isDev && body && body.success) {
          body._debug_fieldPermissions = {
            readable: ['*'],
            writable: ['*'],
            message: '无字段权限限制或允许所有字段'
          }
        }
        return originalJson(body)
      }

      // 调试日志
      logger.debug('字段权限过滤', {
        readable: fieldPermissions.readable,
        url: req.url,
        method: req.method
      })
      
      // 🔍 添加详细日志：检查 unitPricePerBox 字段（仅开发环境）
      if (isDev) {
        const hasUnitPricePerBox = fieldPermissions.readable.includes('unitPricePerBox')
        console.log('🔍 [字段权限过滤] unitPricePerBox 字段检查', {
          hasPermission: hasUnitPricePerBox,
          readableFields: fieldPermissions.readable,
          willBeFiltered: !hasUnitPricePerBox
        })
      }

      // 过滤响应数据
      if (body) {
        let filterStats = {
          totalItems: 0,
          originalFieldsSet: new Set<string>(),
          removedFieldsSet: new Set<string>(),
          keptFieldsSet: new Set<string>()
        }

        // 辅助函数：收集字段统计信息
        const collectFieldStats = (item: any) => {
          if (item && typeof item === 'object') {
            const originalFields = Object.keys(item)
            originalFields.forEach(f => filterStats.originalFieldsSet.add(f))
            
            const filtered = filterObject(item, fieldPermissions.readable)
            const keptFields = Object.keys(filtered)
            keptFields.forEach(f => filterStats.keptFieldsSet.add(f))
            
            const removedFields = originalFields.filter(f => !keptFields.includes(f))
            removedFields.forEach(f => filterStats.removedFieldsSet.add(f))
            
            filterStats.totalItems++
            return filtered
          }
          return item
        }

        // 处理标准响应格式：{ success: true, data: ... }
        if (body.success && body.data) {
          if (Array.isArray(body.data)) {
            body.data = body.data.map(collectFieldStats)
          } else if (typeof body.data === 'object') {
            body.data = collectFieldStats(body.data)
          }
          
          // 🔍 打印字段过滤统计信息（仅开发环境）
          if (isDev && filterStats.totalItems > 0) {
            console.log('📊 [字段权限过滤] 过滤统计', {
              url: req.url,
              user: req.user?.username,
              roles: req.permissionContext?.roles,
              totalItems: filterStats.totalItems,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              removedCount: filterStats.removedFieldsSet.size,
              summary: filterStats.removedFieldsSet.size > 0 
                ? `❌ 已过滤 ${filterStats.removedFieldsSet.size} 个字段: ${Array.from(filterStats.removedFieldsSet).join(', ')}`
                : '✅ 未过滤任何字段'
            })
          }
          
          // 开发环境下，附加字段权限调试信息
          if (isDev) {
            body._debug_fieldPermissions = {
              readable: fieldPermissions.readable,
              writable: fieldPermissions.writable,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              message: '当前请求的字段权限配置'
            }
          }
        }
        // 处理分页响应格式：{ data: [...], pagination: {...} }
        else if (body.data && Array.isArray(body.data) && body.pagination) {
          body.data = body.data.map(collectFieldStats)
          
          // 🔍 打印字段过滤统计信息（仅开发环境）
          if (isDev && filterStats.totalItems > 0) {
            console.log('📊 [字段权限过滤] 过滤统计', {
              url: req.url,
              user: req.user?.username,
              roles: req.permissionContext?.roles,
              totalItems: filterStats.totalItems,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              removedCount: filterStats.removedFieldsSet.size,
              summary: filterStats.removedFieldsSet.size > 0 
                ? `❌ 已过滤 ${filterStats.removedFieldsSet.size} 个字段: ${Array.from(filterStats.removedFieldsSet).join(', ')}`
                : '✅ 未过滤任何字段'
            })
          }
          
          if (isDev) {
            body._debug_fieldPermissions = {
              readable: fieldPermissions.readable,
              writable: fieldPermissions.writable,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              message: '当前请求的字段权限配置'
            }
          }
        }
        // 处理直接数组响应：[...]
        else if (Array.isArray(body)) {
          const filtered = body.map(collectFieldStats)
          
          // 🔍 打印字段过滤统计信息（仅开发环境）
          if (isDev && filterStats.totalItems > 0) {
            console.log('📊 [字段权限过滤] 过滤统计', {
              url: req.url,
              user: req.user?.username,
              roles: req.permissionContext?.roles,
              totalItems: filterStats.totalItems,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              removedCount: filterStats.removedFieldsSet.size,
              summary: filterStats.removedFieldsSet.size > 0 
                ? `❌ 已过滤 ${filterStats.removedFieldsSet.size} 个字段: ${Array.from(filterStats.removedFieldsSet).join(', ')}`
                : '✅ 未过滤任何字段'
            })
          }
          
          return originalJson(filtered)
        }
        // 处理直接对象响应：{...}
        else if (typeof body === 'object' && !body.success && !body.data) {
          const filtered = collectFieldStats(body)
          
          // 🔍 打印字段过滤统计信息（仅开发环境）
          if (isDev && filterStats.totalItems > 0) {
            console.log('📊 [字段权限过滤] 过滤统计', {
              url: req.url,
              user: req.user?.username,
              roles: req.permissionContext?.roles,
              totalItems: filterStats.totalItems,
              originalFields: Array.from(filterStats.originalFieldsSet).sort(),
              keptFields: Array.from(filterStats.keptFieldsSet).sort(),
              removedFields: Array.from(filterStats.removedFieldsSet).sort(),
              removedCount: filterStats.removedFieldsSet.size,
              summary: filterStats.removedFieldsSet.size > 0 
                ? `❌ 已过滤 ${filterStats.removedFieldsSet.size} 个字段: ${Array.from(filterStats.removedFieldsSet).join(', ')}`
                : '✅ 未过滤任何字段'
            })
          }
          
          return originalJson(filtered)
        }
      }

      return originalJson(body)
    }

    next()
  }
}

/**
 * 过滤对象字段
 */
function filterObject(obj: any, allowedFields: string[]): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const filtered: any = {}
  
  // 始终保留关键字段，不受字段权限限制
  // - id: 唯一标识
  // - label: 用于下拉选项显示
  // - consumptionAmount: 消耗金额（基于 packPrice，仅显示）
  // - packPerBox, piecePerPack: 计算所需的基础字段
  // 注意：unitPricePerBox 已移除，现在受字段权限控制
  const alwaysIncludeFields = ['id', 'label', 'packPerBox', 'piecePerPack', 'packPrice']
  
  for (const field of alwaysIncludeFields) {
    if (field in obj) {
      filtered[field] = obj[field]
    }
  }

  for (const field of allowedFields) {
    if (field in obj) {
      filtered[field] = obj[field]
    }
  }

  return filtered
}

// 扩展Request接口以包含数据过滤条件和权限上下文
declare global {
  namespace Express {
    interface Request {
      dataFilter?: any
      permissionContext?: {
        userId: string
        baseId: number
        roles: string[]
        dataFilter: any
        fieldPermissions: {
          readable: string[]
          writable: string[]
        }
      }
    }
  }
}
