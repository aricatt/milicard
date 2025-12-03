import { dataPermissionService } from '../dataPermissionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('DataPermissionService', () => {
  let testRoleId: string;
  let testUserId: string;
  const testBaseId = 1;

  beforeAll(async () => {
    // 创建测试角色
    const role = await prisma.role.create({
      data: {
        name: 'TEST_DATA_PERM_ROLE_' + Date.now(),
        description: '数据权限测试角色',
        permissions: [],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'data_perm_test_user_' + Date.now(),
        passwordHash: 'hashed_password',
        name: '数据权限测试用户',
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.dataPermissionRule.deleteMany({
      where: { roleId: testRoleId },
    });
    await prisma.fieldPermission.deleteMany({
      where: { roleId: testRoleId },
    });
    
    if (testRoleId) {
      await prisma.role.delete({ where: { id: testRoleId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  describe('createRule', () => {
    it('应该成功创建数据权限规则', async () => {
      const rule = await dataPermissionService.createRule({
        roleId: testRoleId,
        resource: 'point',
        field: 'ownerId',
        operator: 'eq',
        valueType: 'currentUser',
        description: '只能查看自己拥有的点位',
      });

      expect(rule).toBeDefined();
      expect(rule.roleId).toBe(testRoleId);
      expect(rule.resource).toBe('point');
      expect(rule.field).toBe('ownerId');
      expect(rule.operator).toBe('eq');
      expect(rule.valueType).toBe('currentUser');
    });

    it('重复创建相同规则应抛出错误', async () => {
      await expect(
        dataPermissionService.createRule({
          roleId: testRoleId,
          resource: 'point',
          field: 'ownerId',
          operator: 'eq',
          valueType: 'currentUser',
        })
      ).rejects.toThrow();
    });
  });

  describe('getDataFilter', () => {
    it('管理员角色应返回空过滤条件', async () => {
      const filter = await dataPermissionService.getDataFilter(
        { userId: testUserId, baseId: testBaseId, roles: ['ADMIN'] },
        'point'
      );

      expect(filter).toEqual({});
    });

    it('超级管理员角色应返回空过滤条件', async () => {
      const filter = await dataPermissionService.getDataFilter(
        { userId: testUserId, baseId: testBaseId, roles: ['SUPER_ADMIN'] },
        'point'
      );

      expect(filter).toEqual({});
    });

    it('应根据规则生成正确的过滤条件', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      const filter = await dataPermissionService.getDataFilter(
        { userId: testUserId, baseId: testBaseId, roles: [role!.name] },
        'point'
      );

      // 应该包含 ownerId 过滤
      expect(filter).toHaveProperty('ownerId');
      expect(filter.ownerId).toBe(testUserId);
    });
  });

  describe('getFieldPermissions', () => {
    it('管理员角色应返回所有字段权限', async () => {
      const perms = await dataPermissionService.getFieldPermissions(
        { userId: testUserId, baseId: testBaseId, roles: ['ADMIN'] },
        'point'
      );

      expect(perms.readable).toContain('*');
      expect(perms.writable).toContain('*');
    });

    it('没有配置时应返回默认允许所有', async () => {
      const role = await prisma.role.findUnique({ where: { id: testRoleId } });
      
      const perms = await dataPermissionService.getFieldPermissions(
        { userId: testUserId, baseId: testBaseId, roles: [role!.name] },
        'point'
      );

      expect(perms.readable).toContain('*');
      expect(perms.writable).toContain('*');
    });
  });

  describe('updateFieldPermission', () => {
    it('应该成功创建/更新字段权限', async () => {
      const result = await dataPermissionService.updateFieldPermission({
        roleId: testRoleId,
        resource: 'point',
        field: 'ownerId',
        canRead: true,
        canWrite: false,
      });

      expect(result).toBeDefined();
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false);
    });

    it('应该正确更新已存在的字段权限', async () => {
      const result = await dataPermissionService.updateFieldPermission({
        roleId: testRoleId,
        resource: 'point',
        field: 'ownerId',
        canRead: false,
        canWrite: false,
      });

      expect(result.canRead).toBe(false);
      expect(result.canWrite).toBe(false);
    });
  });

  describe('getRoleDataRules', () => {
    it('应该返回角色的所有数据权限规则', async () => {
      const rules = await dataPermissionService.getRoleDataRules(testRoleId);

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].roleId).toBe(testRoleId);
    });
  });

  describe('getRoleFieldPermissions', () => {
    it('应该返回角色的所有字段权限', async () => {
      const perms = await dataPermissionService.getRoleFieldPermissions(testRoleId);

      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
      expect(perms[0].roleId).toBe(testRoleId);
    });
  });

  describe('deleteRule', () => {
    it('应该成功删除数据权限规则', async () => {
      // 先创建一条规则
      const rule = await dataPermissionService.createRule({
        roleId: testRoleId,
        resource: 'order',
        field: 'createdBy',
        operator: 'eq',
        valueType: 'currentUser',
      });

      // 删除规则
      await dataPermissionService.deleteRule(rule.id);

      // 验证已删除
      const rules = await dataPermissionService.getRoleDataRules(testRoleId);
      expect(rules.find(r => r.id === rule.id)).toBeUndefined();
    });
  });
});
