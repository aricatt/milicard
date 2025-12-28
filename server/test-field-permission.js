/**
 * 字段权限测试脚本
 * 用于检查字段权限配置和过滤是否正常工作
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFieldPermission() {
  try {
    console.log('=== 字段权限测试 ===\n');

    // 1. 查询所有角色
    const roles = await prisma.role.findMany({
      select: { id: true, name: true }
    });
    console.log('1. 系统角色列表：');
    roles.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
    });

    // 2. 查询 goods 资源的字段权限配置
    console.log('\n2. goods 资源的字段权限配置：');
    const goodsPermissions = await prisma.fieldPermission.findMany({
      where: { resource: 'goods' },
      include: { role: true },
      orderBy: [{ roleId: 'asc' }, { field: 'asc' }]
    });

    if (goodsPermissions.length === 0) {
      console.log('   ⚠️  没有找到 goods 资源的字段权限配置');
    } else {
      const groupedByRole = {};
      goodsPermissions.forEach(p => {
        if (!groupedByRole[p.role.name]) {
          groupedByRole[p.role.name] = [];
        }
        groupedByRole[p.role.name].push({
          field: p.field,
          canRead: p.canRead,
          canWrite: p.canWrite
        });
      });

      Object.keys(groupedByRole).forEach(roleName => {
        console.log(`\n   角色: ${roleName}`);
        const perms = groupedByRole[roleName];
        console.log(`   总字段数: ${perms.length}`);
        
        const cannotRead = perms.filter(p => !p.canRead);
        if (cannotRead.length > 0) {
          console.log(`   ❌ 不可读字段 (${cannotRead.length}):`, cannotRead.map(p => p.field).join(', '));
        }
        
        const cannotWrite = perms.filter(p => !p.canWrite);
        if (cannotWrite.length > 0) {
          console.log(`   🔒 不可写字段 (${cannotWrite.length}):`, cannotWrite.map(p => p.field).join(', '));
        }

        const canRead = perms.filter(p => p.canRead);
        console.log(`   ✅ 可读字段 (${canRead.length}):`, canRead.map(p => p.field).join(', '));
      });
    }

    // 3. 检查 packPerBox 字段的权限配置
    console.log('\n3. packPerBox 字段的权限配置：');
    const packPerBoxPerms = await prisma.fieldPermission.findMany({
      where: { 
        resource: 'goods',
        field: 'packPerBox'
      },
      include: { role: true }
    });

    if (packPerBoxPerms.length === 0) {
      console.log('   ⚠️  没有找到 packPerBox 字段的权限配置');
    } else {
      packPerBoxPerms.forEach(p => {
        console.log(`   角色: ${p.role.name}`);
        console.log(`   - canRead: ${p.canRead}`);
        console.log(`   - canWrite: ${p.canWrite}`);
      });
    }

    // 4. 检查所有资源的字段权限统计
    console.log('\n4. 所有资源的字段权限统计：');
    const allPermissions = await prisma.fieldPermission.groupBy({
      by: ['resource'],
      _count: { id: true }
    });

    allPermissions.forEach(p => {
      console.log(`   - ${p.resource}: ${p._count.id} 条配置`);
    });

    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFieldPermission();
