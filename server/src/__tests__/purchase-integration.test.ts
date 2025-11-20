/**
 * 采购管理API集成测试
 * 包含完整的数据库操作和业务逻辑验证
 */

import request from 'supertest'
import { app } from '../index'
import { prisma } from '../utils/database'
import { generateTestToken, generateAdminTestToken } from './helpers/authHelper'
import { createTestUser, createTestLocation, createTestGoods, cleanupTestData } from './helpers/dataHelper'

describe('采购管理API集成测试', () => {
  let testUser: any
  let adminUser: any
  let testToken: string
  let adminToken: string
  let testLocation: any
  let testGoods1: any
  let testGoods2: any

  beforeAll(async () => {
    // 创建测试用户
    testUser = await createTestUser({
      username: 'purchase_test_user',
      email: 'purchase_test@example.com',
      password: 'test123456'
    })

    adminUser = await createTestUser({
      username: 'purchase_admin_user',
      email: 'purchase_admin@example.com',
      password: 'admin123456'
    })

    // 生成测试令牌
    testToken = generateTestToken(testUser)
    adminToken = generateAdminTestToken(adminUser)

    // 创建测试仓库
    testLocation = await createTestLocation({
      name: '采购测试仓库',
      type: 'WAREHOUSE',
      address: '测试地址123号'
    })

    // 创建测试商品
    testGoods1 = await createTestGoods({
      code: 'TEST_GOODS_001',
      name: '测试商品001',
      retailPrice: 100.00,
      purchasePrice: 80.00,
      description: '采购测试商品1'
    })

    testGoods2 = await createTestGoods({
      code: 'TEST_GOODS_002',
      name: '测试商品002',
      retailPrice: 200.00,
      purchasePrice: 160.00,
      description: '采购测试商品2'
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData(testUser.id)
    await cleanupTestData(adminUser.id)

    // 删除测试商品
    await prisma.goods.deleteMany({
      where: {
        code: {
          in: ['TEST_GOODS_001', 'TEST_GOODS_002']
        }
      }
    })

    // 删除测试仓库
    await prisma.location.delete({
      where: { id: testLocation.id }
    })

    // 删除测试用户
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, adminUser.id]
        }
      }
    })
  })

  describe('POST /api/v1/purchase/orders - 创建采购订单', () => {
    it('应该成功创建采购订单', async () => {
      const orderData = {
        supplierName: '测试供应商A',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-15',
        notes: '测试采购订单',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 2,
            packQuantity: 5,
            pieceQuantity: 10,
            unitPrice: 80.00,
            notes: '商品1备注'
          },
          {
            goodsId: testGoods2.id,
            boxQuantity: 1,
            packQuantity: 3,
            pieceQuantity: 8,
            unitPrice: 160.00,
            notes: '商品2备注'
          }
        ]
      }

      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('orderNo')
      expect(response.body.data.supplierName).toBe(orderData.supplierName)
      expect(response.body.data.targetLocationId).toBe(orderData.targetLocationId)
      expect(response.body.data.items).toHaveLength(2)

      // 验证订单号格式
      expect(response.body.data.orderNo).toMatch(/^PO\d{8}\d{4}$/)

      // 验证总金额计算
      const expectedTotal = (2 + 5 + 10) * 80 + (1 + 3 + 8) * 160
      expect(response.body.data.totalAmount).toBe(expectedTotal)

      // 验证订单项
      const item1 = response.body.data.items.find((item: any) => item.goodsId === testGoods1.id)
      expect(item1.totalPieces).toBe(17) // 2 + 5 + 10
      expect(item1.totalPrice).toBe(1360) // 17 * 80

      const item2 = response.body.data.items.find((item: any) => item.goodsId === testGoods2.id)
      expect(item2.totalPieces).toBe(12) // 1 + 3 + 8
      expect(item2.totalPrice).toBe(1920) // 12 * 160

      // 验证订单创建成功
      expect(response.body.data.id).toBeDefined()
    })

    it('应该验证必填字段', async () => {
      const invalidData = {
        supplierName: '',
        targetLocationId: '',
        items: []
      }

      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('验证失败')
    })

    it('应该验证目标仓库存在性', async () => {
      const orderData = {
        supplierName: '测试供应商B',
        targetLocationId: 'non-existent-location-id',
        purchaseDate: '2024-01-15',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 0,
            unitPrice: 80.00
          }
        ]
      }

      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('目标仓库不存在')
    })

    it('应该验证商品存在性', async () => {
      const orderData = {
        supplierName: '测试供应商C',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-15',
        items: [
          {
            goodsId: 'non-existent-goods-id',
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 0,
            unitPrice: 80.00
          }
        ]
      }

      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('部分商品不存在')
    })

    it('应该拒绝未认证的请求', async () => {
      const orderData = {
        supplierName: '测试供应商D',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-15',
        items: []
      }

      await request(app)
        .post('/api/v1/purchase/orders')
        .send(orderData)
        .expect(401)
    })
  })

  describe('GET /api/v1/purchase/orders - 获取采购订单列表', () => {
    let createdOrderId: string

    beforeAll(async () => {
      // 创建一个测试订单
      const orderData = {
        supplierName: '列表测试供应商',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-20',
        notes: '列表测试订单',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 5,
            unitPrice: 80.00
          }
        ]
      }

      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)

      createdOrderId = createResponse.body.data.id
    })

    it('应该返回采购订单列表', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('orders')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('limit')
      expect(response.body.data).toHaveProperty('totalPages')
      expect(Array.isArray(response.body.data.orders)).toBe(true)
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.data.page).toBe(1)
      expect(response.body.data.limit).toBe(5)
    })

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders?search=列表测试供应商')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      const foundOrder = response.body.data.orders.find((order: any) => order.id === createdOrderId)
      expect(foundOrder).toBeDefined()
      expect(foundOrder.supplierName).toBe('列表测试供应商')
    })

    it('应该支持按仓库筛选', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase/orders?locationId=${testLocation.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      response.body.data.orders.forEach((order: any) => {
        expect(order.targetLocationId).toBe(testLocation.id)
      })
    })

    it('应该支持日期范围筛选', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe('GET /api/v1/purchase/orders/:id - 获取采购订单详情', () => {
    let testOrderId: string

    beforeAll(async () => {
      // 创建一个测试订单
      const orderData = {
        supplierName: '详情测试供应商',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-25',
        notes: '详情测试订单',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 3,
            packQuantity: 2,
            pieceQuantity: 1,
            unitPrice: 80.00,
            notes: '详情测试商品'
          }
        ]
      }

      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)

      testOrderId = createResponse.body.data.id
    })

    it('应该返回采购订单详情', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testOrderId)
      expect(response.body.data.supplierName).toBe('详情测试供应商')
      expect(response.body.data.targetLocation).toBeDefined()
      expect(response.body.data.items).toHaveLength(1)
      expect(response.body.data.items[0].goods).toBeDefined()
      expect(response.body.data.items[0].totalPieces).toBe(6) // 3 + 2 + 1
    })

    it('应该返回404当订单不存在时', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders/non-existent-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('采购订单不存在')
    })
  })

  describe('PUT /api/v1/purchase/orders/:id - 更新采购订单', () => {
    let testOrderId: string

    beforeAll(async () => {
      // 创建一个测试订单
      const orderData = {
        supplierName: '更新测试供应商',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-01-30',
        notes: '更新测试订单',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 1,
            packQuantity: 1,
            pieceQuantity: 1,
            unitPrice: 80.00
          }
        ]
      }

      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)

      testOrderId = createResponse.body.data.id
    })

    it('应该成功更新采购订单基本信息', async () => {
      const updateData = {
        supplierName: '更新后的供应商',
        notes: '更新后的备注'
      }

      const response = await request(app)
        .put(`/api/v1/purchase/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.supplierName).toBe('更新后的供应商')
      expect(response.body.data.notes).toBe('更新后的备注')
    })

    it('应该成功更新采购订单项', async () => {
      const updateData = {
        items: [
          {
            goodsId: testGoods2.id,
            boxQuantity: 2,
            packQuantity: 3,
            pieceQuantity: 4,
            unitPrice: 160.00,
            notes: '更新后的商品'
          }
        ]
      }

      const response = await request(app)
        .put(`/api/v1/purchase/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.items).toHaveLength(1)
      expect(response.body.data.items[0].goodsId).toBe(testGoods2.id)
      expect(response.body.data.items[0].totalPieces).toBe(9) // 2 + 3 + 4
      expect(response.body.data.totalAmount).toBe(1440) // 9 * 160
    })

    it('应该返回404当订单不存在时', async () => {
      const updateData = {
        supplierName: '不存在的订单'
      }

      const response = await request(app)
        .put('/api/v1/purchase/orders/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('采购订单不存在')
    })
  })

  describe('DELETE /api/v1/purchase/orders/:id - 删除采购订单', () => {
    let testOrderId: string

    beforeAll(async () => {
      // 创建一个测试订单
      const orderData = {
        supplierName: '删除测试供应商',
        targetLocationId: testLocation.id,
        purchaseDate: '2024-02-01',
        notes: '删除测试订单',
        items: [
          {
            goodsId: testGoods1.id,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 0,
            unitPrice: 80.00
          }
        ]
      }

      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orderData)

      testOrderId = createResponse.body.data.id
    })

    it('应该成功删除采购订单', async () => {
      const response = await request(app)
        .delete(`/api/v1/purchase/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)

      // 验证订单已被删除
      const getResponse = await request(app)
        .get(`/api/v1/purchase/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404)
    })

    it('应该返回404当订单不存在时', async () => {
      const response = await request(app)
        .delete('/api/v1/purchase/orders/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('采购订单不存在')
    })
  })

  describe('GET /api/v1/purchase/stats - 获取采购统计', () => {
    beforeAll(async () => {
      // 创建一些测试订单用于统计
      const orders = [
        {
          supplierName: '统计测试供应商A',
          targetLocationId: testLocation.id,
          purchaseDate: '2024-02-05',
          items: [
            {
              goodsId: testGoods1.id,
              boxQuantity: 5,
              packQuantity: 0,
              pieceQuantity: 0,
              unitPrice: 80.00
            }
          ]
        },
        {
          supplierName: '统计测试供应商B',
          targetLocationId: testLocation.id,
          purchaseDate: '2024-02-10',
          items: [
            {
              goodsId: testGoods2.id,
              boxQuantity: 3,
              packQuantity: 0,
              pieceQuantity: 0,
              unitPrice: 160.00
            }
          ]
        }
      ]

      for (const orderData of orders) {
        await request(app)
          .post('/api/v1/purchase/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(orderData)
      }
    })

    it('应该返回采购统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/stats')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalOrders')
      expect(response.body.data).toHaveProperty('totalAmount')
      expect(response.body.data).toHaveProperty('topSuppliers')
      expect(response.body.data).toHaveProperty('monthlyStats')
      expect(Array.isArray(response.body.data.topSuppliers)).toBe(true)
      expect(Array.isArray(response.body.data.monthlyStats)).toBe(true)
    })

    it('应该支持日期范围筛选统计', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/stats?startDate=2024-02-01&endDate=2024-02-28')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(typeof response.body.data.totalOrders).toBe('number')
      expect(typeof response.body.data.totalAmount).toBe('number')
    })

    it('应该支持按仓库筛选统计', async () => {
      const response = await request(app)
        .get(`/api/v1/purchase/stats?locationId=${testLocation.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })
})
