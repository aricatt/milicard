import { PrismaClient, BaseType } from '@prisma/client';
import { PointService } from '../pointService';

const prisma = new PrismaClient();

describe('PointService', () => {
  let testBaseId: number;
  let testUserId: string;
  let testPointId: string;
  let testUser2Id: string; // 用于老板/经销商测试

  beforeAll(async () => {
    // 创建测试用户（用于基地创建者）
    const user = await prisma.user.create({
      data: {
        username: 'test_point_user_' + Date.now(),
        passwordHash: 'hashed_password',
        name: '点位测试用户',
        isActive: true,
      },
    });
    testUserId = user.id;

    // 创建第二个测试用户（用于老板/经销商测试）
    const user2 = await prisma.user.create({
      data: {
        username: 'test_point_owner_' + Date.now(),
        passwordHash: 'hashed_password',
        name: '点位老板测试用户',
        isActive: true,
      },
    });
    testUser2Id = user2.id;

    // 创建测试基地
    const base = await prisma.base.create({
      data: {
        code: 'TEST_BASE_POINT_' + Date.now(),
        name: '点位测试基地',
        type: BaseType.OFFLINE_REGION,
        isActive: true,
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });
    testBaseId = base.id;
  });

  afterAll(async () => {
    // 清理测试数据（按依赖顺序删除）
    if (testPointId) {
      await prisma.pointInventory.deleteMany({ where: { pointId: testPointId } });
      await prisma.pointOrderItem.deleteMany({ 
        where: { pointOrder: { pointId: testPointId } } 
      });
      await prisma.pointOrder.deleteMany({ where: { pointId: testPointId } });
      await prisma.pointGoods.deleteMany({ where: { pointId: testPointId } });
      await prisma.point.delete({ where: { id: testPointId } }).catch(() => {});
    }
    
    // 清理其他测试点位
    await prisma.point.deleteMany({ where: { baseId: testBaseId } });
    
    if (testUser2Id) {
      await prisma.user.delete({ where: { id: testUser2Id } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testBaseId) {
      await prisma.base.delete({ where: { id: testBaseId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('generateCode', () => {
    it('应该生成正确格式的点位编号 (POINT-XXXXXXXXXXX)', async () => {
      const code = await PointService.generateCode();
      
      expect(code).toMatch(/^POINT-[A-Z0-9]{11}$/);
    });

    it('应该生成唯一的编号', async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const code = await PointService.generateCode();
        codes.add(code);
      }
      
      // 100个编号应该都是唯一的
      expect(codes.size).toBe(100);
    });
  });

  describe('create', () => {
    it('应该成功创建点位', async () => {
      const pointData = {
        name: '测试店铺',
        address: '测试地址123号',
        contactPerson: '张三',
        contactPhone: '13800138000',
        baseId: testBaseId,
        notes: '测试备注',
      };

      const point = await PointService.create(pointData);
      testPointId = point.id;

      expect(point).toBeDefined();
      expect(point.id).toBeDefined();
      expect(point.code).toMatch(/^POINT-[A-Z0-9]{11}$/);
      expect(point.name).toBe(pointData.name);
      expect(point.address).toBe(pointData.address);
      expect(point.contactPerson).toBe(pointData.contactPerson);
      expect(point.contactPhone).toBe(pointData.contactPhone);
      expect(point.notes).toBe(pointData.notes);
      expect(point.isActive).toBe(true);
    });

    it('应该支持指定老板和经销商', async () => {
      // 创建临时用户用于此测试
      const tempUser = await prisma.user.create({
        data: {
          username: 'temp_owner_' + Date.now(),
          passwordHash: 'hashed_password',
          name: '临时老板',
          isActive: true,
        },
      });
      
      const pointData = {
        name: '带老板的店铺',
        baseId: testBaseId,
        ownerId: tempUser.id,
        dealerId: tempUser.id,
      };

      const point = await PointService.create(pointData);

      expect(point.ownerId).toBe(tempUser.id);
      expect(point.dealerId).toBe(tempUser.id);
      expect(point.owner).toBeDefined();
      expect(point.dealer).toBeDefined();

      // 清理
      await prisma.point.delete({ where: { id: point.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it('应该拒绝重复的编号', async () => {
      const existingPoint = await prisma.point.findFirst({
        where: { baseId: testBaseId },
      });

      if (existingPoint) {
        await expect(
          PointService.create({
            code: existingPoint.code,
            name: '重复编号店铺',
            baseId: testBaseId,
          })
        ).rejects.toThrow('点位编号已存在');
      }
    });

    it('应该拒绝不存在的基地', async () => {
      await expect(
        PointService.create({
          name: '测试店铺',
          baseId: 999999,
        })
      ).rejects.toThrow('所属大区不存在');
    });

    it('应该拒绝不存在的老板用户', async () => {
      await expect(
        PointService.create({
          name: '测试店铺',
          baseId: testBaseId,
          ownerId: 'non-existent-user-id',
        })
      ).rejects.toThrow('指定的老板用户不存在');
    });

    it('应该拒绝不存在的经销商用户', async () => {
      await expect(
        PointService.create({
          name: '测试店铺',
          baseId: testBaseId,
          dealerId: 'non-existent-user-id',
        })
      ).rejects.toThrow('指定的经销商用户不存在');
    });
  });

  describe('getById', () => {
    it('应该返回点位详情', async () => {
      const point = await PointService.getById(testPointId);

      expect(point).toBeDefined();
      expect(point.id).toBe(testPointId);
      expect(point.name).toBe('测试店铺');
      expect(point.base).toBeDefined();
      expect(point._count).toBeDefined();
    });

    it('应该拒绝不存在的点位', async () => {
      await expect(
        PointService.getById('non-existent-point-id')
      ).rejects.toThrow('点位不存在');
    });
  });

  describe('getList', () => {
    it('应该返回点位列表', async () => {
      const result = await PointService.getList({
        baseId: testBaseId,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('应该支持关键词搜索', async () => {
      const result = await PointService.getList({
        baseId: testBaseId,
        keyword: '测试店铺',
      });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.some(p => p.name.includes('测试'))).toBe(true);
    });

    it('应该支持状态筛选', async () => {
      const result = await PointService.getList({
        baseId: testBaseId,
        isActive: true,
      });

      expect(result.data.every(p => p.isActive === true)).toBe(true);
    });

    it('应该返回空列表当基地没有点位', async () => {
      // 创建一个没有点位的基地
      const emptyBase = await prisma.base.create({
        data: {
          code: 'EMPTY_BASE_' + Date.now(),
          name: '空基地',
          type: BaseType.OFFLINE_REGION,
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const result = await PointService.getList({
        baseId: emptyBase.id,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);

      // 清理
      await prisma.base.delete({ where: { id: emptyBase.id } });
    });
  });

  describe('update', () => {
    it('应该成功更新点位', async () => {
      const updateData = {
        name: '更新后的店铺名',
        address: '新地址456号',
        contactPerson: '李四',
        contactPhone: '13900139000',
        notes: '更新后的备注',
      };

      const point = await PointService.update(testPointId, updateData);

      expect(point.name).toBe(updateData.name);
      expect(point.address).toBe(updateData.address);
      expect(point.contactPerson).toBe(updateData.contactPerson);
      expect(point.contactPhone).toBe(updateData.contactPhone);
      expect(point.notes).toBe(updateData.notes);
    });

    it('应该支持更新老板和经销商', async () => {
      // 创建临时用户用于此测试
      const tempUser = await prisma.user.create({
        data: {
          username: 'temp_update_owner_' + Date.now(),
          passwordHash: 'hashed_password',
          name: '临时更新老板',
          isActive: true,
        },
      });

      const point = await PointService.update(testPointId, {
        ownerId: tempUser.id,
        dealerId: tempUser.id,
      });

      expect(point.ownerId).toBe(tempUser.id);
      expect(point.dealerId).toBe(tempUser.id);

      // 清理：移除老板/经销商关联
      await PointService.update(testPointId, {
        ownerId: null,
        dealerId: null,
      });
      await prisma.user.delete({ where: { id: tempUser.id } });
    });

    it('应该支持停用点位', async () => {
      const point = await PointService.update(testPointId, {
        isActive: false,
      });

      expect(point.isActive).toBe(false);

      // 恢复启用状态
      await PointService.update(testPointId, { isActive: true });
    });

    it('应该拒绝不存在的点位', async () => {
      await expect(
        PointService.update('non-existent-point-id', { name: '新名称' })
      ).rejects.toThrow('点位不存在');
    });

    it('应该拒绝不存在的老板用户', async () => {
      await expect(
        PointService.update(testPointId, { ownerId: 'non-existent-user-id' })
      ).rejects.toThrow('指定的老板用户不存在');
    });
  });

  describe('delete', () => {
    it('应该成功删除没有订单的点位', async () => {
      // 创建一个用于删除测试的点位
      const point = await PointService.create({
        name: '待删除店铺',
        baseId: testBaseId,
      });

      const result = await PointService.delete(point.id);

      expect(result.success).toBe(true);

      // 验证已删除
      await expect(PointService.getById(point.id)).rejects.toThrow('点位不存在');
    });

    it('应该拒绝删除不存在的点位', async () => {
      await expect(
        PointService.delete('non-existent-point-id')
      ).rejects.toThrow('点位不存在');
    });

    it('应该拒绝删除有订单的点位', async () => {
      // 创建一个有订单的点位
      const point = await prisma.point.create({
        data: {
          code: 'POINT-DELTEST' + Date.now().toString().slice(-5),
          name: '有订单的店铺',
          baseId: testBaseId,
        },
      });

      // 创建一个订单
      await prisma.pointOrder.create({
        data: {
          code: 'PO-TEST' + Date.now(),
          pointId: point.id,
          baseId: testBaseId,
          orderDate: new Date(),
          totalAmount: 100,
          createdBy: testUserId,
        },
      });

      await expect(PointService.delete(point.id)).rejects.toThrow(
        '该点位存在关联订单，无法删除'
      );

      // 清理
      await prisma.pointOrder.deleteMany({ where: { pointId: point.id } });
      await prisma.point.delete({ where: { id: point.id } });
    });
  });

  describe('getInventory', () => {
    it('应该返回点位库存列表', async () => {
      const inventory = await PointService.getInventory(testPointId);

      expect(inventory).toBeInstanceOf(Array);
    });
  });

  describe('getOrders', () => {
    it('应该返回点位订单列表', async () => {
      const result = await PointService.getOrders(testPointId, {
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('getAvailableUsers', () => {
    it('应该返回可用用户列表', async () => {
      // 创建临时用户用于此测试
      const tempUser = await prisma.user.create({
        data: {
          username: 'temp_available_' + Date.now(),
          passwordHash: 'hashed_password',
          name: '可选用户测试',
          isActive: true,
        },
      });

      const users = await PointService.getAvailableUsers(testBaseId);

      expect(users).toBeInstanceOf(Array);
      expect(users.length).toBeGreaterThanOrEqual(1);
      
      // 验证返回的用户字段
      const user = users.find(u => u.id === tempUser.id);
      expect(user).toBeDefined();
      expect(user?.username).toBeDefined();
      expect(user?.name).toBeDefined();

      // 清理
      await prisma.user.delete({ where: { id: tempUser.id } });
    });
  });
});
