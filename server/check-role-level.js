const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoleLevel() {
  try {
    const roles = await prisma.role.findMany({
      where: {
        name: {
          in: ['YUNYING', 'YUNYINGHEXIN']
        }
      },
      select: {
        name: true,
        level: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('\n角色 Level 检查结果：');
    console.log('==========================================');
    console.log('角色名称\t\tLevel\t描述');
    console.log('------------------------------------------');
    roles.forEach(role => {
      console.log(`${role.name}\t${role.level}\t${role.description}`);
    });
    console.log('==========================================\n');
    
    console.log('⚠️  重要提示：');
    console.log('   - level <= 1 的角色会被视为管理员角色');
    console.log('   - 管理员角色会绕过字段权限配置，返回所有字段');
    console.log('   - 如果 YUNYING 的 level <= 1，字段权限配置将不生效\n');

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoleLevel();
