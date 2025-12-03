/**
 * 同步现有用户角色到 Casbin
 * 将数据库中的 user_roles 关系同步到 casbin_rules 表
 */
import { PrismaClient } from '@prisma/client';
import { casbinService } from '../src/services/casbinService';

const prisma = new PrismaClient();

async function syncUserRolesToCasbin() {
  console.log('开始同步用户角色到 Casbin...\n');

  try {
    // 获取所有活跃的用户角色关系
    const userRoles = await prisma.userRole.findMany({
      where: { isActive: true },
      include: {
        user: {
          include: {
            userBases: {
              where: { isActive: true },
              select: { baseId: true },
            },
          },
        },
        role: true,
      },
    });

    console.log(`找到 ${userRoles.length} 条用户角色关系\n`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const ur of userRoles) {
      const userId = ur.user.id;
      const roleName = ur.role.name;
      const baseIds = ur.user.userBases.map(ub => ub.baseId);

      // 如果用户有关联基地，为每个基地分配角色
      if (baseIds.length > 0) {
        for (const baseId of baseIds) {
          const added = await casbinService.addRoleForUser(userId, roleName, baseId);
          if (added) {
            console.log(`  ✅ ${ur.user.username} -> ${roleName} @ 基地${baseId}`);
            syncedCount++;
          } else {
            skippedCount++;
          }
        }
      } else {
        // 没有基地，分配全局角色
        const added = await casbinService.addRoleForUser(userId, roleName, '*');
        if (added) {
          console.log(`  ✅ ${ur.user.username} -> ${roleName} @ 全局`);
          syncedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`\n同步完成！`);
    console.log(`  - 新增: ${syncedCount} 条`);
    console.log(`  - 跳过（已存在）: ${skippedCount} 条`);

  } catch (error) {
    console.error('同步失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
syncUserRolesToCasbin()
  .catch(console.error);
