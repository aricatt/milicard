/**
 * 同步所有角色的权限到 Casbin
 * 运行方式: npx ts-node scripts/syncRolePermissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { casbinService } from '../src/services/casbinService';

const prisma = new PrismaClient();

async function syncAllRolePermissions() {
  console.log('开始同步角色权限到 Casbin...\n');

  try {
    // 获取所有角色
    const roles = await prisma.role.findMany({
      where: { isSystem: false }, // 只同步非系统角色
      select: { id: true, name: true, permissions: true, level: true },
    });

    console.log(`找到 ${roles.length} 个非系统角色\n`);

    for (const role of roles) {
      const permissions = Array.isArray(role.permissions) 
        ? (role.permissions as string[]).filter(p => typeof p === 'string')
        : [];
      
      if (permissions.length === 0) {
        console.log(`⚠️  角色 ${role.name} (level ${role.level}) 没有配置权限，跳过`);
        continue;
      }

      console.log(`🔄 同步角色: ${role.name} (level ${role.level})`);
      console.log(`   权限数量: ${permissions.length}`);
      console.log(`   权限列表: ${permissions.join(', ')}`);

      await casbinService.syncRolePermissions(role.id, role.name, permissions);
      
      console.log(`✅ 角色 ${role.name} 权限已同步\n`);
    }

    console.log('✅ 所有角色权限同步完成！');
  } catch (error) {
    console.error('❌ 同步失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

syncAllRolePermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
