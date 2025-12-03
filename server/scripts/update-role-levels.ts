/**
 * 更新角色层级
 * 层级越小权限越高
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLE_LEVELS: Record<string, number> = {
  'SUPER_ADMIN': 0,      // 超级管理员 - 最高权限，可访问所有基地
  'ADMIN': 1,            // 系统管理员 - 可访问所有基地
  'BASE_MANAGER': 2,     // 基地管理员
  'MANAGER': 2,          // 经理
  'CUSTOMER_SERVICE': 3, // 客服
  'WAREHOUSE_KEEPER': 3, // 仓管
  'OPERATOR': 3,         // 操作员
  'ANCHOR': 4,           // 主播
  'VIEWER': 4,           // 查看者
  'POINT_OWNER': 5,      // 点位老板
  'DEALER': 5,           // 经销商
};

async function updateRoleLevels() {
  console.log('开始更新角色层级...\n');

  for (const [name, level] of Object.entries(ROLE_LEVELS)) {
    const result = await prisma.role.updateMany({
      where: { name },
      data: { level }
    });
    
    if (result.count > 0) {
      console.log(`✅ ${name} -> level ${level}`);
    }
  }

  // 显示所有角色的当前层级
  console.log('\n当前角色层级：');
  const roles = await prisma.role.findMany({
    orderBy: { level: 'asc' }
  });
  
  for (const role of roles) {
    console.log(`  Level ${role.level}: ${role.name} (${role.description || '-'})`);
  }

  await prisma.$disconnect();
  console.log('\n✅ 角色层级更新完成！');
}

updateRoleLevels().catch(console.error);
