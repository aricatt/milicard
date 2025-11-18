import request from 'supertest'
import app from '../../index'
import { createTestUser, createTestRole, assignRoleToUser, testPrisma } from '../../__tests__/setup'
import { faker } from '@faker-js/faker'

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        username: faker.internet.userName(),
        password: 'TestPassword123!',
        email: faker.internet.email(),
        displayName: faker.person.fullName()
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('注册成功')
      expect(response.body.data.user.username).toBe(userData.username)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('should reject invalid request data', async () => {
      const invalidData = {
        username: 'ab', // 太短
        password: 'weak', // 太弱
        email: 'invalid-email' // 无效邮箱
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('请求数据验证失败')
      expect(response.body.errors).toBeDefined()
      expect(response.body.errors.length).toBeGreaterThan(0)
    })

    it('should reject duplicate username', async () => {
      const username = faker.internet.userName()
      await createTestUser({ username })

      const userData = {
        username,
        password: 'TestPassword123!',
        email: faker.internet.email()
      }

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('用户名已存在')
    })
  })

  describe('POST /api/v1/auth/login', () => {
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

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('登录成功')
      expect(response.body.data.user.id).toBe(user.id)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.expiresIn).toBeGreaterThan(0)

      // 检查是否设置了刷新令牌Cookie
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      if (Array.isArray(cookies)) {
        expect(cookies.some((cookie: string) => cookie.startsWith('refreshToken='))).toBe(true)
      }
    })

    it('should reject invalid credentials', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'WrongPassword123!'
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('用户名或密码错误')
    })

    it('should reject invalid request format', async () => {
      const invalidData = {
        username: '', // 空用户名
        password: '' // 空密码
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('请求数据验证失败')
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // 先登录获取刷新令牌
      const user = await createTestUser({
        username: 'refreshtest',
        password: 'TestPassword123!'
      })

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'refreshtest',
          password: 'TestPassword123!'
        })

      const cookies = loginResponse.headers['set-cookie']
      const refreshToken = loginResponse.body.data.refreshToken || 
        (Array.isArray(cookies) ? 
          cookies.find((cookie: string) => cookie.startsWith('refreshToken='))
            ?.split('=')[1]?.split(';')[0] : null)

      // 使用刷新令牌
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('令牌刷新成功')
      expect(response.body.data.user.id).toBe(user.id)
      expect(response.body.data.token).toBeDefined()
    })

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('缺少刷新令牌')
    })

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token' })
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info', async () => {
      const user = await createTestUser({
        username: 'metest',
        password: 'TestPassword123!'
      })

      // 登录获取令牌
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'metest',
          password: 'TestPassword123!'
        })

      const token = loginResponse.body.data.token

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(user.id)
      expect(response.body.data.username).toBe(user.username)
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('缺少访问令牌')
    })

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/v1/auth/password', () => {
    it('should change password successfully', async () => {
      const user = await createTestUser({
        username: 'changepass',
        password: 'OldPassword123!'
      })

      // 登录获取令牌
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'changepass',
          password: 'OldPassword123!'
        })

      const token = loginResponse.body.data.token

      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('密码修改成功')

      // 验证新密码可以登录
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'changepass',
          password: 'NewPassword123!'
        })
        .expect(200)
    })

    it('should reject incorrect current password', async () => {
      const user = await createTestUser({
        username: 'wrongpass',
        password: 'CorrectPassword123!'
      })

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'wrongpass',
          password: 'CorrectPassword123!'
        })

      const token = loginResponse.body.data.token

      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('当前密码错误')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser({
        username: 'logouttest',
        password: 'TestPassword123!'
      })

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'logouttest',
          password: 'TestPassword123!'
        })

      const token = loginResponse.body.data.token

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('登出成功')

      // 检查是否清除了刷新令牌Cookie
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      if (Array.isArray(cookies)) {
        expect(cookies.some((cookie: string) => 
          cookie.startsWith('refreshToken=') && cookie.includes('Max-Age=0')
        )).toBe(true)
      }
    })
  })

  describe('GET /api/v1/auth/validate', () => {
    it('should validate token successfully', async () => {
      const user = await createTestUser({
        username: 'validatetest',
        password: 'TestPassword123!'
      })

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'validatetest',
          password: 'TestPassword123!'
        })

      const token = loginResponse.body.data.token

      const response = await request(app)
        .get('/api/v1/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('令牌有效')
      expect(response.body.data.user.id).toBe(user.id)
    })

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/validate')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/auth/check-username/:username', () => {
    it('should return username availability', async () => {
      const availableUsername = faker.internet.userName()
      
      const response = await request(app)
        .get(`/api/v1/auth/check-username/${availableUsername}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.available).toBe(true)
    })

    it('should return username unavailable for existing user', async () => {
      const user = await createTestUser({
        username: 'existinguser'
      })

      const response = await request(app)
        .get('/api/v1/auth/check-username/existinguser')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.available).toBe(false)
    })
  })
})
