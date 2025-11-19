/**
 * 采购管理API测试用例
 */

import request from 'supertest'
import { app } from '../index'
import { prisma } from '../utils/database'
import { generateTestToken } from './helpers/authHelper'
import { createTestUser, createTestLocation, createTestGoods } from './helpers/dataHelper'

describe('采购管理API测试', () => {
  let authToken: string
  let testUserId: string
  let testLocationId: string
  let testGoodsId: string
  let createdPurchaseOrderId: string

  beforeAll(async () => {
    // 创建测试用户
    const testUser = await createTestUser({
      username: 'purchase_test_user',
      email: 'purchase@test.com',
      password: 'test123456'
    })
    testUserId = testUser.id
    authToken = generateTestToken(testUser)

    // 创建测试仓库
    const testLocation = await createTestLocation({
      name: '测试仓库',
      type: 'WAREHOUSE'
    })
    testLocationId = testLocation.id

    // 创建测试商品
    const testGoods = await createTestGoods({
      code: 'TEST_GOODS_001',
      name: '测试商品',
      retailPrice: 100,
      purchasePrice: 80
    })
    testGoodsId = testGoods.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.purchaseOrderItem.deleteMany({
      where: {
        purchaseOrder: {
          createdBy: testUserId
        }
      }
    })
    await prisma.purchaseOrder.deleteMany({
      where: {
        createdBy: testUserId
      }
    })
    await prisma.goods.deleteMany({
      where: {
        id: testGoodsId
      }
    })
    await prisma.location.deleteMany({
      where: {
        id: testLocationId
      }
    })
    await prisma.user.deleteMany({
      where: {
        id: testUserId
      }
    })
  })

  describe('GET /api/v1/purchase/orders - 获取采购订单列表', () => {
    it('应该成功获取采购订单列表', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('orders')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('limit')
      expect(Array.isArray(response.body.data.orders)).toBe(true)
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.page).toBe(1)
      expect(response.body.data.limit).toBe(10)
    })

    it('应该支持搜索查询', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/orders')
        .query({ search: 'test' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .get('/api/v1/purchase/orders')
        .expect(401)
    })
  })

  describe('POST /api/v1/purchase/orders - 创建采购订单', () => {
    const validOrderData = {
      supplierName: '测试供应商',
      targetLocationId: '',
      purchaseDate: '2025-01-01',
      notes: '测试采购订单',
      items: [
        {
          goodsId: '',
          boxQuantity: 1,
          packQuantity: 2,
          pieceQuantity: 10,
          unitPrice: 80,
          notes: '测试商品项'
        }
      ]
    }

    beforeEach(() => {
      validOrderData.targetLocationId = testLocationId
      validOrderData.items[0].goodsId = testGoodsId
    })

    it('应该成功创建采购订单', async () => {
      const response = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validOrderData)
        .expect(201)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('orderNo')
      expect(response.body.data.supplierName).toBe(validOrderData.supplierName)
      expect(response.body.data.items).toHaveLength(1)

      // 保存创建的订单ID用于后续测试
      createdPurchaseOrderId = response.body.data.id
    })

    it('应该验证必填字段', async () => {
      const invalidData = { ...validOrderData }
      delete (invalidData as any).supplierName

      await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('应该验证商品ID格式', async () => {
      const invalidData = {
        ...validOrderData,
        items: [{
          ...validOrderData.items[0],
          goodsId: 'invalid-uuid'
        }]
      }

      await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('应该验证数量必须大于0', async () => {
      const invalidData = {
        ...validOrderData,
        items: [{
          ...validOrderData.items[0],
          boxQuantity: 0,
          packQuantity: 0,
          pieceQuantity: 0
        }]
      }

      await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .post('/api/v1/purchase/orders')
        .send(validOrderData)
        .expect(401)
    })
  })

  describe('GET /api/v1/purchase/orders/:id - 获取采购订单详情', () => {
    it('应该成功获取存在的采购订单详情', async () => {
      // 先创建一个订单
      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierName: '测试供应商详情',
          targetLocationId: testLocationId,
          purchaseDate: '2025-01-01',
          notes: '测试采购订单详情',
          items: [{
            goodsId: testGoodsId,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 5,
            unitPrice: 80
          }]
        })

      const orderId = createResponse.body.data.id

      // 获取订单详情
      const response = await request(app)
        .get(`/api/v1/purchase/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('id', orderId)
      expect(response.body.data).toHaveProperty('orderNo')
      expect(response.body.data).toHaveProperty('supplierName')
      expect(response.body.data).toHaveProperty('items')
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    it('应该返回404当订单不存在', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      
      await request(app)
        .get(`/api/v1/purchase/orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('应该验证UUID格式', async () => {
      await request(app)
        .get('/api/v1/purchase/orders/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .get(`/api/v1/purchase/orders/${createdPurchaseOrderId || 'test-id'}`)
        .expect(401)
    })
  })

  describe('PUT /api/v1/purchase/orders/:id - 更新采购订单', () => {
    let orderIdForUpdate: string

    beforeEach(async () => {
      // 创建一个订单用于更新测试
      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierName: '待更新供应商',
          targetLocationId: testLocationId,
          purchaseDate: '2025-01-01',
          notes: '待更新订单',
          items: [{
            goodsId: testGoodsId,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 5,
            unitPrice: 80
          }]
        })

      orderIdForUpdate = createResponse.body.data.id
    })

    it('应该成功更新采购订单', async () => {
      const updateData = {
        supplierName: '更新后供应商',
        notes: '更新后备注'
      }

      const response = await request(app)
        .put(`/api/v1/purchase/orders/${orderIdForUpdate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data.supplierName).toBe(updateData.supplierName)
      expect(response.body.data.notes).toBe(updateData.notes)
    })

    it('应该返回404当订单不存在', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      
      await request(app)
        .put(`/api/v1/purchase/orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ supplierName: '测试' })
        .expect(404)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .put(`/api/v1/purchase/orders/${orderIdForUpdate}`)
        .send({ supplierName: '测试' })
        .expect(401)
    })
  })

  describe('DELETE /api/v1/purchase/orders/:id - 删除采购订单', () => {
    let orderIdForDelete: string

    beforeEach(async () => {
      // 创建一个订单用于删除测试
      const createResponse = await request(app)
        .post('/api/v1/purchase/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierName: '待删除供应商',
          targetLocationId: testLocationId,
          purchaseDate: '2025-01-01',
          notes: '待删除订单',
          items: [{
            goodsId: testGoodsId,
            boxQuantity: 1,
            packQuantity: 0,
            pieceQuantity: 5,
            unitPrice: 80
          }]
        })

      orderIdForDelete = createResponse.body.data.id
    })

    it('应该成功删除采购订单', async () => {
      await request(app)
        .delete(`/api/v1/purchase/orders/${orderIdForDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // 验证订单已被删除
      await request(app)
        .get(`/api/v1/purchase/orders/${orderIdForDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('应该返回404当订单不存在', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      
      await request(app)
        .delete(`/api/v1/purchase/orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .delete(`/api/v1/purchase/orders/${orderIdForDelete}`)
        .expect(401)
    })
  })

  describe('GET /api/v1/purchase/stats - 获取采购统计', () => {
    it('应该成功获取采购统计', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('totalOrders')
      expect(response.body.data).toHaveProperty('totalAmount')
      expect(response.body.data).toHaveProperty('pendingOrders')
      expect(response.body.data).toHaveProperty('completedOrders')
    })

    it('应该支持日期范围查询', async () => {
      const response = await request(app)
        .get('/api/v1/purchase/stats')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
    })

    it('未认证用户应该被拒绝', async () => {
      await request(app)
        .get('/api/v1/purchase/stats')
        .expect(401)
    })
  })
})
