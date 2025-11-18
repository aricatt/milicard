import jwt from 'jsonwebtoken'
import { JwtPayload, AuthError, AuthErrorType } from '../types/auth'
import { logger } from '../utils/logger'

export class JwtService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m'  // 15分钟
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d'  // 7天
  
  private static get jwtSecret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
  }

  private static get refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required')
    }
    return secret
  }

  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'milicard-api',
        audience: 'milicard-client'
      })
    } catch (error) {
      logger.error('生成访问令牌失败', { error, userId: payload.userId })
      throw new AuthError(AuthErrorType.INVALID_TOKEN, '令牌生成失败', 500)
    }
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(userId: string): string {
    try {
      return jwt.sign(
        { userId, type: 'refresh' }, 
        this.refreshSecret, 
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
          issuer: 'milicard-api',
          audience: 'milicard-client'
        }
      )
    } catch (error) {
      logger.error('生成刷新令牌失败', { error, userId })
      throw new AuthError(AuthErrorType.INVALID_TOKEN, '刷新令牌生成失败', 500)
    }
  }

  /**
   * 验证访问令牌
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'milicard-api',
        audience: 'milicard-client'
      }) as JwtPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(AuthErrorType.TOKEN_EXPIRED, '访问令牌已过期')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError(AuthErrorType.INVALID_TOKEN, '无效的访问令牌')
      } else {
        logger.error('验证访问令牌失败', { error })
        throw new AuthError(AuthErrorType.INVALID_TOKEN, '令牌验证失败')
      }
    }
  }

  /**
   * 验证刷新令牌
   */
  static verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: 'milicard-api',
        audience: 'milicard-client'
      }) as any

      if (decoded.type !== 'refresh') {
        throw new AuthError(AuthErrorType.INVALID_TOKEN, '无效的刷新令牌类型')
      }

      return { userId: decoded.userId }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError(AuthErrorType.TOKEN_EXPIRED, '刷新令牌已过期')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError(AuthErrorType.INVALID_TOKEN, '无效的刷新令牌')
      } else if (error instanceof AuthError) {
        throw error
      } else {
        logger.error('验证刷新令牌失败', { error })
        throw new AuthError(AuthErrorType.INVALID_TOKEN, '刷新令牌验证失败')
      }
    }
  }

  /**
   * 从请求头中提取令牌
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }

    return parts[1]
  }

  /**
   * 获取令牌剩余有效时间（秒）
   */
  static getTokenRemainingTime(token: string): number {
    try {
      const decoded = jwt.decode(token) as any
      if (!decoded || !decoded.exp) {
        return 0
      }

      const now = Math.floor(Date.now() / 1000)
      const remaining = decoded.exp - now

      return Math.max(0, remaining)
    } catch (error) {
      return 0
    }
  }

  /**
   * 检查令牌是否即将过期（5分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    const remainingTime = this.getTokenRemainingTime(token)
    return remainingTime > 0 && remainingTime < 300 // 5分钟
  }

  /**
   * 生成令牌对（访问令牌 + 刷新令牌）
   */
  static generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): {
    accessToken: string
    refreshToken: string
    expiresIn: number
  } {
    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken(payload.userId)
    
    // 返回访问令牌的过期时间（秒）
    const expiresIn = this.getTokenRemainingTime(accessToken)

    return {
      accessToken,
      refreshToken,
      expiresIn
    }
  }
}
