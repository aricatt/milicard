/**
 * 认证测试辅助函数
 */

import jwt from 'jsonwebtoken'
import { User } from '@prisma/client'

/**
 * 生成测试用JWT令牌
 */
export function generateTestToken(user: Partial<User>): string {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: ['user'] // 默认角色
  }

  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign(payload, secret, { expiresIn: '1h' })
}

/**
 * 生成管理员测试令牌
 */
export function generateAdminTestToken(user: Partial<User>): string {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: ['admin'] // 管理员角色
  }

  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign(payload, secret, { expiresIn: '1h' })
}
