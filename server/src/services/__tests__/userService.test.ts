import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserService } from '../userService';

const prisma = new PrismaClient();

describe('UserService', () => {
  let testRoleId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 创建测试角色
    const role = await prisma.role.create({
      data: {
        name: 'TEST_ROLE',
        description: '测试角色',
        permissions: ['test:*'],
        isSystem: false,
      },
    });
    testRoleId = role.id;
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } });
      await prisma.userBase.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.role.delete({ where: { id: testRoleId } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const userData = {
        username: 'test_user_' + Date.now(),
        password: 'password123',
        name: '测试用户',
        email: `test_${Date.now()}@example.com`,
        phone: '13800138000',
        roleIds: [testRoleId],
      };

      const user = await UserService.createUser(userData);
      testUserId = user!.id;

      expect(user).toBeDefined();
      expect(user!.username).toBe(userData.username);
      expect(user!.name).toBe(userData.name);
      expect(user!.email).toBe(userData.email);
      expect(user!.phone).toBe(userData.phone);
      expect(user!.isActive).toBe(true);
      expect(user!.roles).toHaveLength(1);
      expect(user!.roles[0].id).toBe(testRoleId);
    });

    it('应该拒绝重复的用户名', async () => {
      const userData = {
        username: 'admin', // 已存在的用户名
        password: 'password123',
        name: '测试用户',
      };

      await expect(UserService.createUser(userData)).rejects.toThrow('用户名已存在');
    });

    it('应该正确加密密码', async () => {
      const userData = {
        username: 'test_password_' + Date.now(),
        password: 'mypassword123',
        name: '密码测试用户',
      };

      const user = await UserService.createUser(userData);
      
      // 验证密码已加密
      const dbUser = await prisma.user.findUnique({
        where: { id: user!.id },
      });
      
      expect(dbUser!.passwordHash).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, dbUser!.passwordHash)).toBe(true);

      // 清理
      await prisma.user.delete({ where: { id: user!.id } });
    });
  });

  describe('getUserList', () => {
    it('应该返回用户列表', async () => {
      const result = await UserService.getUserList({
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('应该支持关键词搜索', async () => {
      const result = await UserService.getUserList({
        keyword: 'admin',
      });

      expect(result.data.some((u) => u.username.includes('admin'))).toBe(true);
    });

    it('应该支持状态筛选', async () => {
      const result = await UserService.getUserList({
        isActive: true,
      });

      expect(result.data.every((u) => u.isActive === true)).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('应该返回用户详情', async () => {
      if (!testUserId) return;

      const user = await UserService.getUserById(testUserId);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUserId);
      expect(user!.roles).toBeDefined();
      expect(user!.bases).toBeDefined();
    });

    it('应该返回 null 对于不存在的用户', async () => {
      const user = await UserService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('应该成功更新用户信息', async () => {
      if (!testUserId) return;

      const updateData = {
        name: '更新后的名字',
        phone: '13900139000',
      };

      const user = await UserService.updateUser(testUserId, updateData);

      expect(user!.name).toBe(updateData.name);
      expect(user!.phone).toBe(updateData.phone);
    });

    it('应该支持更新角色', async () => {
      if (!testUserId) return;

      // 先移除角色
      await UserService.updateUser(testUserId, { roleIds: [] });
      let user = await UserService.getUserById(testUserId);
      expect(user!.roles).toHaveLength(0);

      // 再添加角色
      await UserService.updateUser(testUserId, { roleIds: [testRoleId] });
      user = await UserService.getUserById(testUserId);
      expect(user!.roles).toHaveLength(1);
    });

    it('应该拒绝更新不存在的用户', async () => {
      await expect(
        UserService.updateUser('non-existent-id', { name: 'test' })
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('deleteUser', () => {
    it('应该成功删除用户（软删除）', async () => {
      // 创建一个临时用户用于删除测试
      const tempUser = await UserService.createUser({
        username: 'temp_delete_' + Date.now(),
        password: 'password123',
        name: '临时删除用户',
      });

      await UserService.deleteUser(tempUser!.id);

      const deletedUser = await UserService.getUserById(tempUser!.id);
      expect(deletedUser!.isActive).toBe(false);

      // 清理
      await prisma.user.delete({ where: { id: tempUser!.id } });
    });

    it('应该拒绝删除 admin 用户', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { username: 'admin' },
      });

      if (adminUser) {
        await expect(UserService.deleteUser(adminUser.id)).rejects.toThrow(
          '不能删除管理员账号'
        );
      }
    });
  });

  describe('resetPassword', () => {
    it('应该成功重置密码', async () => {
      if (!testUserId) return;

      const newPassword = 'newpassword456';
      await UserService.resetPassword(testUserId, newPassword);

      const dbUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(await bcrypt.compare(newPassword, dbUser!.passwordHash)).toBe(true);
    });
  });

  describe('getRoleList', () => {
    it('应该返回角色列表', async () => {
      const roles = await UserService.getRoleList();

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  describe('getUserStats', () => {
    it('应该返回用户统计信息', async () => {
      const stats = await UserService.getUserStats();

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.inactive).toBeGreaterThanOrEqual(0);
      expect(stats.total).toBe(stats.active + stats.inactive);
    });
  });
});
