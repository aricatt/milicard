// 库存管理服务

import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  InventoryQueryParams,
  InventoryListResponse,
  CreateArrivalOrderRequest,
  ArrivalOrderResponse,
  CreateTransferOrderRequest,
  TransferOrderResponse,
  InventoryAdjustmentRequest,
  InventoryAdjustmentResponse,
  InventoryStatsRequest,
  InventoryStatsResponse,
  CreateStockTakeRequest,
  StockTakeResponse,
  InventoryError,
  InventoryErrorType,
  InventoryOperationType,
  TransferOrderStatus
} from '../types/inventory'
import { MultilingualText } from '../types/multilingualData'

export class InventoryService {
  
  // ================================
  // 库存查询功能
  // ================================

  /**
   * 获取库存列表
   */
  static async getInventoryList(params: InventoryQueryParams): Promise<InventoryListResponse> {
    try {
      const {
        goodsId,
        locationId,
        goodsCode,
        search,
        minStock,
        maxStock,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = params

      // 构建查询条件
      const where: any = {}

      if (goodsId) {
        where.goodsId = goodsId
      }

      if (locationId) {
        where.locationId = locationId
      }

      if (goodsCode) {
        where.goods = {
          code: { contains: goodsCode, mode: 'insensitive' }
        }
      }

      if (search) {
        where.OR = [
          {
            goods: {
              code: { contains: search, mode: 'insensitive' }
            }
          },
          {
            location: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        ]
      }

      if (minStock !== undefined || maxStock !== undefined) {
        where.stockQuantity = {}
        if (minStock !== undefined) {
          where.stockQuantity.gte = minStock
        }
        if (maxStock !== undefined) {
          where.stockQuantity.lte = maxStock
        }
      }

      // 排序处理
      const orderBy: any = {}
      if (sortBy === 'goodsCode') {
        orderBy.goods = { code: sortOrder }
      } else {
        orderBy[sortBy] = sortOrder
      }

      // 查询库存数据
      const [inventory, total] = await Promise.all([
        prisma.inventory.findMany({
          where,
          include: {
            goods: {
              select: {
                id: true,
                code: true,
                name: true,
                retailPrice: true,
                purchasePrice: true,
                boxQuantity: true,
                packPerBox: true,
                piecePerPack: true
              }
            },
            location: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.inventory.count({ where })
      ])

      // 计算统计信息
      const totalValue = inventory.reduce((sum, item) => 
        sum + (item.stockQuantity * Number(item.averageCost)), 0
      )
      const lowStockItems = inventory.filter(item => item.stockQuantity < 10).length

      // 格式化响应数据
      const formattedInventory = inventory.map(item => ({
        id: item.id,
        goodsId: item.goodsId,
        locationId: item.locationId,
        stockQuantity: item.stockQuantity,
        averageCost: Number(item.averageCost),
        updatedAt: item.updatedAt,
        goods: {
          id: item.goods.id,
          code: item.goods.code,
          name: this.parseMultilingualText(item.goods.name),
          retailPrice: Number(item.goods.retailPrice),
          purchasePrice: Number(item.goods.purchasePrice),
          boxQuantity: item.goods.boxQuantity,
          packPerBox: item.goods.packPerBox,
          piecePerPack: item.goods.piecePerPack
        },
        location: item.location
      }))

      return {
        inventory: formattedInventory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          totalItems: inventory.length,
          totalValue,
          lowStockItems
        }
      }

    } catch (error) {
      logger.error('获取库存列表失败', { error, params })
      throw error
    }
  }

  /**
   * 获取单个商品的库存信息
   */
  static async getGoodsInventory(goodsId: string) {
    try {
      const inventory = await prisma.inventory.findMany({
        where: { goodsId },
        include: {
          location: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          location: { name: 'asc' }
        }
      })

      const totalStock = inventory.reduce((sum, item) => sum + item.stockQuantity, 0)
      const totalValue = inventory.reduce((sum, item) => 
        sum + (item.stockQuantity * Number(item.averageCost)), 0
      )

      return {
        goodsId,
        totalStock,
        totalValue,
        locations: inventory.map(item => ({
          locationId: item.locationId,
          locationName: item.location.name,
          stockQuantity: item.stockQuantity,
          averageCost: Number(item.averageCost),
          value: item.stockQuantity * Number(item.averageCost),
          updatedAt: item.updatedAt
        }))
      }

    } catch (error) {
      logger.error('获取商品库存失败', { error, goodsId })
      throw error
    }
  }

  // ================================
  // 到货入库功能
  // ================================

  /**
   * 创建到货入库单
   */
  static async createArrivalOrder(data: CreateArrivalOrderRequest, userId: string): Promise<ArrivalOrderResponse> {
    try {
      // 验证采购订单是否存在
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        select: {
          id: true,
          orderNo: true,
          supplierName: true
        }
      })

      if (!purchaseOrder) {
        throw new InventoryError(
          InventoryErrorType.PURCHASE_ORDER_NOT_FOUND,
          '采购订单不存在'
        )
      }

      // 验证仓库是否存在
      const location = await prisma.location.findUnique({
        where: { id: data.locationId },
        select: { id: true, name: true }
      })

      if (!location) {
        throw new InventoryError(
          InventoryErrorType.INVALID_LOCATION,
          '仓库不存在'
        )
      }

      // 生成到货单号
      const arrivalNo = data.arrivalNo || await this.generateArrivalNo()

      // 检查到货单号是否重复
      const existingArrival = await prisma.arrivalOrder.findUnique({
        where: { arrivalNo }
      })

      if (existingArrival) {
        throw new InventoryError(
          InventoryErrorType.DUPLICATE_ARRIVAL_NO,
          `到货单号 ${arrivalNo} 已存在`
        )
      }

      // 验证商品是否存在
      const goodsIds = data.items.map(item => item.goodsId)
      const goods = await prisma.goods.findMany({
        where: { id: { in: goodsIds } },
        select: { id: true, code: true, name: true }
      })

      if (goods.length !== goodsIds.length) {
        throw new InventoryError(
          InventoryErrorType.INVALID_GOODS,
          '部分商品不存在'
        )
      }

      // 创建到货入库单
      const arrivalOrder = await prisma.$transaction(async (tx) => {
        // 创建到货单
        const arrival = await tx.arrivalOrder.create({
          data: {
            arrivalNo,
            purchaseOrderId: data.purchaseOrderId,
            locationId: data.locationId,
            arrivalDate: new Date(data.arrivalDate),
            notes: data.notes,
            createdBy: userId,
            items: {
              create: data.items.map(item => ({
                goodsId: item.goodsId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                notes: item.notes
              }))
            }
          },
          include: {
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
          }
        })

        // 更新库存
        for (const item of data.items) {
          await this.updateInventory(tx, {
            goodsId: item.goodsId,
            locationId: data.locationId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            operation: InventoryOperationType.ARRIVAL
          })
        }

        return arrival
      })

      logger.info('到货入库单创建成功', {
        service: 'milicard-api',
        arrivalOrderId: arrivalOrder.id,
        arrivalNo: arrivalOrder.arrivalNo,
        userId
      })

      // 格式化响应数据
      return {
        id: arrivalOrder.id,
        arrivalNo: arrivalOrder.arrivalNo,
        purchaseOrderId: arrivalOrder.purchaseOrderId,
        locationId: arrivalOrder.locationId,
        arrivalDate: arrivalOrder.arrivalDate.toISOString().split('T')[0],
        notes: arrivalOrder.notes || undefined,
        createdBy: arrivalOrder.createdBy,
        createdAt: arrivalOrder.createdAt,
        items: arrivalOrder.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          notes: item.notes || undefined,
          goods: {
            id: item.goods.id,
            code: item.goods.code,
            name: this.parseMultilingualText(item.goods.name)
          }
        })),
        purchaseOrder,
        location
      }

    } catch (error) {
      logger.error('创建到货入库单失败', { error, data, userId })
      throw error
    }
  }

  // ================================
  // 调拨管理功能
  // ================================

  /**
   * 创建调拨单
   */
  static async createTransferOrder(data: CreateTransferOrderRequest, userId: string): Promise<TransferOrderResponse> {
    try {
      // 验证调出和调入仓库不能相同
      if (data.fromLocationId === data.toLocationId) {
        throw new InventoryError(
          InventoryErrorType.INVALID_TRANSFER,
          '调出仓库和调入仓库不能相同'
        )
      }

      // 验证仓库是否存在
      const [fromLocation, toLocation] = await Promise.all([
        prisma.location.findUnique({
          where: { id: data.fromLocationId },
          select: { id: true, name: true }
        }),
        prisma.location.findUnique({
          where: { id: data.toLocationId },
          select: { id: true, name: true }
        })
      ])

      if (!fromLocation) {
        throw new InventoryError(
          InventoryErrorType.INVALID_LOCATION,
          '调出仓库不存在'
        )
      }

      if (!toLocation) {
        throw new InventoryError(
          InventoryErrorType.INVALID_LOCATION,
          '调入仓库不存在'
        )
      }

      // 生成调拨单号
      const transferNo = data.transferNo || await this.generateTransferNo()

      // 检查调拨单号是否重复
      const existingTransfer = await prisma.transferOrder.findUnique({
        where: { transferNo }
      })

      if (existingTransfer) {
        throw new InventoryError(
          InventoryErrorType.DUPLICATE_TRANSFER_NO,
          `调拨单号 ${transferNo} 已存在`
        )
      }

      // 验证库存是否充足
      for (const item of data.items) {
        const inventory = await prisma.inventory.findUnique({
          where: {
            goodsId_locationId: {
              goodsId: item.goodsId,
              locationId: data.fromLocationId
            }
          }
        })

        if (!inventory || inventory.stockQuantity < item.quantity) {
          const goods = await prisma.goods.findUnique({
            where: { id: item.goodsId },
            select: { code: true }
          })
          throw new InventoryError(
            InventoryErrorType.INSUFFICIENT_STOCK,
            `商品 ${goods?.code} 库存不足，当前库存：${inventory?.stockQuantity || 0}，需要：${item.quantity}`
          )
        }
      }

      // 创建调拨单
      const transferOrder = await prisma.transferOrder.create({
        data: {
          transferNo,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          transferDate: new Date(data.transferDate),
          notes: data.notes,
          createdBy: userId,
          items: {
            create: data.items.map(item => ({
              goodsId: item.goodsId,
              quantity: item.quantity,
              notes: item.notes
            }))
          }
        },
        include: {
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
        }
      })

      logger.info('调拨单创建成功', {
        service: 'milicard-api',
        transferOrderId: transferOrder.id,
        transferNo: transferOrder.transferNo,
        userId
      })

      // 格式化响应数据
      return {
        id: transferOrder.id,
        transferNo: transferOrder.transferNo,
        fromLocationId: transferOrder.fromLocationId,
        toLocationId: transferOrder.toLocationId,
        transferDate: transferOrder.transferDate.toISOString().split('T')[0],
        notes: transferOrder.notes || undefined,
        status: TransferOrderStatus.PENDING,
        createdBy: transferOrder.createdBy,
        createdAt: transferOrder.createdAt,
        items: transferOrder.items.map(item => ({
          id: item.id,
          goodsId: item.goodsId,
          quantity: item.quantity,
          notes: item.notes || undefined,
          goods: {
            id: item.goods.id,
            code: item.goods.code,
            name: this.parseMultilingualText(item.goods.name)
          }
        })),
        fromLocation,
        toLocation
      }

    } catch (error) {
      logger.error('创建调拨单失败', { error, data, userId })
      throw error
    }
  }

  /**
   * 确认调拨单（执行库存转移）
   */
  static async confirmTransferOrder(transferOrderId: string, userId: string) {
    try {
      const transferOrder = await prisma.transferOrder.findUnique({
        where: { id: transferOrderId },
        include: {
          items: true
        }
      })

      if (!transferOrder) {
        throw new InventoryError(
          InventoryErrorType.INVENTORY_NOT_FOUND,
          '调拨单不存在'
        )
      }

      // 执行库存转移
      await prisma.$transaction(async (tx) => {
        for (const item of transferOrder.items) {
          // 调出库存
          await this.updateInventory(tx, {
            goodsId: item.goodsId,
            locationId: transferOrder.fromLocationId,
            quantity: -item.quantity,
            operation: InventoryOperationType.TRANSFER_OUT
          })

          // 调入库存
          await this.updateInventory(tx, {
            goodsId: item.goodsId,
            locationId: transferOrder.toLocationId,
            quantity: item.quantity,
            operation: InventoryOperationType.TRANSFER_IN
          })
        }
      })

      logger.info('调拨单确认成功', {
        service: 'milicard-api',
        transferOrderId,
        userId
      })

      return { success: true, message: '调拨单确认成功' }

    } catch (error) {
      logger.error('确认调拨单失败', { error, transferOrderId, userId })
      throw error
    }
  }

  // ================================
  // 辅助方法
  // ================================

  /**
   * 更新库存
   */
  private static async updateInventory(tx: any, params: {
    goodsId: string
    locationId: string
    quantity: number
    unitCost?: number
    operation: InventoryOperationType
  }) {
    const { goodsId, locationId, quantity, unitCost, operation } = params

    // 查找现有库存记录
    const existingInventory = await tx.inventory.findUnique({
      where: {
        goodsId_locationId: {
          goodsId,
          locationId
        }
      }
    })

    if (existingInventory) {
      // 更新现有库存
      const newQuantity = existingInventory.stockQuantity + quantity
      
      if (newQuantity < 0) {
        throw new InventoryError(
          InventoryErrorType.INSUFFICIENT_STOCK,
          '库存不足，无法执行操作'
        )
      }

      // 计算新的平均成本（如果是入库操作）
      let newAverageCost = existingInventory.averageCost
      if (quantity > 0 && unitCost !== undefined) {
        const totalValue = Number(existingInventory.averageCost) * existingInventory.stockQuantity + unitCost * quantity
        newAverageCost = newQuantity > 0 ? totalValue / newQuantity : 0
      }

      await tx.inventory.update({
        where: {
          goodsId_locationId: {
            goodsId,
            locationId
          }
        },
        data: {
          stockQuantity: newQuantity,
          averageCost: newAverageCost
        }
      })
    } else {
      // 创建新的库存记录
      if (quantity < 0) {
        throw new InventoryError(
          InventoryErrorType.INSUFFICIENT_STOCK,
          '库存不存在，无法执行出库操作'
        )
      }

      await tx.inventory.create({
        data: {
          goodsId,
          locationId,
          stockQuantity: quantity,
          averageCost: unitCost || 0
        }
      })
    }
  }

  /**
   * 生成到货单号
   */
  private static async generateArrivalNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    const lastOrder = await prisma.arrivalOrder.findFirst({
      where: {
        arrivalNo: {
          startsWith: `ARR${dateStr}`
        }
      },
      orderBy: {
        arrivalNo: 'desc'
      }
    })

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.arrivalNo.slice(-4))
      sequence = lastSequence + 1
    }

    return `ARR${dateStr}${sequence.toString().padStart(4, '0')}`
  }

  /**
   * 生成调拨单号
   */
  private static async generateTransferNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    const lastOrder = await prisma.transferOrder.findFirst({
      where: {
        transferNo: {
          startsWith: `TRF${dateStr}`
        }
      },
      orderBy: {
        transferNo: 'desc'
      }
    })

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.transferNo.slice(-4))
      sequence = lastSequence + 1
    }

    return `TRF${dateStr}${sequence.toString().padStart(4, '0')}`
  }

  /**
   * 解析多语言文本
   */
  private static parseMultilingualText(text: any): MultilingualText {
    if (typeof text === 'string') {
      try {
        return JSON.parse(text)
      } catch {
        return { zh_CN: text }
      }
    }
    return text || { zh_CN: '' }
  }
}
