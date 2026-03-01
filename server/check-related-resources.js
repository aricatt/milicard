const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRelatedResources() {
  try {
    const roles = ['YUNYING', 'YUNYINGHEXIN'];
    const resources = ['purchaseOrder', 'goods', 'category', 'supplier'];
    
    for (const roleName of roles) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`角色: ${roleName}`);
      console.log('='.repeat(60));
      
      for (const resource of resources) {
        const permissions = await prisma.fieldPermission.findMany({
          where: {
            role: { name: roleName },
            resource: resource,
          },
          select: {
            field: true,
            canRead: true,
            canWrite: true
          }
        });
        
        console.log(`\n资源: ${resource}`);
        console.log('-'.repeat(40));
        
        if (permissions.length === 0) {
          console.log(`  ⚠️  未配置字段权限 → 返回 ['*']`);
        } else {
          const readable = permissions.filter(p => p.canRead).map(p => p.field);
          const forbidden = permissions.filter(p => !p.canRead).map(p => p.field);
          
          console.log(`  配置字段数: ${permissions.length}`);
          console.log(`  可读字段数: ${readable.length}`);
          console.log(`  禁止字段数: ${forbidden.length}`);
          
          if (forbidden.length > 0) {
            console.log(`  禁止字段: ${forbidden.slice(0, 5).join(', ')}${forbidden.length > 5 ? '...' : ''}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('分析结论:');
    console.log('='.repeat(60));
    console.log('如果相关资源（goods/category/supplier）未配置字段权限，');
    console.log('getFieldPermissions 会返回 ["*"]，');
    console.log('然后在合并时，"*" 会被添加到 allReadableFields 中，');
    console.log('导致最终的 fieldPermissions.readable 包含 "*"，');
    console.log('从而绕过主资源（purchaseOrder）的字段权限配置！\n');

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRelatedResources();
