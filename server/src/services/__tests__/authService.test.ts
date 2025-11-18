import { AuthService } from '../authService'
import { AuthError, AuthErrorType } from '../../types/auth'
import { createTestUser, createTestRole, assignRoleToUser, testPrisma } from '../../__tests__/setup'
import { faker } from '@faker-js/faker'

describe('AuthService', () => {
  describe('register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        username: faker.internet.userName(),
        password: 'TestPassword123!',
        email: faker.internet.email(),
        displayName: faker.person.fullName()
      }

      const result = await AuthService.register(userData)

      expect(result.user.username).toBe(userData.username)
      expect(result.user.email).toBe(userData.email)
      expect(result.user.displayName).toBe(userData.displayName)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.expiresIn).toBeGreaterThan(0)

      // 验证用户已保存到数据库
      const savedUser = await testPrisma.user.findUnique({
        where: { username: userData.username }
      })
      expect(savedUser).toBeDefined()
      expect(savedUser?.isActive).toBe(true)
    })

    it('should reject duplicate username', async () => {
      const username = faker.internet.userName()
      
      // 创建第一个用户
      await createTestUser({ username })

      // 尝试创建相同用户名的用户
      const userData = {
        username,
        password: 'TestPassword123!',
        email: faker.internet.email()
      }

      await expect(AuthService.register(userData)).rejects.toThrow(AuthError)
      await expect(AuthService.register(userData)).rejects.toThrow('用户名已存在')
    })

    it('should reject duplicate email', async () => {
      const email = faker.internet.email()
      
      // 创建第一个用户
      await createTestUser({ email })

      // 尝试创建相同邮箱的用户
      const userData = {
        username: faker.internet.userName(),
        password: 'TestPassword123!',
        email
      }

      await expect(AuthService.register(userData)).rejects.toThrow(AuthError)
      await expect(AuthService.register(userData)).rejects.toThrow('邮箱已被使用')
    })

    it('should reject weak password', async () => {
      const userData = {
        username: faker.internet.userName(),
        password: 'weak',
        email: faker.internet.email()
      }

      await expect(AuthService.register(userData)).rejects.toThrow(AuthError)
      await expect(AuthService.register(userData)).rejects.toThrow(AuthErrorType.PASSWORD_TOO_WEAK)
    })

    it('should assign default role to new user', async () => {
      // 创建默认角色
      await createTestRole({ name: 'USER', description: '普通用户' })

      const userData = {
        username: faker.internet.userName(),
        password: 'TestPassword123!',
        email: faker.internet.email()
      }

      const result = await AuthService.register(userData)

      expect(result.user.roles).toContain('USER')
    })
  })

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const password = 'TestPassword123!'
      const user = await createTestUser({
        username: 'logintest',
        password
      })

      const loginData = {
        username: 'logintest',
        password
      }

      const result = await AuthService.login(loginData)

      expect(result.user.id).toBe(user.id)
      expect(result.user.username).toBe(user.username)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    it('should reject invalid username', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'TestPassword123!'
      }

      await expect(AuthService.login(loginData)).rejects.toThrow(AuthError)
      await expect(AuthService.login(loginData)).rejects.toThrow('用户名或密码错误')
    })

    it('should reject invalid password', async () => {
      await createTestUser({
        username: 'testuser',
        password: 'CorrectPassword123!'
      })

      const loginData = {
        username: 'testuser',
        password: 'WrongPassword123!'
      }

      await expect(AuthService.login(loginData)).rejects.toThrow(AuthError)
      await expect(AuthService.login(loginData)).rejects.toThrow('用户名或密码错误')
    })

    it('should reject inactive user', async () => {
      const user = await createTestUser({
        username: 'inactiveuser',
        password: 'TestPassword123!'
      })

      // 禁用用户
      await testPrisma.user.update({
        where: { id: user.id },
        data: { isActive: false }
      })

      const loginData = {
        username: 'inactiveuser',
        password: 'TestPassword123!'
      }

      await expect(AuthService.login(loginData)).rejects.toThrow(AuthError)
      await expect(AuthService.login(loginData)).rejects.toThrow('账户已被禁用')
    })

    it('should update last login time', async () => {
      const user = await createTestUser({
        username: 'logintime',
        password: 'TestPassword123!'
      })

      const loginData = {
        username: 'logintime',
        password: 'TestPassword123!'
      }

      await AuthService.login(loginData)

      const updatedUser = await testPrisma.user.findUnique({
        where: { id: user.id }
      })

      expect(updatedUser?.lastLoginAt).toBeDefined()
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const user = await createTestUser({
        username: 'refreshtest',
        password: 'TestPassword123!'
      })

      // 先登录获取刷新令牌
      const loginResult = await AuthService.login({
        username: 'refreshtest',
        password: 'TestPassword123!'
      })

      // 使用刷新令牌获取新的访问令牌
      const refreshResult = await AuthService.refreshToken(loginResult.refreshToken)

      expect(refreshResult.user.id).toBe(user.id)
      expect(refreshResult.token).toBeDefined()
      expect(refreshResult.refreshToken).toBeDefined()
      expect(refreshResult.token).not.toBe(loginResult.token) // 新的访问令牌
    })

    it('should reject invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token'

      await expect(AuthService.refreshToken(invalidToken)).rejects.toThrow(AuthError)
    })

    it('should reject refresh token for nonexistent user', async () => {
      // 创建用户并获取刷新令牌
      const user = await createTestUser({
        username: 'deletetest',
        password: 'TestPassword123!'
      })

      const loginResult = await AuthService.login({
        username: 'deletetest',
        password: 'TestPassword123!'
      })

      // 删除用户
      await testPrisma.user.delete({
        where: { id: user.id }
      })

      // 尝试使用刷新令牌
      await expect(AuthService.refreshToken(loginResult.refreshToken)).rejects.toThrow(AuthError)
      await expect(AuthService.refreshToken(loginResult.refreshToken)).rejects.toThrow('用户不存在')
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = await createTestUser({
        username: 'changepass',
        password: 'OldPassword123!'
      })

      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      }

      await AuthService.changePassword(user.id, changeData)

      // 验证新密码可以登录
      const loginResult = await AuthService.login({
        username: 'changepass',
        password: 'NewPassword123!'
      })

      expect(loginResult.user.id).toBe(user.id)
    })

    it('should reject incorrect current password', async () => {
      const user = await createTestUser({
        username: 'wrongcurrent',
        password: 'CorrectPassword123!'
      })

      const changeData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      }

      await expect(AuthService.changePassword(user.id, changeData)).rejects.toThrow(AuthError)
      await expect(AuthService.changePassword(user.id, changeData)).rejects.toThrow('当前密码错误')
    })

    it('should reject weak new password', async () => {
      const user = await createTestUser({
        username: 'weaknew',
        password: 'StrongPassword123!'
      })

      const changeData = {
        currentPassword: 'StrongPassword123!',
        newPassword: 'weak'
      }

      await expect(AuthService.changePassword(user.id, changeData)).rejects.toThrow(AuthError)
      await expect(AuthService.changePassword(user.id, changeData)).rejects.toThrow(AuthErrorType.PASSWORD_TOO_WEAK)
    })
  })

  describe('getUserInfo', () => {
    it('should return user info successfully', async () => {
      const user = await createTestUser({
        username: 'userinfo',
        email: 'userinfo@test.com'
      })

      const role = await createTestRole({ name: 'TEST_ROLE' })
      await assignRoleToUser(user.id, role.id)

      const userInfo = await AuthService.getUserInfo(user.id)

      expect(userInfo.id).toBe(user.id)
      expect(userInfo.username).toBe(user.username)
      expect(userInfo.email).toBe(user.email)
      expect(userInfo.roles).toContain('TEST_ROLE')
      expect(userInfo.isActive).toBe(true)
      expect(userInfo.createdAt).toBeDefined()
    })

    it('should reject nonexistent user', async () => {
      const nonexistentId = faker.string.uuid()

      await expect(AuthService.getUserInfo(nonexistentId)).rejects.toThrow(AuthError)
      await expect(AuthService.getUserInfo(nonexistentId)).rejects.toThrow('用户不存在')
    })
  })
})
