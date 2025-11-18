import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

// 加载测试环境变量
dotenv.config({ path: '.env.test' })

// 全局测试数据库实例
let prisma: PrismaClient

// 测试前设置
beforeAll(async () => {
  // 创建测试数据库连接
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  // 连接数据库
  await prisma.$connect()

  // 清理测试数据
  await cleanupTestData()
})

// 每个测试后清理
afterEach(async () => {
  await cleanupTestData()
})

// 测试后清理
afterAll(async () => {
  await cleanupTestData()
  await prisma.$disconnect()
})

// 清理测试数据
async function cleanupTestData() {
  // 按依赖关系顺序删除数据
  const tablenames = [
    'user_roles',
    'users',
    'roles',
    'translations',
    'translation_reviews',
    'inventory',
    'goods'
  ]

  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${tablename}" WHERE 1=1`)
    } catch (error) {
      // 忽略表不存在的错误
      console.warn(`清理表 ${tablename} 时出错:`, error)
    }
  }
}

// 创建测试用户
export async function createTestUser(userData: {
  username?: string
  email?: string
  password?: string
  name?: string
}) {
  const defaultData = {
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VJBzwxEy2', // 'password123'
    name: 'Test User',
    isActive: true
  }

  const { password, ...userDataWithoutPassword } = userData

  return await prisma.user.create({
    data: {
      ...defaultData,
      ...userDataWithoutPassword,
      passwordHash: password
        ? await bcrypt.hash(password, 12)
        : defaultData.passwordHash
    }
  })
}

// 创建测试角色
export async function createTestRole(roleData: {
  name?: string
  description?: string
  permissions?: any
}) {
  const defaultData = {
    name: 'TEST_ROLE',
    description: '测试角色',
    permissions: ['test:read', 'test:write'],
    isSystem: false
  }

  return await prisma.role.create({
    data: {
      ...defaultData,
      ...roleData
    }
  })
}

// 为用户分配角色
export async function assignRoleToUser(userId: string, roleId: string) {
  return await prisma.userRole.create({
    data: {
      userId,
      roleId,
      assignedBy: userId,
      isActive: true
    }
  })
}

// 导出测试数据库实例
export { prisma as testPrisma }
