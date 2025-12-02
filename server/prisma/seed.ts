import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始数据库种子数据初始化...')

  // 创建系统角色（使用英文标识，权限定义在 src/types/permission.ts 的 SYSTEM_ROLE_PERMISSIONS）
  const roles = [
    {
      name: 'ADMIN',
      nameKey: 'role.admin',
      description: '系统管理员，拥有系统所有权限',
      descriptionKey: 'role.admin.description',
      permissions: [] as string[],  // 权限由 Casbin 管理，不在此存储
      isSystem: true
    },
    {
      name: 'BASE_MANAGER',
      nameKey: 'role.base_manager',
      description: '基地管理员，管理特定基地的所有业务',
      descriptionKey: 'role.base_manager.description',
      permissions: [] as string[],
      isSystem: true
    },
    {
      name: 'POINT_OWNER',
      nameKey: 'role.point_owner',
      description: '点位老板，管理自己的点位和采购订单',
      descriptionKey: 'role.point_owner.description',
      permissions: [] as string[],
      isSystem: true
    },
    {
      name: 'CUSTOMER_SERVICE',
      nameKey: 'role.customer_service',
      description: '客服，处理点位订单和发货配送',
      descriptionKey: 'role.customer_service.description',
      permissions: [] as string[],
      isSystem: true
    },
    {
      name: 'WAREHOUSE_KEEPER',
      nameKey: 'role.warehouse_keeper',
      description: '仓管，管理仓库库存和到货调货',
      descriptionKey: 'role.warehouse_keeper.description',
      permissions: [] as string[],
      isSystem: true
    },
    {
      name: 'ANCHOR',
      nameKey: 'role.anchor',
      description: '主播，管理自己的库存消耗和利润',
      descriptionKey: 'role.anchor.description',
      permissions: [] as string[],
      isSystem: true
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

  // 创建默认管理员用户
  const hashedPassword = await bcrypt.hash('!F#&2g46Vuj', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: hashedPassword  // 重新执行 seed 时会更新密码
    },
    create: {
      username: 'admin',
      email: 'admin@milicard.com',
      passwordHash: hashedPassword,
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
        assignedBy: adminUser.id,
        isActive: true
      }
    })
  }

  console.log('✅ 默认管理员用户创建完成')

  console.log('🎉 数据库种子数据初始化完成！')
  console.log('📋 默认管理员账号：')
  console.log('   用户名：admin')
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
