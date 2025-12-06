import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子数据初始化...')

  // 创建系统核心角色（其他角色由超级管理员自定义创建）
  const roles = [
    {
      name: 'SUPER_ADMIN',
      nameKey: 'role.super_admin',
      description: '超级管理员，拥有系统最高权限',
      descriptionKey: 'role.super_admin.description',
      permissions: [] as string[],  // 权限由 Casbin 管理，不在此存储
      isSystem: true,
      level: 0  // 最高级别
    },
    {
      name: 'ADMIN',
      nameKey: 'role.admin',
      description: '系统管理员，拥有系统管理权限',
      descriptionKey: 'role.admin.description',
      permissions: [] as string[],
      isSystem: true,
      level: 1
    }
  ]

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData
    })
  }

  console.log('✅ 系统角色创建完成')

  // 创建超级管理员用户
  const superAdminPassword = await bcrypt.hash('superAdmin123', 10)
  
  const superAdminUser = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      passwordHash: superAdminPassword  // 重新执行 seed 时会更新密码
    },
    create: {
      username: 'superadmin',
      email: 'superadmin@milicard.com',
      passwordHash: superAdminPassword,
      name: '超级管理员',
      isActive: true
    }
  })

  // 给超级管理员分配 SUPER_ADMIN 角色
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' }
  })

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        uk_user_role_active: {
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
          isActive: true
        }
      },
      update: {},
      create: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
        assignedBy: superAdminUser.id,
        isActive: true
      }
    })
  }

  console.log('✅ 超级管理员用户创建完成')

  // 创建默认管理员用户
  const adminPassword = await bcrypt.hash('!F#&2g46Vuj', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPassword  // 重新执行 seed 时会更新密码
    },
    create: {
      username: 'admin',
      email: 'admin@milicard.com',
      passwordHash: adminPassword,
      name: '系统管理员',
      isActive: true
    }
  })

  // 给管理员分配系统管理员角色
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' }
  })

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        uk_user_role_active: {
          userId: adminUser.id,
          roleId: adminRole.id,
          isActive: true
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: superAdminUser.id,  // 由超级管理员分配
        isActive: true
      }
    })
  }

  console.log('✅ 默认管理员用户创建完成')

  // 初始化 Casbin 策略
  console.log('🔐 初始化 Casbin 权限策略...')

  // 1. 为 SUPER_ADMIN 角色添加全局权限策略
  const existingSuperAdminPolicy = await prisma.casbinRule.findFirst({
    where: { ptype: 'p', v0: 'SUPER_ADMIN', v1: '*', v2: '*' }
  })

  if (!existingSuperAdminPolicy) {
    await prisma.casbinRule.create({
      data: {
        ptype: 'p',
        v0: 'SUPER_ADMIN',
        v1: '*',      // 所有基地
        v2: '*',      // 所有资源
        v3: '*',      // 所有操作
        v4: 'allow'
      }
    })
    console.log('   ✅ SUPER_ADMIN 全局权限策略已创建')
  }

  // 2. 将 superadmin 用户添加到 SUPER_ADMIN 角色（Casbin g 策略）
  const existingSuperAdminGroup = await prisma.casbinRule.findFirst({
    where: { ptype: 'g', v0: superAdminUser.id, v1: 'SUPER_ADMIN' }
  })

  if (!existingSuperAdminGroup) {
    await prisma.casbinRule.create({
      data: {
        ptype: 'g',
        v0: superAdminUser.id,
        v1: 'SUPER_ADMIN',
        v2: '*'       // 所有基地
      }
    })
    console.log('   ✅ superadmin 用户已添加到 SUPER_ADMIN 角色')
  }

  // 3. 为 ADMIN 角色添加全局权限策略
  const existingAdminPolicy = await prisma.casbinRule.findFirst({
    where: { ptype: 'p', v0: 'ADMIN', v1: '*', v2: '*' }
  })

  if (!existingAdminPolicy) {
    await prisma.casbinRule.create({
      data: {
        ptype: 'p',
        v0: 'ADMIN',
        v1: '*',      // 所有基地
        v2: '*',      // 所有资源
        v3: '*',      // 所有操作
        v4: 'allow'
      }
    })
    console.log('   ✅ ADMIN 全局权限策略已创建')
  }

  // 4. 将 admin 用户添加到 ADMIN 角色（Casbin g 策略）
  const existingAdminGroup = await prisma.casbinRule.findFirst({
    where: { ptype: 'g', v0: adminUser.id, v1: 'ADMIN' }
  })

  if (!existingAdminGroup) {
    await prisma.casbinRule.create({
      data: {
        ptype: 'g',
        v0: adminUser.id,
        v1: 'ADMIN',
        v2: '*'       // 所有基地
      }
    })
    console.log('   ✅ admin 用户已添加到 ADMIN 角色')
  }

  console.log('✅ Casbin 权限策略初始化完成')

  console.log('🎉 数据库种子数据初始化完成！')
  console.log('📋 默认账号：')
  console.log('   超级管理员：superadmin / superAdmin123')
  console.log('   系统管理员：admin / !F#&2g46Vuj')
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
