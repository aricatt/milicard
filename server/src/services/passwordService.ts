import bcrypt from 'bcryptjs'
import { PasswordPolicy, DEFAULT_PASSWORD_POLICY, AuthError, AuthErrorType } from '../types/auth'

export class PasswordService {
  private static readonly SALT_ROUNDS = 12

  /**
   * 哈希密码
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * 验证密码强度
   */
  static validatePasswordStrength(
    password: string, 
    policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查最小长度
    if (password.length < policy.minLength) {
      errors.push(`密码长度至少需要 ${policy.minLength} 个字符`)
    }

    // 检查大写字母
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母')
    }

    // 检查小写字母
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母')
    }

    // 检查数字
    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字')
    }

    // 检查特殊字符
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 生成随机密码
   */
  static generateRandomPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*'
    
    const allChars = uppercase + lowercase + numbers + specialChars
    let password = ''

    // 确保至少包含每种类型的字符
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += specialChars[Math.floor(Math.random() * specialChars.length)]

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // 打乱字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * 检查密码是否需要更新（基于哈希算法版本）
   */
  static async needsRehash(hashedPassword: string): Promise<boolean> {
    // 检查是否使用了当前的盐轮数（支持$2a$和$2b$）
    const currentPattern = new RegExp(`^\\$2[ab]\\$${this.SALT_ROUNDS}\\$`)
    return !currentPattern.test(hashedPassword)
  }

  /**
   * 验证并可能重新哈希密码
   */
  static async verifyAndRehash(
    password: string, 
    hashedPassword: string
  ): Promise<{ isValid: boolean; newHash?: string }> {
    const isValid = await this.verifyPassword(password, hashedPassword)
    
    if (isValid && await this.needsRehash(hashedPassword)) {
      const newHash = await this.hashPassword(password)
      return { isValid: true, newHash }
    }

    return { isValid }
  }
}
