/**
 * 权限系统集成测试
 * 测试 Casbin + 数据权限的完整流程
 */
import { casbinService } from '../casbinService';
import { dataPermissionService } from '../dataPermissionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('权限系统集成测试', () => {
  let testBaseId: number;
  let adminUserId: string;
  let pointOwnerUserId: string;
  let adminRoleId: string;
  let pointOwnerRoleId: string;
  let testPointId: string;

  beforeAll(async () => {
    // 创建测试基地
    const base = await prisma.base.create({
      data: {
        code: 'TEST_PERM_BASE_' + Date.now(),
        name: '权限测试基地',
        type: 'OFFLINE_REGION',
        createdBy: 'system',
        updatedBy: 'system',
      },
    });
    testBaseId = base.id;

    // 创建管理员用户
    const adminUser = await prisma.user.create({
      data: {
        username: 'perm_test_admin_' + Date.now(),
        passwordHash: 'hashed_password',
        name: '权限测试管理员',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    // 创建点位老板用户
    const pointOwnerUser = await prisma.user.create({
      data: {
        username: 'perm_test_owner_' + Date.now(),
        passwordHash: 'hashed_password',
        name: '权限测试点位老板',
        isActive: true,
      },
    });
    pointOwnerUserId = pointOwnerUser.id;

    // 获取或创建角色
    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          description: '管理员',
          permissions: ['*'],
          isSystem: true,
        },
      });
    }
    adminRoleId = adminRole.id;

    let pointOwnerRole = await prisma.role.findUnique({ where: { name: 'POINT_OWNER' } });
    if (!pointOwnerRole) {
      pointOwnerRole = await prisma.role.create({
        data: {
          name: 'POINT_OWNER',
          description: '点位老板',
          permissions: ['point:read', 'point:update'],
          isSystem: false,
        },
      });
    }
    pointOwnerRoleId = pointOwnerRole.id;

    // 创建测试点位
    const point = await prisma.point.create({
      data: {
        code: 'TEST_PERM_POINT_' + Date.now(),
        name: '权限测试点位',
        baseId: testBaseId,
        ownerId: pointOwnerUserId,
        isActive: true,
      },
    });
    testPointId = point.id;

    // 重新加载 Casbin 策略
    await casbinService.reloadPolicy();

    // 为用户分配角色（Casbin）- 使用全局域
    await casbinService.addRoleForUser(adminUserId, 'ADMIN', '*');
    await casbinService.addRoleForUser(pointOwnerUserId, 'POINT_OWNER', '*');

    // 确保数据权限规则存在
    const existingRule = await prisma.dataPermissionRule.findUnique({
      where: {
        roleId_resource_field: {
          roleId: pointOwnerRoleId,
          resource: 'point',
          field: 'ownerId',
        },
      },
    });

    if (!existingRule) {
      await dataPermissionService.createRule({
        roleId: pointOwnerRoleId,
        resource: 'point',
        field: 'ownerId',
        operator: 'eq',
        valueType: 'currentUser',
        description: '只能查看自己拥有的点位',
      });
    }
  });

  afterAll(async () => {
    // 清理 Casbin 策略
    await casbinService.removeRoleForUser(adminUserId, 'ADMIN', '*');
    await casbinService.removeRoleForUser(pointOwnerUserId, 'POINT_OWNER', String(testBaseId));

    // 清理测试数据
    if (testPointId) {
      await prisma.point.delete({ where: { id: testPointId } }).catch(() => {});
    }
    if (adminUserId) {
      await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    }
    if (pointOwnerUserId) {
      await prisma.user.delete({ where: { id: pointOwnerUserId } }).catch(() => {});
    }
    if (testBaseId) {
      await prisma.base.delete({ where: { id: testBaseId } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe('功能权限检查', () => {
    it('管理员角色应该有权限策略', async () => {
      // 检查 ADMIN 角色的策略是否存在
      const policies = await casbinService.getRolePolicies('ADMIN');
      expect(policies.length).toBeGreaterThan(0);
    });

    it('点位老板角色应该有权限策略', async () => {
      const policies = await casbinService.getRolePolicies('POINT_OWNER');
      expect(policies.length).toBeGreaterThan(0);
    });
  });

  describe('数据权限过滤', () => {
    it('管理员应该没有数据过滤条件', async () => {
      const filter = await dataPermissionService.getDataFilter(
        { userId: adminUserId, baseId: testBaseId, roles: ['ADMIN'] },
        'point'
      );

      expect(filter).toEqual({});
    });

    it('点位老板应该只能看到自己的点位', async () => {
      const filter = await dataPermissionService.getDataFilter(
        { userId: pointOwnerUserId, baseId: testBaseId, roles: ['POINT_OWNER'] },
        'point'
      );

      expect(filter).toHaveProperty('ownerId');
      expect(filter.ownerId).toBe(pointOwnerUserId);
    });
  });

  describe('字段权限', () => {
    it('管理员应该有所有字段权限', async () => {
      const perms = await dataPermissionService.getFieldPermissions(
        { userId: adminUserId, baseId: testBaseId, roles: ['ADMIN'] },
        'point'
      );

      expect(perms.readable).toContain('*');
      expect(perms.writable).toContain('*');
    });
  });

  describe('角色分配', () => {
    it('应该能够添加和获取用户角色', async () => {
      // 添加角色
      await casbinService.addRoleForUser(adminUserId, 'ADMIN', '*');
      
      // 获取角色
      const adminRoles = await casbinService.getUserRoles(adminUserId, '*');
      expect(adminRoles).toContain('ADMIN');
    });
  });
});
