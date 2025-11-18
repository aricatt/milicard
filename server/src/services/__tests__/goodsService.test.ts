import { GoodsService, SimpleGoodsRequest } from '../goodsService.simple'
import { createTestUser, createTestRole, testPrisma } from '../../__tests__/setup'
import { faker } from '@faker-js/faker'

describe('GoodsService', () => {
  let testUser: any

  beforeEach(async () => {
    testUser = await createTestUser({
      username: 'goodstest',
      password: 'TestPassword123!'
    })
  })

  describe('createGoods', () => {
    it('should create goods successfully', async () => {
      const goodsData: SimpleGoodsRequest = {
        code: 'TEST001',
        name: {
          zh_CN: '测试商品',
          en_US: 'Test Product'
        },
        description: {
          zh_CN: '这是一个测试商品',
          en_US: 'This is a test product'
        },
        retailPrice: 100.00,
        purchasePrice: 80.00,
        boxQuantity: 10,
        packPerBox: 5,
        piecePerPack: 2,
        imageUrl: 'https://example.com/image.jpg',
        notes: 'Test notes',
        isActive: true
      }

      const result = await GoodsService.createGoods(goodsData, testUser.id)

      expect(result).toBeDefined()
      expect(result.code).toBe(goodsData.code)
      expect(result.name).toEqual(goodsData.name)
      expect(result.retailPrice).toBe(goodsData.retailPrice)
      expect(result.purchasePrice).toBe(goodsData.purchasePrice)
      expect(result.isActive).toBe(true)
    })

    it('should throw error for duplicate code', async () => {
      const goodsData: SimpleGoodsRequest = {
        code: 'DUPLICATE001',
        name: {
          zh_CN: '重复商品',
          en_US: 'Duplicate Product'
        },
        retailPrice: 50.00
      }

      // 创建第一个商品
      await GoodsService.createGoods(goodsData, testUser.id)

      // 尝试创建重复编码的商品
      await expect(
        GoodsService.createGoods(goodsData, testUser.id)
      ).rejects.toThrow('商品编码 DUPLICATE001 已存在')
    })

    it('should create goods with minimal data', async () => {
      const goodsData: SimpleGoodsRequest = {
        code: 'MINIMAL001',
        name: {
          zh_CN: '最小商品'
        }
      }

      const result = await GoodsService.createGoods(goodsData, testUser.id)

      expect(result).toBeDefined()
      expect(result.code).toBe(goodsData.code)
      expect(result.retailPrice).toBe(0)
      expect(result.purchasePrice).toBe(0)
      expect(result.boxQuantity).toBe(1)
      expect(result.isActive).toBe(true)
    })
  })

  describe('getGoodsList', () => {
    beforeEach(async () => {
      // 创建测试商品
      const goodsData = [
        {
          code: 'LIST001',
          name: { zh_CN: '列表商品1', en_US: 'List Product 1' },
          retailPrice: 100,
          isActive: true
        },
        {
          code: 'LIST002',
          name: { zh_CN: '列表商品2', en_US: 'List Product 2' },
          retailPrice: 200,
          isActive: true
        },
        {
          code: 'LIST003',
          name: { zh_CN: '停用商品', en_US: 'Inactive Product' },
          retailPrice: 150,
          isActive: false
        }
      ]

      for (const data of goodsData) {
        await GoodsService.createGoods(data, testUser.id)
      }
    })

    it('should get goods list with default parameters', async () => {
      const result = await GoodsService.getGoodsList({})

      expect(result.goods).toBeDefined()
      expect(Array.isArray(result.goods)).toBe(true)
      expect(result.goods.length).toBeGreaterThan(0)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    it('should filter by active status', async () => {
      const activeResult = await GoodsService.getGoodsList({ isActive: true })
      const inactiveResult = await GoodsService.getGoodsList({ isActive: false })

      expect(activeResult.goods.every(g => g.isActive)).toBe(true)
      expect(inactiveResult.goods.every(g => !g.isActive)).toBe(true)
    })

    it('should search by code', async () => {
      const result = await GoodsService.getGoodsList({ search: 'LIST001' })

      expect(result.goods.length).toBeGreaterThan(0)
      expect(result.goods.some(g => g.code === 'LIST001')).toBe(true)
    })

    it('should paginate results', async () => {
      const page1 = await GoodsService.getGoodsList({ page: 1, limit: 2 })
      const page2 = await GoodsService.getGoodsList({ page: 2, limit: 2 })

      expect(page1.goods.length).toBeLessThanOrEqual(2)
      expect(page1.pagination.page).toBe(1)
      expect(page1.pagination.limit).toBe(2)

      if (page2.goods.length > 0) {
        expect(page2.pagination.page).toBe(2)
        // 确保不同页面的商品不重复
        const page1Ids = page1.goods.map(g => g.id)
        const page2Ids = page2.goods.map(g => g.id)
        expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false)
      }
    })

    it('should sort by different fields', async () => {
      const byCode = await GoodsService.getGoodsList({ 
        sortBy: 'code', 
        sortOrder: 'asc' 
      })
      const byPrice = await GoodsService.getGoodsList({ 
        sortBy: 'retailPrice', 
        sortOrder: 'desc' 
      })

      expect(byCode.goods.length).toBeGreaterThan(1)
      expect(byPrice.goods.length).toBeGreaterThan(1)

      // 验证排序
      for (let i = 1; i < byCode.goods.length; i++) {
        expect(byCode.goods[i].code >= byCode.goods[i-1].code).toBe(true)
      }

      for (let i = 1; i < byPrice.goods.length; i++) {
        expect(byPrice.goods[i].retailPrice <= byPrice.goods[i-1].retailPrice).toBe(true)
      }
    })
  })

  describe('getGoodsById', () => {
    let testGoods: any

    beforeEach(async () => {
      testGoods = await GoodsService.createGoods({
        code: 'DETAIL001',
        name: { zh_CN: '详情商品', en_US: 'Detail Product' },
        retailPrice: 299.99
      }, testUser.id)
    })

    it('should get goods by id successfully', async () => {
      const result = await GoodsService.getGoodsById(testGoods.id)

      expect(result).toBeDefined()
      expect(result.id).toBe(testGoods.id)
      expect(result.code).toBe('DETAIL001')
      expect(result.name).toEqual(testGoods.name)
    })

    it('should throw error for non-existent goods', async () => {
      const nonExistentId = faker.string.uuid()

      await expect(
        GoodsService.getGoodsById(nonExistentId)
      ).rejects.toThrow('商品不存在')
    })
  })

  describe('updateGoods', () => {
    let testGoods: any

    beforeEach(async () => {
      testGoods = await GoodsService.createGoods({
        code: 'UPDATE001',
        name: { zh_CN: '更新商品', en_US: 'Update Product' },
        retailPrice: 100.00,
        isActive: true
      }, testUser.id)
    })

    it('should update goods successfully', async () => {
      const updateData = {
        name: { zh_CN: '已更新商品', en_US: 'Updated Product' },
        retailPrice: 150.00,
        notes: 'Updated notes'
      }

      const result = await GoodsService.updateGoods(testGoods.id, updateData, testUser.id)

      expect(result.name).toEqual(updateData.name)
      expect(result.retailPrice).toBe(updateData.retailPrice)
      expect(result.notes).toBe(updateData.notes)
      expect(result.code).toBe(testGoods.code) // 未更新的字段保持不变
    })

    it('should update goods code if not duplicate', async () => {
      const updateData = { code: 'NEWCODE001' }

      const result = await GoodsService.updateGoods(testGoods.id, updateData, testUser.id)

      expect(result.code).toBe('NEWCODE001')
    })

    it('should throw error for duplicate code', async () => {
      // 创建另一个商品
      await GoodsService.createGoods({
        code: 'EXISTING001',
        name: { zh_CN: '已存在商品' }
      }, testUser.id)

      // 尝试更新为已存在的编码
      await expect(
        GoodsService.updateGoods(testGoods.id, { code: 'EXISTING001' }, testUser.id)
      ).rejects.toThrow('商品编码 EXISTING001 已存在')
    })

    it('should throw error for non-existent goods', async () => {
      const nonExistentId = faker.string.uuid()

      await expect(
        GoodsService.updateGoods(nonExistentId, { retailPrice: 200 }, testUser.id)
      ).rejects.toThrow('商品不存在')
    })
  })

  describe('deleteGoods', () => {
    let testGoods: any

    beforeEach(async () => {
      testGoods = await GoodsService.createGoods({
        code: 'DELETE001',
        name: { zh_CN: '删除商品', en_US: 'Delete Product' },
        retailPrice: 100.00
      }, testUser.id)
    })

    it('should delete goods successfully (soft delete)', async () => {
      await GoodsService.deleteGoods(testGoods.id, testUser.id)

      // 验证商品被软删除（isActive = false）
      const deletedGoods = await GoodsService.getGoodsById(testGoods.id)
      expect(deletedGoods.isActive).toBe(false)
    })

    it('should throw error for non-existent goods', async () => {
      const nonExistentId = faker.string.uuid()

      await expect(
        GoodsService.deleteGoods(nonExistentId, testUser.id)
      ).rejects.toThrow('商品不存在')
    })
  })

  describe('getGoodsStock', () => {
    let testGoods: any

    beforeEach(async () => {
      testGoods = await GoodsService.createGoods({
        code: 'STOCK001',
        name: { zh_CN: '库存商品', en_US: 'Stock Product' }
      }, testUser.id)
    })

    it('should get goods stock info', async () => {
      const result = await GoodsService.getGoodsStock(testGoods.id)

      expect(result).toBeDefined()
      expect(result.goodsId).toBe(testGoods.id)
      expect(result.totalStock).toBeDefined()
      expect(Array.isArray(result.locations)).toBe(true)
    })

    it('should return zero stock for new goods', async () => {
      const result = await GoodsService.getGoodsStock(testGoods.id)

      expect(result.totalStock).toBe(0)
      expect(result.locations.length).toBe(0)
    })
  })
})
