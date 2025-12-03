import { casbinService } from '../casbinService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CasbinService', () => {
  let testUserId: string;
  let testRoleId: string;
  const testBaseId = '999';

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'casbin_test_user_' + Date.now(),
        passwordHash: 'hashed_password',
        name: 'Casbin测试用户',
        isActive: true,
      },
    });
    testUserId = user.id;

    // 创建测试角色
    const role = await prisma.role.create({
      data: {
        name: 'TEST_CASBIN_ROLE_' + Date.now(),
        description: 'Casbin测试角色',
        permissions: ['point:read', 'point:create'],
        isSystem: false,
      },
    });
    testRoleId = role.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.casbinRule.deleteMany({
      where: {
        OR: [
          { v0: testUserId },
          { v0: { startsWith: 'TEST_CASBIN_ROLE_' } },
        ],
      },
    });

    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testRoleId) {
      await prisma.role.delete({ where: { id: testRoleId } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe('addPolicy', () => {
    it('应该成功添加权限策略', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      const added = await casbinService.addPolicy(
        role!.name,
        testBaseId,
        'testResource',
        'read',
        'allow'
      );

      expect(added).toBe(true);

      // 验证策略已添加
      const policies = await casbinService.getRolePolicies(role!.name);
      expect(policies.some(p => 
        p[1] === testBaseId && 
        p[2] === 'testResource' && 
        p[3] === 'read'
      )).toBe(true);
    });

    it('重复添加相同策略应返回 false', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      // 第一次添加
      await casbinService.addPolicy(role!.name, testBaseId, 'duplicateTest', 'read', 'allow');
      
      // 第二次添加相同策略
      const added = await casbinService.addPolicy(role!.name, testBaseId, 'duplicateTest', 'read', 'allow');
      expect(added).toBe(false);
    });
  });

  describe('addRoleForUser', () => {
    it('应该成功为用户分配角色', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      const added = await casbinService.addRoleForUser(testUserId, role!.name, testBaseId);

      expect(added).toBe(true);

      // 验证角色已分配
      const roles = await casbinService.getUserRoles(testUserId, testBaseId);
      expect(roles).toContain(role!.name);
    });
  });

  describe('checkPermission', () => {
    it('应该正确检查用户权限', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      // 确保用户有角色
      await casbinService.addRoleForUser(testUserId, role!.name, testBaseId);
      
      // 确保角色有权限
      await casbinService.addPolicy(role!.name, testBaseId, 'checkTest', 'read', 'allow');

      // 检查权限
      const hasPermission = await casbinService.checkPermission(
        testUserId,
        testBaseId,
        'checkTest',
        'read'
      );

      expect(hasPermission).toBe(true);
    });

    it('没有权限时应返回 false', async () => {
      const hasPermission = await casbinService.checkPermission(
        testUserId,
        testBaseId,
        'nonExistentResource',
        'delete'
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('removeRoleForUser', () => {
    it('应该成功移除用户角色', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      // 先分配角色
      await casbinService.addRoleForUser(testUserId, role!.name, testBaseId);
      
      // 移除角色
      const removed = await casbinService.removeRoleForUser(testUserId, role!.name, testBaseId);
      expect(removed).toBe(true);

      // 验证角色已移除
      const roles = await casbinService.getUserRoles(testUserId, testBaseId);
      expect(roles).not.toContain(role!.name);
    });
  });

  describe('全局权限 (*)', () => {
    it('全局角色应该在所有基地生效', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      // 分配全局角色
      await casbinService.addRoleForUser(testUserId, role!.name, '*');
      
      // 添加全局权限
      await casbinService.addPolicy(role!.name, '*', 'globalResource', 'read', 'allow');

      // 在任意基地检查权限
      const hasPermission = await casbinService.checkPermission(
        testUserId,
        '12345',
        'globalResource',
        'read'
      );

      expect(hasPermission).toBe(true);

      // 清理
      await casbinService.removeRoleForUser(testUserId, role!.name, '*');
    });
  });
});
