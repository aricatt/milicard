import { Request, Response, NextFunction } from 'express'
import { PermissionService } from '../services/permissionService'
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
 * 权限检查中间件工厂函数
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
 * 超级管理员权限中间件
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN')

/**
 * 管理员权限中间件（超级管理员或普通管理员）
 */
export const requireAdmin = requireAnyPermission([
  'system:manage' as PermissionString
])

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
export const applyDataPermission = (resource: ResourceModule, action: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要身份认证'
        })
        return
      }

      const filter = await PermissionService.generateDataFilter({
        userId: req.user.id,
        roles: req.user.roles,
        resource,
        action
      })

      // 将过滤条件添加到请求对象中，供后续使用
      req.dataFilter = filter

      next()
    } catch (error) {
      logger.error('数据权限过滤中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id,
        resource,
        action
      })

      res.status(500).json({
        success: false,
        message: '数据权限检查异常'
      })
    }
  }
}

// 扩展Request接口以包含数据过滤条件
declare global {
  namespace Express {
    interface Request {
      dataFilter?: any
    }
  }
}
