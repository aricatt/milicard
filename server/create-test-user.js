const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingUser) {
      console.log('✅ 测试用户 admin 已存在');
      return;
    }

    // 创建密码哈希
    const passwordHash = await bcrypt.hash('ant.design', 12);

    // 确保ADMIN角色存在
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          description: '系统管理员',
          permissions: {
            "system": ["*"],
            "users": ["*"],
            "roles": ["*"]
          },
          isSystem: true
        }
      });
      console.log('✅ 创建ADMIN角色成功');
    }

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: passwordHash,
        name: 'Administrator',
        isActive: true,
        userRoles: {
          create: {
            roleId: adminRole.id,
            assignedBy: 'system'
          }
        }
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('✅ 测试用户创建成功:');
    console.log(`   用户名: ${user.username}`);
    console.log(`   密码`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   角色: ${user.userRoles.map(ur => ur.role.name).join(', ')}`);
    console.log('');
    console.log('🎯 现在可以使用以下账号登录:');
    console.log('   用户名: admin');
    console.log('   密码');

  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
