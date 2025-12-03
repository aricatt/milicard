import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 预定义的角色
const defaultRoles = [
  {
    name: 'SUPER_ADMIN',
    description: '超级管理员 - 拥有所有权限',
    permissions: ['*'],
    isSystem: true,
  },
  {
    name: 'ADMIN',
    description: '管理员 - 拥有大部分管理权限',
    permissions: [
      'system:*',
      'user:*',
      'role:*',
      'inventory:*',
      'order:*',
      'report:*',
    ],
    isSystem: true,
  },
  {
    name: 'MANAGER',
    description: '经理 - 拥有业务管理权限',
    permissions: [
      'inventory:view',
      'inventory:edit',
      'order:*',
      'report:view',
    ],
    isSystem: false,
  },
  {
    name: 'OPERATOR',
    description: '操作员 - 拥有基本操作权限',
    permissions: [
      'inventory:view',
      'order:view',
      'order:create',
    ],
    isSystem: false,
  },
  {
    name: 'VIEWER',
    description: '查看者 - 只有查看权限',
    permissions: [
      'inventory:view',
      'order:view',
      'report:view',
    ],
    isSystem: false,
  },
];

async function initRoles() {
  console.log('开始初始化角色...\n');

  for (const roleData of defaultRoles) {
    try {
      const existing = await prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (existing) {
        console.log(`⏭️  角色 ${roleData.name} 已存在，跳过`);
        continue;
      }

      const role = await prisma.role.create({
        data: roleData,
      });

      console.log(`✅ 创建角色: ${role.name} - ${role.description}`);
    } catch (error) {
      console.error(`❌ 创建角色 ${roleData.name} 失败:`, error);
    }
  }

  console.log('\n角色初始化完成！');
}

initRoles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
