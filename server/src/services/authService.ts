import { prisma } from '../utils/database'
import { PasswordService } from './passwordService'
import { JwtService } from './jwtService'
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  AuthError, 
  AuthErrorType,
  PasswordChangeRequest 
} from '../types/auth'
import { logger } from '../utils/logger'

export class AuthService {
  /**
   * 用户注册
   */
  static async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const { username, password, email, displayName } = registerData

    try {
      // 检查用户名是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email: email || undefined }
          ]
        }
      })

      if (existingUser) {
        if (existingUser.username === username) {
          throw new AuthError(AuthErrorType.USER_ALREADY_EXISTS, '用户名已存在')
        }
        if (existingUser.email === email) {
          throw new AuthError(AuthErrorType.USER_ALREADY_EXISTS, '邮箱已被使用')
        }
      }

      // 验证密码强度
      const passwordValidation = PasswordService.validatePasswordStrength(password)
      if (!passwordValidation.isValid) {
        throw new AuthError(
          AuthErrorType.PASSWORD_TOO_WEAK, 
          passwordValidation.errors.join('; ')
        )
      }

      // 哈希密码
      const passwordHash = await PasswordService.hashPassword(password)

      // 创建用户
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          name: displayName || username,
          isActive: true
        },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })

      // 为新用户分配默认角色（如果存在）
      const defaultRole = await prisma.role.findFirst({
        where: { name: 'USER' }
      })

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: defaultRole.id,
            assignedBy: user.id, // 自己分配给自己
            isActive: true
          }
        })

        // 重新加载用户数据以包含角色
        const userWithRoles = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        })

        if (userWithRoles) {
          user.userRoles = userWithRoles.userRoles
        }
      }

      // 生成令牌
      const tokenPair = JwtService.generateTokenPair({
        userId: user.id,
        username: user.username,
        roles: user.userRoles.map(ur => ur.role.name)
      })

      // 记录注册日志
      logger.info('用户注册成功', {
        userId: user.id,
        username: user.username,
        email: user.email
      })

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          displayName: user.name,
          roles: user.userRoles.map(ur => ur.role.name)
        },
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      logger.error('用户注册失败', {
        error: error instanceof Error ? error.message : String(error),
        username,
        email
      })

      throw new AuthError(AuthErrorType.USER_ALREADY_EXISTS, '注册失败，请稍后重试', 500)
    }
  }

  /**
   * 用户登录
   */
  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { username, password } = loginData

    try {
      // 查找用户
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw new AuthError(AuthErrorType.INVALID_CREDENTIALS, '用户名或密码错误')
      }

      if (!user.isActive) {
        throw new AuthError(AuthErrorType.ACCOUNT_DISABLED, '账户已被禁用')
      }

      // 验证密码
      const passwordResult = await PasswordService.verifyAndRehash(password, user.passwordHash)
      
      if (!passwordResult.isValid) {
        // 记录登录失败
        logger.warn('登录失败 - 密码错误', {
          username,
          userId: user.id
        })
        throw new AuthError(AuthErrorType.INVALID_CREDENTIALS, '用户名或密码错误')
      }

      // 如果密码需要重新哈希，更新数据库
      if (passwordResult.newHash) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: passwordResult.newHash }
        })
      }

      // 更新最后登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // 生成令牌
      const tokenPair = JwtService.generateTokenPair({
        userId: user.id,
        username: user.username,
        roles: user.userRoles.map(ur => ur.role.name)
      })

      // 记录登录成功日志
      logger.info('用户登录成功', {
        userId: user.id,
        username: user.username,
        roles: user.userRoles.map(ur => ur.role.name)
      })

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          displayName: user.name,
          roles: user.userRoles.map(ur => ur.role.name)
        },
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      logger.error('登录服务异常', {
        error: error instanceof Error ? error.message : String(error),
        username
      })

      throw new AuthError(AuthErrorType.INVALID_CREDENTIALS, '登录失败，请稍后重试', 500)
    }
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // 验证刷新令牌
      const { userId } = JwtService.verifyRefreshToken(refreshToken)

      // 查找用户
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: { isActive: true },
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

      // 生成新的令牌对
      const tokenPair = JwtService.generateTokenPair({
        userId: user.id,
        username: user.username,
        roles: user.userRoles.map(ur => ur.role.name)
      })

      logger.info('令牌刷新成功', {
        userId: user.id,
        username: user.username
      })

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          displayName: user.name,
          roles: user.userRoles.map(ur => ur.role.name)
        },
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      logger.error('令牌刷新失败', {
        error: error instanceof Error ? error.message : String(error)
      })

      throw new AuthError(AuthErrorType.INVALID_TOKEN, '令牌刷新失败', 500)
    }
  }

  /**
   * 修改密码
   */
  static async changePassword(
    userId: string, 
    passwordChangeData: PasswordChangeRequest
  ): Promise<void> {
    const { currentPassword, newPassword } = passwordChangeData

    try {
      // 查找用户
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new AuthError(AuthErrorType.USER_NOT_FOUND, '用户不存在')
      }

      // 验证当前密码
      const isCurrentPasswordValid = await PasswordService.verifyPassword(
        currentPassword, 
        user.passwordHash
      )

      if (!isCurrentPasswordValid) {
        throw new AuthError(AuthErrorType.INVALID_CREDENTIALS, '当前密码错误')
      }

      // 验证新密码强度
      const passwordValidation = PasswordService.validatePasswordStrength(newPassword)
      if (!passwordValidation.isValid) {
        throw new AuthError(
          AuthErrorType.PASSWORD_TOO_WEAK, 
          passwordValidation.errors.join('; ')
        )
      }

      // 哈希新密码
      const newPasswordHash = await PasswordService.hashPassword(newPassword)

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      })

      logger.info('密码修改成功', {
        userId: user.id,
        username: user.username
      })
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      logger.error('密码修改失败', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })

      throw new AuthError(AuthErrorType.INVALID_CREDENTIALS, '密码修改失败，请稍后重试', 500)
    }
  }

  /**
   * 获取用户信息
   */
  static async getUserInfo(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: { isActive: true },
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw new AuthError(AuthErrorType.USER_NOT_FOUND, '用户不存在')
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email || '',
        displayName: user.name,
        roles: user.userRoles.map(ur => ur.role.name),
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }

      logger.error('获取用户信息失败', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })

      throw new AuthError(AuthErrorType.USER_NOT_FOUND, '获取用户信息失败', 500)
    }
  }
}
