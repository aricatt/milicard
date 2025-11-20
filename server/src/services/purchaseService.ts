/**
 * 采购管理服务
 */

import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  PurchaseOrderQueryParams,
  PurchaseOrderResponse,
  PurchaseOrderListResponse,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseStatsResponse,
  PurchaseError,
  PurchaseErrorType
} from '../types/purchase'

export class PurchaseService {

  // ================================
  // 采购订单管理功能
  // ================================

  /**
   * 获取采购订单列表
   */
  static async getPurchaseOrderList(params: PurchaseOrderQueryParams): Promise<PurchaseOrderListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        locationId,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params

      const skip = (page - 1) * limit

      // 构建查询条件
      const where: any = {}

      if (search) {
        where.OR = [
          { orderNo: { contains: search, mode: 'insensitive' } },
          { supplierName: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (locationId) {
        where.targetLocationId = locationId
      }

      if (startDate || endDate) {
        where.purchaseDate = {}
        if (startDate) {
          where.purchaseDate.gte = new Date(startDate)
        }
        if (endDate) {
          where.purchaseDate.lte = new Date(endDate)
        }
      }

      // 执行查询
      const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            targetLocation: {
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
                    name: true,
                    boxQuantity: true,
                    packPerBox: true,
                    piecePerPack: true
                  }
                }
              }
            }
          }
        }),
        prisma.purchaseOrder.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      // 转换数据格式
      const formattedOrders: PurchaseOrderResponse[] = orders.map(order => ({
        id: order.id,
        orderNo: order.orderNo,
        supplierName: order.supplierName,
        targetLocationId: order.targetLocationId,
        targetLocation: order.targetLocation,
        purchaseDate: order.purchaseDate.toISOString().split('T')[0],
        totalAmount: Number(order.totalAmount),
        notes: order.notes || undefined,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          purchaseOrderId: item.purchaseOrderId,
          goodsId: item.goodsId,
          goods: item.goods,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          pieceQuantity: item.pieceQuantity,
          totalPieces: item.totalPieces,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          notes: item.notes || undefined
        }))
      }))

      logger.info('采购订单列表查询成功', {
        total,
        page,
        limit,
        filters: { search, locationId, startDate, endDate }
      })

      return {
        orders: formattedOrders,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      logger.error('获取采购订单列表失败', { error, params })
      throw error
    }
  }

  /**
   * 获取采购订单详情
   */
  static async getPurchaseOrderById(id: string): Promise<PurchaseOrderResponse> {
    try {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          targetLocation: {
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
                  name: true,
                  boxQuantity: true,
                  packPerBox: true,
                  piecePerPack: true
                }
              }
            }
          }
        }
      })

      if (!order) {
        throw new PurchaseError(
          PurchaseErrorType.PURCHASE_ORDER_NOT_FOUND,
          '采购订单不存在'
        )
      }

      // 转换数据格式
      const formattedOrder: PurchaseOrderResponse = {
        id: order.id,
        orderNo: order.orderNo,
        supplierName: order.supplierName,
        targetLocationId: order.targetLocationId,
        targetLocation: order.targetLocation,
        purchaseDate: order.purchaseDate.toISOString().split('T')[0],
        totalAmount: Number(order.totalAmount),
        notes: order.notes || undefined,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          purchaseOrderId: item.purchaseOrderId,
          goodsId: item.goodsId,
          goods: item.goods,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          pieceQuantity: item.pieceQuantity,
          totalPieces: item.totalPieces,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          notes: item.notes || undefined
        }))
      }

      logger.info('采购订单详情查询成功', { orderId: id })
      return formattedOrder
    } catch (error) {
      logger.error('获取采购订单详情失败', { error, orderId: id })
      throw error
    }
  }

  /**
   * 创建采购订单
   */
  static async createPurchaseOrder(data: CreatePurchaseOrderRequest, userId: string): Promise<PurchaseOrderResponse> {
    try {
      // 验证目标仓库是否存在
      const targetLocation = await prisma.location.findUnique({
        where: { id: data.targetLocationId }
      })

      if (!targetLocation) {
        throw new PurchaseError(
          PurchaseErrorType.INVALID_LOCATION,
          '目标仓库不存在'
        )
      }

      // 验证商品是否存在
      const goodsIds = data.items.map(item => item.goodsId)
      const goods = await prisma.goods.findMany({
        where: { id: { in: goodsIds } }
      })

      if (goods.length !== goodsIds.length) {
        throw new PurchaseError(
          PurchaseErrorType.INVALID_GOODS,
          '部分商品不存在'
        )
      }

      // 生成订单号
      const orderNo = await this.generateOrderNo()

      // 计算总金额和处理订单项
      let totalAmount = 0
      const processedItems = data.items.map(item => {
        // 计算总件数
        const totalPieces = item.boxQuantity + item.packQuantity + item.pieceQuantity
        const itemTotal = item.unitPrice * totalPieces
        totalAmount += itemTotal
        
        return {
          goodsId: item.goodsId,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          pieceQuantity: item.pieceQuantity,
          totalPieces: totalPieces,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          notes: item.notes
        }
      })

      // 创建采购订单
      const order = await prisma.purchaseOrder.create({
        data: {
          orderNo,
          supplierName: data.supplierName,
          targetLocationId: data.targetLocationId,
          purchaseDate: new Date(data.purchaseDate),
          totalAmount,
          notes: data.notes,
          createdBy: userId,
          items: {
            create: processedItems
          }
        },
        include: {
          targetLocation: {
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
                  name: true,
                  boxQuantity: true,
                  packPerBox: true,
                  piecePerPack: true
                }
              }
            }
          }
        }
      })

      logger.info('采购订单创建成功', {
        orderId: order.id,
        orderNo: order.orderNo,
        supplierName: order.supplierName,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
        userId
      })

      // 转换数据格式
      return {
        id: order.id,
        orderNo: order.orderNo,
        supplierName: order.supplierName,
        targetLocationId: order.targetLocationId,
        targetLocation: order.targetLocation,
        purchaseDate: order.purchaseDate.toISOString().split('T')[0],
        totalAmount: Number(order.totalAmount),
        notes: order.notes || undefined,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          purchaseOrderId: item.purchaseOrderId,
          goodsId: item.goodsId,
          goods: item.goods,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          pieceQuantity: item.pieceQuantity,
          totalPieces: item.totalPieces,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          notes: item.notes || undefined
        }))
      }
    } catch (error) {
      logger.error('创建采购订单失败', { error, data, userId })
      throw error
    }
  }

  /**
   * 更新采购订单
   */
  static async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderRequest, userId: string): Promise<PurchaseOrderResponse> {
    try {
      // 检查订单是否存在
      const existingOrder = await prisma.purchaseOrder.findUnique({
        where: { id }
      })

      if (!existingOrder) {
        throw new PurchaseError(
          PurchaseErrorType.PURCHASE_ORDER_NOT_FOUND,
          '采购订单不存在'
        )
      }

      // 验证目标仓库（如果提供）
      if (data.targetLocationId) {
        const targetLocation = await prisma.location.findUnique({
          where: { id: data.targetLocationId }
        })

        if (!targetLocation) {
          throw new PurchaseError(
            PurchaseErrorType.INVALID_LOCATION,
            '目标仓库不存在'
          )
        }
      }

      // 更新订单基本信息
      const updateData: any = {}
      if (data.supplierName !== undefined) updateData.supplierName = data.supplierName
      if (data.targetLocationId !== undefined) updateData.targetLocationId = data.targetLocationId
      if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate)
      if (data.notes !== undefined) updateData.notes = data.notes

      // 如果有订单项更新，需要重新计算总金额
      if (data.items && data.items.length > 0) {
        // 验证商品是否存在
        const goodsIds = data.items.map(item => item.goodsId)
        const goods = await prisma.goods.findMany({
          where: { id: { in: goodsIds } }
        })

        if (goods.length !== goodsIds.length) {
          throw new PurchaseError(
            PurchaseErrorType.INVALID_GOODS,
            '部分商品不存在'
          )
        }

        // 计算新的总金额
        let totalAmount = 0
        const processedItems = data.items.map(item => {
          const totalPieces = item.boxQuantity + item.packQuantity + item.pieceQuantity
          const itemTotal = item.unitPrice * totalPieces
          totalAmount += itemTotal
          
          return {
            goodsId: item.goodsId,
            boxQuantity: item.boxQuantity,
            packQuantity: item.packQuantity,
            pieceQuantity: item.pieceQuantity,
            totalPieces: totalPieces,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal,
            notes: item.notes
          }
        })

        updateData.totalAmount = totalAmount

        // 使用事务更新订单和订单项
        const order = await prisma.$transaction(async (tx) => {
          // 删除旧的订单项
          await tx.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: id }
          })

          // 更新订单并创建新的订单项
          return await tx.purchaseOrder.update({
            where: { id },
            data: {
              ...updateData,
              items: {
                create: processedItems
              }
            },
            include: {
              targetLocation: {
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
                      name: true,
                      boxQuantity: true,
                      packPerBox: true,
                      piecePerPack: true
                    }
                  }
                }
              }
            }
          })
        })

        logger.info('采购订单更新成功（包含订单项）', {
          orderId: id,
          userId,
          updatedFields: Object.keys(updateData),
          itemCount: processedItems.length
        })

        // 转换数据格式
        return {
          id: order.id,
          orderNo: order.orderNo,
          supplierName: order.supplierName,
          targetLocationId: order.targetLocationId,
          targetLocation: order.targetLocation,
          purchaseDate: order.purchaseDate.toISOString().split('T')[0],
          totalAmount: Number(order.totalAmount),
          notes: order.notes || undefined,
          createdBy: order.createdBy,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items.map(item => ({
            id: item.id,
            purchaseOrderId: item.purchaseOrderId,
            goodsId: item.goodsId,
            goods: item.goods,
            boxQuantity: item.boxQuantity,
            packQuantity: item.packQuantity,
            pieceQuantity: item.pieceQuantity,
            totalPieces: item.totalPieces,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            notes: item.notes || undefined
          }))
        }
      } else {
        // 只更新订单基本信息
        const order = await prisma.purchaseOrder.update({
          where: { id },
          data: updateData,
          include: {
            targetLocation: {
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
                    name: true,
                    boxQuantity: true,
                    packPerBox: true,
                    piecePerPack: true
                  }
                }
              }
            }
          }
        })

        logger.info('采购订单更新成功（仅基本信息）', {
          orderId: id,
          userId,
          updatedFields: Object.keys(updateData)
        })

        // 转换数据格式
        return {
          id: order.id,
          orderNo: order.orderNo,
          supplierName: order.supplierName,
          targetLocationId: order.targetLocationId,
          targetLocation: order.targetLocation,
          purchaseDate: order.purchaseDate.toISOString().split('T')[0],
          totalAmount: Number(order.totalAmount),
          notes: order.notes || undefined,
          createdBy: order.createdBy,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items.map(item => ({
            id: item.id,
            purchaseOrderId: item.purchaseOrderId,
            goodsId: item.goodsId,
            goods: item.goods,
            boxQuantity: item.boxQuantity,
            packQuantity: item.packQuantity,
            pieceQuantity: item.pieceQuantity,
            totalPieces: item.totalPieces,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            notes: item.notes || undefined
          }))
        }
      }
    } catch (error) {
      logger.error('更新采购订单失败', { error, orderId: id, data, userId })
      throw error
    }
  }

  /**
   * 删除采购订单
   */
  static async deletePurchaseOrder(id: string, userId: string): Promise<void> {
    try {
      // 检查订单是否存在
      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        select: {
          id: true,
          orderNo: true,
          arrivalOrders: {
            select: { id: true }
          }
        }
      })

      if (!order) {
        throw new PurchaseError(
          PurchaseErrorType.PURCHASE_ORDER_NOT_FOUND,
          '采购订单不存在'
        )
      }

      // 检查是否已有到货单，如果有则不能删除
      if (order.arrivalOrders.length > 0) {
        throw new PurchaseError(
          PurchaseErrorType.VALIDATION_ERROR,
          '该采购订单已有到货记录，不能删除'
        )
      }

      // 删除订单（级联删除订单项）
      await prisma.purchaseOrder.delete({
        where: { id }
      })

      logger.info('采购订单删除成功', {
        orderId: id,
        orderNo: order.orderNo,
        userId
      })
    } catch (error) {
      logger.error('删除采购订单失败', { error, orderId: id, userId })
      throw error
    }
  }

  /**
   * 获取采购统计
   */
  static async getPurchaseStats(params: any): Promise<PurchaseStatsResponse> {
    try {
      const { startDate, endDate, locationId } = params

      // 构建查询条件
      const where: any = {}
      if (startDate || endDate) {
        where.purchaseDate = {}
        if (startDate) {
          where.purchaseDate.gte = new Date(startDate)
        }
        if (endDate) {
          where.purchaseDate.lte = new Date(endDate)
        }
      }
      if (locationId) {
        where.targetLocationId = locationId
      }

      // 获取统计数据
      const [totalOrders, totalAmountResult, topSuppliers] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.aggregate({
          where,
          _sum: {
            totalAmount: true
          }
        }),
        prisma.purchaseOrder.groupBy({
          by: ['supplierName'],
          where,
          _count: {
            id: true
          },
          _sum: {
            totalAmount: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 10
        })
      ])

      const totalAmount = Number(totalAmountResult._sum.totalAmount || 0)

      // 获取月度统计（最近12个月）
      const monthlyStats = []
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        
        const monthWhere = {
          ...where,
          purchaseDate: {
            gte: monthStart,
            lte: monthEnd
          }
        }

        const [monthOrders, monthAmountResult] = await Promise.all([
          prisma.purchaseOrder.count({ where: monthWhere }),
          prisma.purchaseOrder.aggregate({
            where: monthWhere,
            _sum: {
              totalAmount: true
            }
          })
        ])

        monthlyStats.push({
          month: monthStart.toISOString().slice(0, 7), // YYYY-MM格式
          orderCount: monthOrders,
          totalAmount: Number(monthAmountResult._sum.totalAmount || 0)
        })
      }

      logger.info('采购统计查询成功', {
        totalOrders,
        totalAmount,
        topSuppliersCount: topSuppliers.length,
        params
      })

      return {
        totalOrders,
        totalAmount,
        pendingOrders: 0, // TODO: 实现状态管理后更新
        pendingAmount: 0,
        completedOrders: totalOrders,
        completedAmount: totalAmount,
        topSuppliers: topSuppliers.map(supplier => ({
          supplierId: '', // 当前使用supplierName，没有单独的supplier表
          supplierName: supplier.supplierName,
          orderCount: supplier._count.id,
          totalAmount: Number(supplier._sum.totalAmount || 0)
        })),
        monthlyStats
      }
    } catch (error) {
      logger.error('获取采购统计失败', { error, params })
      throw error
    }
  }

  // ================================
  // 辅助方法
  // ================================

  /**
   * 生成采购订单号
   */
  private static async generateOrderNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // 查找今天的最大订单号
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: {
        orderNo: {
          startsWith: `PO${dateStr}`
        }
      },
      orderBy: {
        orderNo: 'desc'
      }
    })

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNo.slice(-4))
      sequence = lastSequence + 1
    }

    return `PO${dateStr}${sequence.toString().padStart(4, '0')}`
  }
}
