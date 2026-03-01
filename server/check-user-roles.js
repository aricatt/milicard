const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserRoles() {
  try {
    // 查找 AZHUANG 用户
    const user = await prisma.user.findFirst({
      where: {
        username: 'AZHUANG'
      },
      select: {
        id: true,
        username: true,
        name: true
      }
    });

    if (!user) {
      console.log('❌ 未找到用户 AZHUANG');
      return;
    }

    console.log('\n用户信息:');
    console.log('==========================================');
    console.log(`用户名: ${user.username}`);
    console.log(`姓名: ${user.name}`);
    console.log(`ID: ${user.id}`);

    // 查询用户的所有角色（通过 user_roles 关联表）
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: user.id
      },
      include: {
        role: {
          select: {
            name: true,
            level: true,
            description: true
          }
        }
      }
    });

    console.log('\n用户角色列表:');
    console.log('==========================================');
    if (userRoles.length === 0) {
      console.log('⚠️  该用户没有分配任何角色');
    } else {
      console.log('角色名称\t\tLevel\t描述');
      console.log('------------------------------------------');
      userRoles.forEach(ur => {
        const role = ur.role;
        console.log(`${role.name}\t${role.level}\t${role.description}`);
        if (role.level <= 1) {
          console.log(`  ⚠️  这是管理员角色！会绕过字段权限配置`);
        }
      });
    }
    console.log('==========================================\n');

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRoles();
