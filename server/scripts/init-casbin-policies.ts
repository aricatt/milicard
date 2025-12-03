/**
 * 初始化 Casbin 权限策略
 * 将现有角色的权限迁移到 Casbin
 */
import { PrismaClient } from '@prisma/client';
import { casbinService } from '../src/services/casbinService';
import { dataPermissionService } from '../src/services/dataPermissionService';

const prisma = new PrismaClient();

// 预定义的数据权限规则
const dataPermissionRules = [
  // 点位老板：只能看到自己拥有的点位
  {
    roleName: 'POINT_OWNER',
    rules: [
      { resource: 'point', field: 'ownerId', operator: 'eq', valueType: 'currentUser', description: '只能查看自己拥有的点位' },
      { resource: 'pointOrder', field: 'pointId', operator: 'in', valueType: 'currentUserPoints', description: '只能查看自己点位的订单' },
      { resource: 'pointInventory', field: 'pointId', operator: 'in', valueType: 'currentUserPoints', description: '只能查看自己点位的库存' },
    ],
  },
  // 经销商：只能看到自己负责的点位
  {
    roleName: 'DEALER',
    rules: [
      { resource: 'point', field: 'dealerId', operator: 'eq', valueType: 'currentUser', description: '只能查看自己负责的点位' },
      { resource: 'pointOrder', field: 'pointId', operator: 'in', valueType: 'currentUserDealerPoints', description: '只能查看自己负责点位的订单' },
    ],
  },
];

// 预定义的功能权限策略
const functionPolicies = [
  // 超级管理员：所有权限
  { role: 'SUPER_ADMIN', baseId: '*', resource: '*', action: '.*', effect: 'allow' as const },
  
  // 管理员：所有权限
  { role: 'ADMIN', baseId: '*', resource: '*', action: '.*', effect: 'allow' as const },
  
  // 经理：大部分权限
  { role: 'MANAGER', baseId: '*', resource: 'point', action: 'read|create|update', effect: 'allow' as const },
  { role: 'MANAGER', baseId: '*', resource: 'order', action: '.*', effect: 'allow' as const },
  { role: 'MANAGER', baseId: '*', resource: 'inventory', action: 'read|update', effect: 'allow' as const },
  { role: 'MANAGER', baseId: '*', resource: 'report', action: 'read', effect: 'allow' as const },
  
  // 操作员：基本操作权限
  { role: 'OPERATOR', baseId: '*', resource: 'point', action: 'read', effect: 'allow' as const },
  { role: 'OPERATOR', baseId: '*', resource: 'order', action: 'read|create', effect: 'allow' as const },
  { role: 'OPERATOR', baseId: '*', resource: 'inventory', action: 'read', effect: 'allow' as const },
  
  // 查看者：只读权限
  { role: 'VIEWER', baseId: '*', resource: 'point', action: 'read', effect: 'allow' as const },
  { role: 'VIEWER', baseId: '*', resource: 'order', action: 'read', effect: 'allow' as const },
  { role: 'VIEWER', baseId: '*', resource: 'inventory', action: 'read', effect: 'allow' as const },
  { role: 'VIEWER', baseId: '*', resource: 'report', action: 'read', effect: 'allow' as const },
  
  // 点位老板：点位相关权限
  { role: 'POINT_OWNER', baseId: '*', resource: 'point', action: 'read|update', effect: 'allow' as const },
  { role: 'POINT_OWNER', baseId: '*', resource: 'pointOrder', action: 'read|create', effect: 'allow' as const },
  { role: 'POINT_OWNER', baseId: '*', resource: 'pointInventory', action: 'read', effect: 'allow' as const },
  { role: 'POINT_OWNER', baseId: '*', resource: 'pointGoods', action: 'read', effect: 'allow' as const },
];

async function initCasbinPolicies() {
  console.log('开始初始化 Casbin 权限策略...\n');

  try {
    // 1. 初始化功能权限策略
    console.log('1. 初始化功能权限策略...');
    for (const policy of functionPolicies) {
      try {
        const added = await casbinService.addPolicy(
          policy.role,
          policy.baseId,
          policy.resource,
          policy.action,
          policy.effect
        );
        if (added) {
          console.log(`   ✅ ${policy.role}: ${policy.resource}:${policy.action}`);
        } else {
          console.log(`   ⏭️  ${policy.role}: ${policy.resource}:${policy.action} (已存在)`);
        }
      } catch (error) {
        console.error(`   ❌ ${policy.role}: ${policy.resource}:${policy.action}`, error);
      }
    }

    // 2. 初始化数据权限规则
    console.log('\n2. 初始化数据权限规则...');
    for (const roleRules of dataPermissionRules) {
      // 查找角色
      const role = await prisma.role.findUnique({
        where: { name: roleRules.roleName },
      });

      if (!role) {
        console.log(`   ⚠️  角色 ${roleRules.roleName} 不存在，跳过`);
        continue;
      }

      for (const rule of roleRules.rules) {
        try {
          // 检查是否已存在
          const existing = await prisma.dataPermissionRule.findUnique({
            where: {
              roleId_resource_field: {
                roleId: role.id,
                resource: rule.resource,
                field: rule.field,
              },
            },
          });

          if (existing) {
            console.log(`   ⏭️  ${roleRules.roleName}: ${rule.resource}.${rule.field} (已存在)`);
            continue;
          }

          await prisma.dataPermissionRule.create({
            data: {
              roleId: role.id,
              resource: rule.resource,
              field: rule.field,
              operator: rule.operator,
              valueType: rule.valueType,
              description: rule.description,
            },
          });
          console.log(`   ✅ ${roleRules.roleName}: ${rule.resource}.${rule.field}`);
        } catch (error) {
          console.error(`   ❌ ${roleRules.roleName}: ${rule.resource}.${rule.field}`, error);
        }
      }
    }

    // 3. 同步现有角色的 permissions JSON 到 Casbin
    console.log('\n3. 同步现有角色权限到 Casbin...');
    const roles = await prisma.role.findMany();
    
    for (const role of roles) {
      const permissions = role.permissions as string[];
      if (permissions && permissions.length > 0) {
        try {
          await casbinService.syncRolePermissions(role.id, role.name, permissions);
          console.log(`   ✅ ${role.name}: ${permissions.length} 条权限`);
        } catch (error) {
          console.error(`   ❌ ${role.name}`, error);
        }
      }
    }

    console.log('\n✅ Casbin 权限策略初始化完成！');

  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
initCasbinPolicies()
  .catch(console.error);
