import { Request, Response } from 'express'
import { AuthService } from '../services/authService'
import { AuthError } from '../types/auth'
import { logger } from '../utils/logger'

export class AuthController {
  /**
   * 用户注册
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.register(req.body)
      
      res.status(201).json({
        success: true,
        message: '注册成功',
        data: result
      })
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.type
        })
      } else {
        logger.error('注册控制器异常', {
          error: error instanceof Error ? error.message : String(error),
          body: req.body
        })

        res.status(500).json({
          success: false,
          message: '注册失败，请稍后重试'
        })
      }
    }
  }

  /**
   * 用户登录
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.login(req.body)
      
      // 设置刷新令牌到 HttpOnly Cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
      })

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      })
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.type
        })
      } else {
        logger.error('登录控制器异常', {
          error: error instanceof Error ? error.message : String(error),
          username: req.body.username
        })

        res.status(500).json({
          success: false,
          message: '登录失败，请稍后重试'
        })
      }
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // 从请求体或Cookie中获取刷新令牌
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: '缺少刷新令牌'
        })
        return
      }

      const result = await AuthService.refreshToken(refreshToken)
      
      // 更新刷新令牌Cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
      })

      res.json({
        success: true,
        message: '令牌刷新成功',
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      })
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.type
        })
      } else {
        logger.error('令牌刷新控制器异常', {
          error: error instanceof Error ? error.message : String(error)
        })

        res.status(500).json({
          success: false,
          message: '令牌刷新失败，请稍后重试'
        })
      }
    }
  }

  /**
   * 用户登出
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // 清除刷新令牌Cookie
      res.clearCookie('refreshToken')

      // 记录登出日志
      if (req.user) {
        logger.info('用户登出', {
          userId: req.user.id,
          username: req.user.username
        })
      }

      res.json({
        success: true,
        message: '登出成功'
      })
    } catch (error) {
      logger.error('登出控制器异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '登出失败，请稍后重试'
      })
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证的用户'
        })
        return
      }

      const userInfo = await AuthService.getUserInfo(req.user.id)

      res.json({
        success: true,
        message: '获取用户信息成功',
        data: userInfo
      })
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.type
        })
      } else {
        logger.error('获取用户信息控制器异常', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.id
        })

        res.status(500).json({
          success: false,
          message: '获取用户信息失败，请稍后重试'
        })
      }
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证的用户'
        })
        return
      }

      await AuthService.changePassword(req.user.id, req.body)

      res.json({
        success: true,
        message: '密码修改成功'
      })
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.type
        })
      } else {
        logger.error('修改密码控制器异常', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user?.id
        })

        res.status(500).json({
          success: false,
          message: '密码修改失败，请稍后重试'
        })
      }
    }
  }

  /**
   * 检查用户名是否可用
   */
  static async checkUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params

      const existingUser = await AuthService.getUserInfo(username).catch(() => null)

      res.json({
        success: true,
        data: {
          available: !existingUser,
          message: existingUser ? '用户名已被使用' : '用户名可用'
        }
      })
    } catch (error) {
      logger.error('检查用户名控制器异常', {
        error: error instanceof Error ? error.message : String(error),
        username: req.params.username
      })

      res.status(500).json({
        success: false,
        message: '检查用户名失败，请稍后重试'
      })
    }
  }

  /**
   * 验证令牌有效性
   */
  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      // 如果能到达这里，说明令牌有效（通过了认证中间件）
      res.json({
        success: true,
        message: '令牌有效',
        data: {
          user: req.user,
          tokenExpiringSoon: req.headers['x-token-refresh-required'] === 'true'
        }
      })
    } catch (error) {
      logger.error('验证令牌控制器异常', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '令牌验证失败'
      })
    }
  }
}
