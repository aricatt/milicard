/**
 * Location 服务测试
 * 测试 Location ID 从 UUID 改为自增整数后的所有功能
 */

import { LocationBaseService } from '../locationBaseService'
import { createTestUser, testPrisma } from '../../__tests__/setup'
import { LocationType } from '@prisma/client'

describe('LocationService', () => {
  let testUser: any
  let testBase: any

  beforeEach(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      username: `loctest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      password: 'TestPassword123!'
    })

    // 创建测试基地
    testBase = await testPrisma.base.create({
      data: {
        code: `BASE_${Date.now()}`,
        name: '测试基地',
        isActive: true,
        createdBy: testUser.id,
        updatedBy: testUser.id
      }
    })
  })

  afterEach(async () => {
    // 清理测试数据
    await testPrisma.userLocation.deleteMany({
      where: { userId: testUser.id }
    })
    await testPrisma.inventory.deleteMany({})
    await testPrisma.location.deleteMany({
      where: { baseId: testBase.id }
    })
    await testPrisma.base.delete({
      where: { id: testBase.id }
    })
    await testPrisma.user.delete({
      where: { id: testUser.id }
    })
  })

  describe('createLocation - ID 类型验证', () => {
    it('应该创建 Location 并返回整数 ID', async () => {
      const locationData = {
        name: '测试直播间',
        type: 'LIVE_ROOM' as LocationType,
        code: 'LIVE-001',
        address: '测试地址123号',
        contactPerson: '张三',
        contactPhone: '13800138000'
      }

      const result = await LocationBaseService.createLocation(
        testBase.id,
        locationData,
        testUser.id
      )

      // 验证返回格式
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      // 验证 ID 是整数类型
      expect(typeof result.data.id).toBe('number')
      expect(Number.isInteger(result.data.id)).toBe(true)
      expect(result.data.id).toBeGreaterThan(0)

      // 验证其他字段
      expect(result.data.name).toBe(locationData.name)
      expect(result.data.type).toBe(locationData.type)
      expect(result.data.code).toBe(locationData.code)
      expect(result.data.baseId).toBe(testBase.id)
    })

    it('应该自动递增 ID', async () => {
      const location1 = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '直播间1',
          type: 'LIVE_ROOM' as LocationType,
          code: 'LIVE-001'
        },
        testUser.id
      )

      const location2 = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '直播间2',
          type: 'LIVE_ROOM' as LocationType,
          code: 'LIVE-002'
        },
        testUser.id
      )

      // 验证 ID 自增
      expect(location2.data.id).toBeGreaterThan(location1.data.id)
      expect(typeof location1.data.id).toBe('number')
      expect(typeof location2.data.id).toBe('number')
    })

    it('应该创建不同类型的 Location', async () => {
      const liveRoom = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '直播间A',
          type: 'LIVE_ROOM' as LocationType,
          code: 'LIVE-A'
        },
        testUser.id
      )

      const warehouse = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '仓库B',
          type: 'WAREHOUSE' as LocationType,
          code: 'WARE-B'
        },
        testUser.id
      )

      expect(typeof liveRoom.data.id).toBe('number')
      expect(typeof warehouse.data.id).toBe('number')
      expect(liveRoom.data.type).toBe('LIVE_ROOM')
      expect(warehouse.data.type).toBe('WAREHOUSE')
    })
  })

  describe('getLocationById - 整数 ID 查询', () => {
    it('应该通过整数 ID 查询 Location', async () => {
      const created = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '测试查询',
          type: 'LIVE_ROOM' as LocationType,
          code: 'QUERY-001'
        },
        testUser.id
      )

      const found = await testPrisma.location.findFirst({
        where: {
          id: created.data.id,
          baseId: testBase.id
        }
      })

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.data.id)
      expect(typeof found!.id).toBe('number')
      expect(found!.name).toBe('测试查询')
    })

    it('应该在 ID 不存在时返回 null', async () => {
      const found = await testPrisma.location.findFirst({
        where: {
          id: 999999,
          baseId: testBase.id
        }
      })

      expect(found).toBeNull()
    })
  })

  describe('updateLocation - 整数 ID 更新', () => {
    it('应该通过整数 ID 更新 Location', async () => {
      const created = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '原始名称',
          type: 'LIVE_ROOM' as LocationType,
          code: 'UPDATE-001'
        },
        testUser.id
      )

      const updated = await LocationBaseService.updateLocation(
        testBase.id,
        created.data.id,  // 整数 ID
        {
          name: '更新后的名称',
          address: '新地址'
        },
        testUser.id
      )

      expect(updated.data.id).toBe(created.data.id)
      expect(typeof updated.data.id).toBe('number')
      expect(updated.data.name).toBe('更新后的名称')
      expect(updated.data.address).toBe('新地址')
    })
  })

  describe('deleteLocation - 整数 ID 删除', () => {
    it('应该通过整数 ID 删除 Location', async () => {
      const created = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '待删除',
          type: 'WAREHOUSE' as LocationType,
          code: 'DELETE-001'
        },
        testUser.id
      )

      await testPrisma.location.delete({
        where: { id: created.data.id }
      })

      const found = await testPrisma.location.findUnique({
        where: { id: created.data.id }
      })

      expect(found).toBeNull()
    })
  })

  describe('外键关系 - locationId 整数类型验证', () => {
    let testLocation: any
    let testGoods: any

    beforeEach(async () => {
      // 创建测试 Location
      testLocation = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '测试仓库',
          type: 'WAREHOUSE' as LocationType,
          code: 'FK-TEST-001'
        },
        testUser.id
      )

      // 创建测试商品
      testGoods = await testPrisma.goods.create({
        data: {
          code: `GOODS_${Date.now()}`,
          name: JSON.stringify({ zh_CN: '测试商品' }),
          manufacturer: '测试厂商',
          retailPrice: 100.00,
          packPerBox: 10,
          piecePerPack: 5,
          baseId: testBase.id,
          createdBy: testUser.id
        }
      })
    })

    afterEach(async () => {
      await testPrisma.goods.delete({
        where: { id: testGoods.id }
      })
    })

    it('UserLocation.locationId 应该是整数', async () => {
      const userLocation = await testPrisma.userLocation.create({
        data: {
          userId: testUser.id,
          locationId: testLocation.data.id  // 应该是 number
        }
      })

      expect(typeof userLocation.locationId).toBe('number')
      expect(userLocation.locationId).toBe(testLocation.data.id)
    })

    it('Inventory.locationId 应该是整数', async () => {
      const inventory = await testPrisma.inventory.create({
        data: {
          goodsId: testGoods.id,
          locationId: testLocation.data.id,  // 应该是 number
          baseId: testBase.id,
          stockQuantity: 100,
          averageCost: 80.00
        }
      })

      expect(typeof inventory.locationId).toBe('number')
      expect(inventory.locationId).toBe(testLocation.data.id)
    })

    it('PurchaseOrder.targetLocationId 应该是整数', async () => {
      const purchaseOrder = await testPrisma.purchaseOrder.create({
        data: {
          supplierName: '测试供应商',
          targetLocationId: testLocation.data.id,  // 应该是 number
          baseId: testBase.id,
          purchaseDate: new Date(),
          totalAmount: 1000.00,
          createdBy: testUser.id
        }
      })

      expect(typeof purchaseOrder.targetLocationId).toBe('number')
      expect(purchaseOrder.targetLocationId).toBe(testLocation.data.id)
    })

    it('ArrivalOrder.locationId 应该是整数', async () => {
      const arrivalOrder = await testPrisma.arrivalOrder.create({
        data: {
          locationId: testLocation.data.id,  // 应该是 number
          baseId: testBase.id,
          arrivalDate: new Date(),
          totalAmount: 500.00,
          createdBy: testUser.id
        }
      })

      expect(typeof arrivalOrder.locationId).toBe('number')
      expect(arrivalOrder.locationId).toBe(testLocation.data.id)
    })

    it('TransferOrder 的 fromLocationId 和 toLocationId 应该是整数', async () => {
      const location2 = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '目标仓库',
          type: 'WAREHOUSE' as LocationType,
          code: 'FK-TEST-002'
        },
        testUser.id
      )

      const transferOrder = await testPrisma.transferOrder.create({
        data: {
          fromLocationId: testLocation.data.id,  // 应该是 number
          toLocationId: location2.data.id,       // 应该是 number
          baseId: testBase.id,
          transferDate: new Date(),
          totalAmount: 300.00,
          createdBy: testUser.id
        }
      })

      expect(typeof transferOrder.fromLocationId).toBe('number')
      expect(typeof transferOrder.toLocationId).toBe('number')
      expect(transferOrder.fromLocationId).toBe(testLocation.data.id)
      expect(transferOrder.toLocationId).toBe(location2.data.id)

      // 清理
      await testPrisma.transferOrder.delete({
        where: { id: transferOrder.id }
      })
      await testPrisma.location.delete({
        where: { id: location2.data.id }
      })
    })

    it('StockConsumption.locationId 应该是整数', async () => {
      const stockConsumption = await testPrisma.stockConsumption.create({
        data: {
          consumption: 'CONS-TEST-001',
          locationId: testLocation.data.id,  // 应该是 number
          baseId: testBase.id,
          consumptionDate: new Date(),
          totalAmount: 200.00,
          createdBy: testUser.id
        }
      })

      expect(typeof stockConsumption.locationId).toBe('number')
      expect(stockConsumption.locationId).toBe(testLocation.data.id)

      // 清理
      await testPrisma.stockConsumption.delete({
        where: { id: stockConsumption.id }
      })
    })

    it('StockOutOrder.locationId 应该是整数', async () => {
      const stockOutOrder = await testPrisma.stockOutOrder.create({
        data: {
          locationId: testLocation.data.id,  // 应该是 number
          baseId: testBase.id,
          outDate: new Date(),
          totalAmount: 150.00,
          createdBy: testUser.id
        }
      })

      expect(typeof stockOutOrder.locationId).toBe('number')
      expect(stockOutOrder.locationId).toBe(testLocation.data.id)

      // 清理
      await testPrisma.stockOutOrder.delete({
        where: { id: stockOutOrder.id }
      })
    })
  })

  describe('批量操作 - 整数 ID 列表', () => {
    it('应该获取 Location 列表，所有 ID 都是整数', async () => {
      // 创建多个 Location
      await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Location 1', type: 'LIVE_ROOM' as LocationType, code: 'LOC-1' },
        testUser.id
      )
      await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Location 2', type: 'WAREHOUSE' as LocationType, code: 'LOC-2' },
        testUser.id
      )
      await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Location 3', type: 'LIVE_ROOM' as LocationType, code: 'LOC-3' },
        testUser.id
      )

      const result = await LocationBaseService.getBaseLocationList(testBase.id, {
        current: 1,
        pageSize: 10
      })

      expect(result.data.length).toBeGreaterThanOrEqual(3)
      
      // 验证所有 ID 都是整数
      result.data.forEach((location: any) => {
        expect(typeof location.id).toBe('number')
        expect(Number.isInteger(location.id)).toBe(true)
        expect(location.id).toBeGreaterThan(0)
      })
    })

    it('应该按类型筛选 Location', async () => {
      await LocationBaseService.createLocation(
        testBase.id,
        { name: '直播间A', type: 'LIVE_ROOM' as LocationType, code: 'LIVE-A' },
        testUser.id
      )
      await LocationBaseService.createLocation(
        testBase.id,
        { name: '仓库B', type: 'WAREHOUSE' as LocationType, code: 'WARE-B' },
        testUser.id
      )

      const liveRooms = await LocationBaseService.getBaseLocationList(testBase.id, {
        type: 'LIVE_ROOM',
        current: 1,
        pageSize: 10
      })

      const warehouses = await LocationBaseService.getBaseLocationList(testBase.id, {
        type: 'WAREHOUSE',
        current: 1,
        pageSize: 10
      })

      // 验证筛选结果
      liveRooms.data.forEach((loc: any) => {
        expect(loc.type).toBe('LIVE_ROOM')
        expect(typeof loc.id).toBe('number')
      })

      warehouses.data.forEach((loc: any) => {
        expect(loc.type).toBe('WAREHOUSE')
        expect(typeof loc.id).toBe('number')
      })
    })
  })

  describe('边界条件测试', () => {
    it('应该处理大量 Location 创建', async () => {
      const locations = []
      
      for (let i = 0; i < 10; i++) {
        const location = await LocationBaseService.createLocation(
          testBase.id,
          {
            name: `批量测试 ${i}`,
            type: i % 2 === 0 ? 'LIVE_ROOM' as LocationType : 'WAREHOUSE' as LocationType,
            code: `BULK-${i}`
          },
          testUser.id
        )
        locations.push(location)
      }

      // 验证所有 ID 都是唯一的整数
      const ids = locations.map(loc => loc.data.id)
      const uniqueIds = new Set(ids)
      
      expect(ids.length).toBe(10)
      expect(uniqueIds.size).toBe(10)
      
      ids.forEach(id => {
        expect(typeof id).toBe('number')
        expect(Number.isInteger(id)).toBe(true)
      })

      // 验证 ID 是递增的
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1])
      }
    })

    it('应该正确处理 Location 删除后的 ID 复用', async () => {
      const loc1 = await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Loc 1', type: 'LIVE_ROOM' as LocationType, code: 'REUSE-1' },
        testUser.id
      )

      const loc2 = await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Loc 2', type: 'LIVE_ROOM' as LocationType, code: 'REUSE-2' },
        testUser.id
      )

      // 删除第一个
      await testPrisma.location.delete({ where: { id: loc1.data.id } })

      // 创建新的
      const loc3 = await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Loc 3', type: 'LIVE_ROOM' as LocationType, code: 'REUSE-3' },
        testUser.id
      )

      // 新 ID 应该大于已删除的 ID（PostgreSQL 自增不会复用）
      expect(loc3.data.id).toBeGreaterThan(loc1.data.id)
      expect(loc3.data.id).toBeGreaterThan(loc2.data.id)
      expect(typeof loc3.data.id).toBe('number')
    })
  })

  describe('错误处理', () => {
    it('应该在重复编码时抛出错误', async () => {
      await LocationBaseService.createLocation(
        testBase.id,
        { name: 'Location 1', type: 'LIVE_ROOM' as LocationType, code: 'DUP-001' },
        testUser.id
      )

      await expect(
        LocationBaseService.createLocation(
          testBase.id,
          { name: 'Location 2', type: 'LIVE_ROOM' as LocationType, code: 'DUP-001' },
          testUser.id
        )
      ).rejects.toThrow()
    })

    it('应该在更新不存在的 Location 时抛出错误', async () => {
      await expect(
        testPrisma.location.update({
          where: { id: 999999 },
          data: { name: '不存在' }
        })
      ).rejects.toThrow()
    })

    it('应该在删除不存在的 Location 时抛出错误', async () => {
      await expect(
        testPrisma.location.delete({
          where: { id: 999999 }
        })
      ).rejects.toThrow()
    })
  })

  describe('数据完整性验证', () => {
    it('创建的 Location 应该包含所有必需字段', async () => {
      const location = await LocationBaseService.createLocation(
        testBase.id,
        {
          name: '完整性测试',
          type: 'LIVE_ROOM' as LocationType,
          code: 'INTEGRITY-001',
          address: '测试地址',
          contactPerson: '联系人',
          contactPhone: '13800138000'
        },
        testUser.id
      )

      expect(location.data).toHaveProperty('id')
      expect(location.data).toHaveProperty('name')
      expect(location.data).toHaveProperty('type')
      expect(location.data).toHaveProperty('code')
      expect(location.data).toHaveProperty('baseId')
      expect(location.data).toHaveProperty('address')
      expect(location.data).toHaveProperty('contactPerson')
      expect(location.data).toHaveProperty('contactPhone')
      expect(location.data).toHaveProperty('createdAt')
      expect(location.data).toHaveProperty('updatedAt')

      // 验证类型
      expect(typeof location.data.id).toBe('number')
      expect(typeof location.data.name).toBe('string')
      expect(typeof location.data.baseId).toBe('number')
      expect(location.data.createdAt).toBeInstanceOf(Date)
      expect(location.data.updatedAt).toBeInstanceOf(Date)
    })
  })
})
