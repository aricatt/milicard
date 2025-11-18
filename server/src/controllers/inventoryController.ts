// 库存管理控制器

import { Request, Response } from 'express'
import { InventoryService } from '../services/inventoryService'
import { logger } from '../utils/logger'
import { InventoryError } from '../types/inventory'

export class InventoryController {

  // ================================
  // 库存查询功能
  // ================================

  /**
   * 获取库存列表
   */
  static async getInventoryList(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const result = await InventoryService.getInventoryList(req.query as any)

      logger.info('获取库存列表成功', {
        service: 'milicard-api',
        userId,
        params: req.query,
        resultCount: result.inventory.length
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取库存列表失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        params: req.query
      })

      if (error instanceof InventoryError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: error.type
        })
      }

      res.status(500).json({
        success: false,
        message: '获取库存列表失败'
      })
    }
  }

  /**
   * 获取商品库存信息
   */
  static async getGoodsInventory(req: Request, res: Response) {
    try {
      const { goodsId } = req.params
      const userId = req.user?.id

      const result = await InventoryService.getGoodsInventory(goodsId)

      logger.info('获取商品库存成功', {
        service: 'milicard-api',
        goodsId,
        userId,
        totalStock: result.totalStock
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取商品库存失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        goodsId: req.params.goodsId,
        userId: req.user?.id
      })

      if (error instanceof InventoryError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: error.type
        })
      }

      res.status(500).json({
        success: false,
        message: '获取商品库存失败'
      })
    }
  }

  // ================================
  // 到货入库功能
  // ================================

  /**
   * 创建到货入库单
   */
  static async createArrivalOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        })
      }

      const result = await InventoryService.createArrivalOrder(req.body, userId)

      logger.info('创建到货入库单成功', {
        service: 'milicard-api',
        arrivalOrderId: result.id,
        arrivalNo: result.arrivalNo,
        userId,
        itemCount: result.items.length
      })

      res.status(201).json({
        success: true,
        data: result,
        message: '到货入库单创建成功'
      })

    } catch (error) {
      logger.error('创建到货入库单失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        requestData: req.body
      })

      if (error instanceof InventoryError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: error.type
        })
      }

      res.status(500).json({
        success: false,
        message: '创建到货入库单失败'
      })
    }
  }

  /**
   * 获取到货入库单列表
   */
  static async getArrivalOrderList(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const {
        page = 1,
        limit = 20,
        purchaseOrderId,
        locationId,
        startDate,
        endDate,
        search
      } = req.query

      // 构建查询条件
      const where: any = {}

      if (purchaseOrderId) {
        where.purchaseOrderId = purchaseOrderId
      }

      if (locationId) {
        where.locationId = locationId
      }

      if (startDate || endDate) {
        where.arrivalDate = {}
        if (startDate) {
          where.arrivalDate.gte = new Date(startDate as string)
        }
        if (endDate) {
          where.arrivalDate.lte = new Date(endDate as string)
        }
      }

      if (search) {
        where.OR = [
          { arrivalNo: { contains: search, mode: 'insensitive' } },
          { purchaseOrder: { orderNo: { contains: search, mode: 'insensitive' } } },
          { purchaseOrder: { supplierName: { contains: search, mode: 'insensitive' } } }
        ]
      }

      const [arrivalOrders, total] = await Promise.all([
        prisma.arrivalOrder.findMany({
          where,
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNo: true,
                supplierName: true
              }
            },
            location: {
              select: {
                id: true,
                name: true
              }
            },
            items: {
              include: {
                goods: {
                  select: {
                    id: true,
                    code: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit)
        }),
        prisma.arrivalOrder.count({ where })
      ])

      const result = {
        arrivalOrders: arrivalOrders.map(order => ({
          id: order.id,
          arrivalNo: order.arrivalNo,
          purchaseOrderId: order.purchaseOrderId,
          locationId: order.locationId,
          arrivalDate: order.arrivalDate.toISOString().split('T')[0],
          notes: order.notes || undefined,
          createdBy: order.createdBy,
          createdAt: order.createdAt,
          purchaseOrder: order.purchaseOrder,
          location: order.location,
          itemCount: order.items.length,
          totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0)
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }

      logger.info('获取到货入库单列表成功', {
        service: 'milicard-api',
        userId,
        resultCount: result.arrivalOrders.length
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取到货入库单列表失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '获取到货入库单列表失败'
      })
    }
  }

  // ================================
  // 调拨管理功能
  // ================================

  /**
   * 创建调拨单
   */
  static async createTransferOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        })
      }

      const result = await InventoryService.createTransferOrder(req.body, userId)

      logger.info('创建调拨单成功', {
        service: 'milicard-api',
        transferOrderId: result.id,
        transferNo: result.transferNo,
        userId,
        itemCount: result.items.length
      })

      res.status(201).json({
        success: true,
        data: result,
        message: '调拨单创建成功'
      })

    } catch (error) {
      logger.error('创建调拨单失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        requestData: req.body
      })

      if (error instanceof InventoryError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: error.type
        })
      }

      res.status(500).json({
        success: false,
        message: '创建调拨单失败'
      })
    }
  }

  /**
   * 确认调拨单
   */
  static async confirmTransferOrder(req: Request, res: Response) {
    try {
      const { transferOrderId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        })
      }

      const result = await InventoryService.confirmTransferOrder(transferOrderId, userId)

      logger.info('确认调拨单成功', {
        service: 'milicard-api',
        transferOrderId,
        userId
      })

      res.json({
        success: true,
        data: result,
        message: '调拨单确认成功'
      })

    } catch (error) {
      logger.error('确认调拨单失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        transferOrderId: req.params.transferOrderId,
        userId: req.user?.id
      })

      if (error instanceof InventoryError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          type: error.type
        })
      }

      res.status(500).json({
        success: false,
        message: '确认调拨单失败'
      })
    }
  }

  // ================================
  // 库存统计功能
  // ================================

  /**
   * 获取库存统计信息
   */
  static async getInventoryStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const {
        locationId,
        goodsId,
        startDate,
        endDate
      } = req.query

      // 基础统计查询
      const inventoryStats = await prisma.inventory.aggregate({
        where: {
          ...(locationId && { locationId: locationId as string }),
          ...(goodsId && { goodsId: goodsId as string })
        },
        _sum: {
          stockQuantity: true
        },
        _count: {
          id: true
        }
      })

      // 计算总价值
      const inventoryItems = await prisma.inventory.findMany({
        where: {
          ...(locationId && { locationId: locationId as string }),
          ...(goodsId && { goodsId: goodsId as string })
        },
        select: {
          stockQuantity: true,
          averageCost: true
        }
      })

      const totalValue = inventoryItems.reduce((sum, item) => 
        sum + (item.stockQuantity * Number(item.averageCost)), 0
      )

      // 低库存商品数量
      const lowStockCount = await prisma.inventory.count({
        where: {
          stockQuantity: { lt: 10 },
          ...(locationId && { locationId: locationId as string }),
          ...(goodsId && { goodsId: goodsId as string })
        }
      })

      // 零库存商品数量
      const outOfStockCount = await prisma.inventory.count({
        where: {
          stockQuantity: 0,
          ...(locationId && { locationId: locationId as string }),
          ...(goodsId && { goodsId: goodsId as string })
        }
      })

      // 库存价值最高的商品
      const topValueItems = await prisma.inventory.findMany({
        where: {
          ...(locationId && { locationId: locationId as string }),
          ...(goodsId && { goodsId: goodsId as string })
        },
        include: {
          goods: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        },
        orderBy: [
          {
            stockQuantity: 'desc'
          }
        ],
        take: 10
      })

      const result = {
        totalValue,
        totalItems: inventoryStats._count.id || 0,
        totalQuantity: inventoryStats._sum.stockQuantity || 0,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        topValueItems: topValueItems.map(item => ({
          goodsId: item.goodsId,
          goodsCode: item.goods.code,
          goodsName: typeof item.goods.name === 'string' 
            ? JSON.parse(item.goods.name) 
            : item.goods.name,
          stockQuantity: item.stockQuantity,
          averageCost: Number(item.averageCost),
          totalValue: item.stockQuantity * Number(item.averageCost)
        }))
      }

      logger.info('获取库存统计成功', {
        service: 'milicard-api',
        userId,
        params: req.query
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('获取库存统计失败', {
        service: 'milicard-api',
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        params: req.query
      })

      res.status(500).json({
        success: false,
        message: '获取库存统计失败'
      })
    }
  }
}

// 需要导入prisma实例
import { prisma } from '../utils/database'
