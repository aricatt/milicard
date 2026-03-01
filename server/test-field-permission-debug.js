const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFieldPermission() {
  try {
    // 测试两个角色的字段权限查询
    const roles = ['YUNYING', 'YUNYINGHEXIN'];
    
    for (const roleName of roles) {
      console.log(`\n========== 测试角色: ${roleName} ==========`);
      
      // 1. 检查角色是否是管理员
      const role = await prisma.role.findUnique({
        where: { name: roleName },
        select: { name: true, level: true, description: true }
      });
      
      console.log(`角色信息:`, role);
      console.log(`是否管理员 (level <= 1):`, role.level <= 1);
      
      // 2. 查询字段权限配置
      const permissions = await prisma.fieldPermission.findMany({
        where: {
          role: { name: roleName },
          resource: 'purchaseOrder',
        },
        include: {
          role: true
        }
      });
      
      console.log(`\n字段权限配置数量:`, permissions.length);
      
      if (permissions.length > 0) {
        console.log(`\n字段权限详情:`);
        permissions.forEach(p => {
          console.log(`  - 字段: ${p.field}, canRead: ${p.canRead}, canWrite: ${p.canWrite}`);
        });
        
        // 3. 模拟 getFieldPermissions 的逻辑
        const readable = permissions.filter((p) => p.canRead).map((p) => p.field);
        const writable = permissions.filter((p) => p.canWrite).map((p) => p.field);
        
        console.log(`\n过滤后的结果:`);
        console.log(`  - readable 字段数量: ${readable.length}`);
        console.log(`  - readable 字段列表:`, readable);
        console.log(`  - writable 字段数量: ${writable.length}`);
        console.log(`  - writable 字段列表:`, writable);
        
        if (readable.length === 0) {
          console.log(`\n⚠️  警告: readable 为空数组，这会导致 filterObject 只保留 alwaysIncludeFields！`);
        }
      } else {
        console.log(`\n⚠️  未找到任何字段权限配置，将返回 ['*']`);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFieldPermission();
