import { Request, Response, NextFunction } from 'express'
import { JwtService } from '../services/jwtService'
import { AuthError, AuthErrorType, JwtPayload } from '../types/auth'
import { logger } from '../utils/logger'
import { prisma } from '../utils/database'

// 扩展 Request 接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        email: string
        displayName: string
        roles: string[]
        isActive: boolean
      }
      token?: string
    }
  }
}

/**
 * 认证中间件 - 验证JWT令牌并加载用户信息
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头中提取令牌
    const authHeader = req.headers.authorization
    const token = JwtService.extractTokenFromHeader(authHeader)

    if (!token) {
      throw new AuthError(AuthErrorType.INVALID_TOKEN, '缺少访问令牌')
    }

    // 验证令牌
    const payload: JwtPayload = JwtService.verifyAccessToken(token)

    // 从数据库加载用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      throw new AuthError(AuthErrorType.USER_NOT_FOUND, '用户不存在')
    }

    if (!user.isActive) {
      throw new AuthError(AuthErrorType.ACCOUNT_DISABLED, '账户已被禁用')
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      displayName: user.name,
      roles: user.userRoles.map(ur => ur.role.name),
      isActive: user.isActive
    }

    req.token = token

    // 记录访问日志
    logger.info('用户认证成功', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    })

    next()
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn('认证失败', {
        error: error.message,
        type: error.type,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      })

      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.type
      })
    } else {
      logger.error('认证中间件异常', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
        path: req.path
      })

      res.status(500).json({
        success: false,
        message: '认证服务异常'
      })
    }
  }
}

/**
 * 可选认证中间件 - 如果有令牌则验证，没有则跳过
 */
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization
  const token = JwtService.extractTokenFromHeader(authHeader)

  if (!token) {
    // 没有令牌，直接跳过
    return next()
  }

  // 有令牌，使用标准认证流程
  return authenticateToken(req, res, next)
}

/**
 * 角色权限中间件工厂函数
 */
export const requireRoles = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '需要身份认证',
        code: AuthErrorType.INVALID_TOKEN
      })
      return
    }

    const userRoles = req.user.roles
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

    if (!hasRequiredRole) {
      logger.warn('权限不足', {
        userId: req.user.id,
        username: req.user.username,
        userRoles,
        requiredRoles,
        path: req.path,
        method: req.method
      })

      res.status(403).json({
        success: false,
        message: '权限不足',
        code: AuthErrorType.INSUFFICIENT_PERMISSIONS
      })
      return
    }

    next()
  }
}

/**
 * 超级管理员权限中间件
 */
export const requireSuperAdmin = requireRoles('SUPER_ADMIN')

/**
 * 管理员权限中间件（超级管理员或普通管理员）
 */
export const requireAdmin = requireRoles('SUPER_ADMIN', 'ADMIN')

/**
 * 检查用户是否可以访问指定用户的资源
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '需要身份认证',
        code: AuthErrorType.INVALID_TOKEN
      })
      return
    }

    const targetUserId = req.params[userIdParam]
    const currentUserId = req.user.id
    const isAdmin = req.user.roles.includes('SUPER_ADMIN') || req.user.roles.includes('ADMIN')

    if (targetUserId !== currentUserId && !isAdmin) {
      logger.warn('尝试访问其他用户资源', {
        currentUserId,
        targetUserId,
        username: req.user.username,
        path: req.path,
        method: req.method
      })

      res.status(403).json({
        success: false,
        message: '只能访问自己的资源',
        code: AuthErrorType.INSUFFICIENT_PERMISSIONS
      })
      return
    }

    next()
  }
}

/**
 * 令牌刷新检查中间件
 */
export const checkTokenRefresh = (req: Request, res: Response, next: NextFunction): void => {
  if (req.token && JwtService.isTokenExpiringSoon(req.token)) {
    // 在响应头中添加刷新提示
    res.set('X-Token-Refresh-Required', 'true')
  }
  next()
}
