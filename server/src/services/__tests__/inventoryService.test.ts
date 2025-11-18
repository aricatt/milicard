import { InventoryService } from '../inventoryService'
import { createTestUser, testPrisma } from '../../__tests__/setup'
import { faker } from '@faker-js/faker'

describe('InventoryService', () => {
  let testUser: any
  let testGoods: any
  let testLocation: any
  let testPurchaseOrder: any

  beforeEach(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      username: `inventorytest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      password: 'TestPassword123!'
    })

    // 创建测试仓库
    testLocation = await testPrisma.location.create({
      data: {
        name: '测试仓库',
        type: 'WAREHOUSE',
        address: '测试地址',
        isActive: true
      }
    })

    // 创建测试商品
    testGoods = await testPrisma.goods.create({
      data: {
        code: `INV${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: JSON.stringify({
          zh_CN: '测试商品',
          en_US: 'Test Product'
        }),
        retailPrice: 100.00,
        purchasePrice: 80.00,
        isActive: true
      }
    })

    // 创建测试采购订单
    testPurchaseOrder = await testPrisma.purchaseOrder.create({
      data: {
        orderNo: 'PO001',
        supplierName: '测试供应商',
        targetLocationId: testLocation.id,
        purchaseDate: new Date(),
        totalAmount: 800.00,
        createdBy: testUser.id
      }
    })
  })

  describe('getInventoryList', () => {
    beforeEach(async () => {
      // 创建测试库存数据
      await testPrisma.inventory.create({
        data: {
          goodsId: testGoods.id,
          locationId: testLocation.id,
          stockQuantity: 100,
          averageCost: 80.00
        }
      })
    })

    it('should get inventory list successfully', async () => {
      const result = await InventoryService.getInventoryList({})

      expect(result).toBeDefined()
      expect(result.inventory).toBeDefined()
      expect(Array.isArray(result.inventory)).toBe(true)
      expect(result.inventory.length).toBeGreaterThan(0)
      expect(result.pagination).toBeDefined()
      expect(result.summary).toBeDefined()
    })

    it('should filter by location', async () => {
      const result = await InventoryService.getInventoryList({
        locationId: testLocation.id
      })

      expect(result.inventory.length).toBeGreaterThan(0)
      expect(result.inventory.every(item => item.locationId === testLocation.id)).toBe(true)
    })

    it('should filter by goods', async () => {
      const result = await InventoryService.getInventoryList({
        goodsId: testGoods.id
      })

      expect(result.inventory.length).toBeGreaterThan(0)
      expect(result.inventory.every(item => item.goodsId === testGoods.id)).toBe(true)
    })

    it('should paginate results', async () => {
      const result = await InventoryService.getInventoryList({
        page: 1,
        limit: 10
      })

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.inventory.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getGoodsInventory', () => {
    beforeEach(async () => {
      // 创建测试库存数据
      await testPrisma.inventory.create({
        data: {
          goodsId: testGoods.id,
          locationId: testLocation.id,
          stockQuantity: 50,
          averageCost: 75.00
        }
      })
    })

    it('should get goods inventory successfully', async () => {
      const result = await InventoryService.getGoodsInventory(testGoods.id)

      expect(result).toBeDefined()
      expect(result.goodsId).toBe(testGoods.id)
      expect(result.totalStock).toBe(50)
      expect(result.totalValue).toBe(50 * 75.00)
      expect(Array.isArray(result.locations)).toBe(true)
      expect(result.locations.length).toBe(1)
    })

    it('should return zero stock for goods without inventory', async () => {
      // 创建另一个商品但不创建库存
      const anotherGoods = await testPrisma.goods.create({
        data: {
          code: `INV${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: JSON.stringify({ zh_CN: '无库存商品' }),
          retailPrice: 50.00,
          isActive: true
        }
      })

      const result = await InventoryService.getGoodsInventory(anotherGoods.id)

      expect(result.totalStock).toBe(0)
      expect(result.totalValue).toBe(0)
      expect(result.locations.length).toBe(0)
    })
  })

  describe('createArrivalOrder', () => {
    it('should create arrival order successfully', async () => {
      const arrivalData = {
        purchaseOrderId: testPurchaseOrder.id,
        locationId: testLocation.id,
        arrivalDate: '2024-01-15',
        notes: '测试到货',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 10,
            unitCost: 80.00,
            notes: '测试商品到货'
          }
        ]
      }

      const result = await InventoryService.createArrivalOrder(arrivalData, testUser.id)

      expect(result).toBeDefined()
      expect(result.arrivalNo).toBeDefined()
      expect(result.purchaseOrderId).toBe(testPurchaseOrder.id)
      expect(result.locationId).toBe(testLocation.id)
      expect(result.items.length).toBe(1)
      expect(result.items[0].quantity).toBe(10)
      expect(result.items[0].unitCost).toBe(80.00)

      // 验证库存是否更新
      const inventory = await testPrisma.inventory.findUnique({
        where: {
          goodsId_locationId: {
            goodsId: testGoods.id,
            locationId: testLocation.id
          }
        }
      })

      expect(inventory).toBeDefined()
      expect(inventory!.stockQuantity).toBe(10)
    })

    it('should throw error for non-existent purchase order', async () => {
      const arrivalData = {
        purchaseOrderId: faker.string.uuid(),
        locationId: testLocation.id,
        arrivalDate: '2024-01-15',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 10,
            unitCost: 80.00
          }
        ]
      }

      await expect(
        InventoryService.createArrivalOrder(arrivalData, testUser.id)
      ).rejects.toThrow('采购订单不存在')
    })

    it('should throw error for non-existent location', async () => {
      const arrivalData = {
        purchaseOrderId: testPurchaseOrder.id,
        locationId: faker.string.uuid(),
        arrivalDate: '2024-01-15',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 10,
            unitCost: 80.00
          }
        ]
      }

      await expect(
        InventoryService.createArrivalOrder(arrivalData, testUser.id)
      ).rejects.toThrow('仓库不存在')
    })
  })

  describe('createTransferOrder', () => {
    let fromLocation: any
    let toLocation: any

    beforeEach(async () => {
      // 创建调出仓库
      fromLocation = await testPrisma.location.create({
        data: {
          name: '调出仓库',
          type: 'WAREHOUSE',
          address: '调出地址',
          isActive: true
        }
      })

      // 创建调入仓库
      toLocation = await testPrisma.location.create({
        data: {
          name: '调入仓库',
          type: 'WAREHOUSE',
          address: '调入地址',
          isActive: true
        }
      })

      // 在调出仓库创建库存
      await testPrisma.inventory.create({
        data: {
          goodsId: testGoods.id,
          locationId: fromLocation.id,
          stockQuantity: 100,
          averageCost: 80.00
        }
      })
    })

    it('should create transfer order successfully', async () => {
      const transferData = {
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        transferDate: '2024-01-15',
        notes: '测试调拨',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 20,
            notes: '测试商品调拨'
          }
        ]
      }

      const result = await InventoryService.createTransferOrder(transferData, testUser.id)

      expect(result).toBeDefined()
      expect(result.transferNo).toBeDefined()
      expect(result.fromLocationId).toBe(fromLocation.id)
      expect(result.toLocationId).toBe(toLocation.id)
      expect(result.items.length).toBe(1)
      expect(result.items[0].quantity).toBe(20)
    })

    it('should throw error for insufficient stock', async () => {
      const transferData = {
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        transferDate: '2024-01-15',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 200  // 超过库存数量
          }
        ]
      }

      await expect(
        InventoryService.createTransferOrder(transferData, testUser.id)
      ).rejects.toThrow('库存不足')
    })

    it('should throw error for same location transfer', async () => {
      const transferData = {
        fromLocationId: fromLocation.id,
        toLocationId: fromLocation.id,  // 相同仓库
        transferDate: '2024-01-15',
        items: [
          {
            goodsId: testGoods.id,
            quantity: 20
          }
        ]
      }

      // 这个错误应该在验证器层面被捕获，但我们也可以在服务层测试
      await expect(
        InventoryService.createTransferOrder(transferData, testUser.id)
      ).rejects.toThrow('调出仓库和调入仓库不能相同')
    })
  })

  describe('confirmTransferOrder', () => {
    let fromLocation: any
    let toLocation: any
    let transferOrder: any

    beforeEach(async () => {
      // 创建调出和调入仓库
      fromLocation = await testPrisma.location.create({
        data: {
          name: '调出仓库',
          type: 'WAREHOUSE',
          address: '调出地址',
          isActive: true
        }
      })

      toLocation = await testPrisma.location.create({
        data: {
          name: '调入仓库',
          type: 'WAREHOUSE',
          address: '调入地址',
          isActive: true
        }
      })

      // 在调出仓库创建库存
      await testPrisma.inventory.create({
        data: {
          goodsId: testGoods.id,
          locationId: fromLocation.id,
          stockQuantity: 100,
          averageCost: 80.00
        }
      })

      // 创建调拨单
      transferOrder = await testPrisma.transferOrder.create({
        data: {
          transferNo: 'TRF001',
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          transferDate: new Date(),
          createdBy: testUser.id,
          items: {
            create: [
              {
                goodsId: testGoods.id,
                quantity: 30
              }
            ]
          }
        }
      })
    })

    it('should confirm transfer order successfully', async () => {
      const result = await InventoryService.confirmTransferOrder(transferOrder.id, testUser.id)

      expect(result.success).toBe(true)

      // 验证调出仓库库存减少
      const fromInventory = await testPrisma.inventory.findUnique({
        where: {
          goodsId_locationId: {
            goodsId: testGoods.id,
            locationId: fromLocation.id
          }
        }
      })
      expect(fromInventory!.stockQuantity).toBe(70)  // 100 - 30

      // 验证调入仓库库存增加
      const toInventory = await testPrisma.inventory.findUnique({
        where: {
          goodsId_locationId: {
            goodsId: testGoods.id,
            locationId: toLocation.id
          }
        }
      })
      expect(toInventory!.stockQuantity).toBe(30)
    })

    it('should throw error for non-existent transfer order', async () => {
      const nonExistentId = faker.string.uuid()

      await expect(
        InventoryService.confirmTransferOrder(nonExistentId, testUser.id)
      ).rejects.toThrow('调拨单不存在')
    })
  })
})
