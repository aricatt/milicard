/**
 * 销售管理服务
 */

import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import {
  CustomerQueryParams,
  CustomerResponse,
  CustomerListResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  SalesOrderQueryParams,
  SalesOrderResponse,
  SalesOrderListResponse,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  SalesStatsResponse,
  SalesError,
  SalesErrorType,
  CustomerStatus
} from '../types/sales'

export class SalesService {

  // ================================
  // 客户管理功能
  // ================================

  /**
   * 获取客户列表
   */
  static async getCustomerList(params: CustomerQueryParams): Promise<CustomerListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params

      const skip = (page - 1) * limit

      // 构建查询条件
      const where: any = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }

      // 执行查询
      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
            address: true,
            notes: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.customer.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      // 转换数据格式
      const formattedCustomers: CustomerResponse[] = customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        code: '', // Schema中没有code字段
        type: 'individual' as any, // Schema中没有type字段，使用默认值
        contactPerson: customer.contactPerson || undefined,
        contactPhone: customer.phone || undefined,
        contactEmail: customer.email || undefined,
        address: customer.address || undefined,
        taxNumber: undefined, // Schema中没有taxNumber字段
        creditLimit: undefined, // Schema中没有creditLimit字段
        status: customer.isActive ? 'active' as any : 'inactive' as any,
        notes: customer.notes || undefined,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }))

      logger.info('客户列表查询成功', {
        total,
        page,
        limit,
        filters: { search }
      })

      return {
        customers: formattedCustomers,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      logger.error('获取客户列表失败', { error, params })
      throw error
    }
  }

  /**
   * 获取客户详情
   */
  static async getCustomerById(id: string): Promise<CustomerResponse> {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!customer) {
        throw new SalesError(
          SalesErrorType.CUSTOMER_NOT_FOUND,
          '客户不存在'
        )
      }

      // 转换数据格式
      const formattedCustomer: CustomerResponse = {
        id: customer.id,
        name: customer.name,
        code: '', // Schema中没有code字段
        type: 'individual' as any, // Schema中没有type字段，使用默认值
        contactPerson: customer.contactPerson || undefined,
        contactPhone: customer.phone || undefined,
        contactEmail: customer.email || undefined,
        address: customer.address || undefined,
        taxNumber: undefined, // Schema中没有taxNumber字段
        creditLimit: undefined, // Schema中没有creditLimit字段
        status: customer.isActive ? 'active' as any : 'inactive' as any,
        notes: customer.notes || undefined,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }

      logger.info('客户详情查询成功', { customerId: id })
      return formattedCustomer
    } catch (error) {
      logger.error('获取客户详情失败', { error, customerId: id })
      throw error
    }
  }

  /**
   * 创建客户
   */
  static async createCustomer(data: CreateCustomerRequest, userId: string): Promise<CustomerResponse> {
    try {
      // 创建客户
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.contactPhone,
          email: data.contactEmail,
          address: data.address,
          notes: data.notes,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      logger.info('客户创建成功', {
        customerId: customer.id,
        customerName: customer.name,
        userId
      })

      // 转换数据格式
      return {
        id: customer.id,
        name: customer.name,
        code: '', // Schema中没有code字段
        type: 'individual' as any, // Schema中没有type字段，使用默认值
        contactPerson: customer.contactPerson || undefined,
        contactPhone: customer.phone || undefined,
        contactEmail: customer.email || undefined,
        address: customer.address || undefined,
        taxNumber: undefined, // Schema中没有taxNumber字段
        creditLimit: undefined, // Schema中没有creditLimit字段
        status: customer.isActive ? 'active' as any : 'inactive' as any,
        notes: customer.notes || undefined,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }
    } catch (error) {
      logger.error('创建客户失败', { error, data, userId })
      throw error
    }
  }

  /**
   * 更新客户
   */
  static async updateCustomer(id: string, data: UpdateCustomerRequest, userId: string): Promise<CustomerResponse> {
    try {
      // 检查客户是否存在
      const existingCustomer = await prisma.customer.findUnique({
        where: { id }
      })

      if (!existingCustomer) {
        throw new SalesError(
          SalesErrorType.CUSTOMER_NOT_FOUND,
          '客户不存在'
        )
      }

      // 更新客户
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          name: data.name,
          contactPerson: data.contactPerson,
          phone: data.contactPhone,
          email: data.contactEmail,
          address: data.address,
          notes: data.notes,
          isActive: data.status === 'active'
        },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          notes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })

      logger.info('客户更新成功', {
        customerId: id,
        userId,
        updatedFields: Object.keys(data)
      })

      // 转换数据格式
      return {
        id: customer.id,
        name: customer.name,
        code: '', // Schema中没有code字段
        type: 'individual' as any, // Schema中没有type字段，使用默认值
        contactPerson: customer.contactPerson || undefined,
        contactPhone: customer.phone || undefined,
        contactEmail: customer.email || undefined,
        address: customer.address || undefined,
        taxNumber: undefined, // Schema中没有taxNumber字段
        creditLimit: undefined, // Schema中没有creditLimit字段
        status: customer.isActive ? 'active' as any : 'inactive' as any,
        notes: customer.notes || undefined,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }
    } catch (error) {
      logger.error('更新客户失败', { error, customerId: id, data, userId })
      throw error
    }
  }

  /**
   * 删除客户
   */
  static async deleteCustomer(id: string, userId: string): Promise<void> {
    try {
      // 检查客户是否存在
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          distributionOrders: true
        }
      })

      if (!customer) {
        throw new SalesError(
          SalesErrorType.CUSTOMER_NOT_FOUND,
          '客户不存在'
        )
      }

      // 检查是否有关联的销售订单
      if (customer.distributionOrders.length > 0) {
        // 如果有关联订单，只能停用，不能删除
        await prisma.customer.update({
          where: { id },
          data: {
            isActive: false
          }
        })

        logger.info('客户已停用（存在关联订单）', {
          customerId: id,
          orderCount: customer.distributionOrders.length,
          userId
        })
      } else {
        // 没有关联订单，可以直接删除
        await prisma.customer.delete({
          where: { id }
        })

        logger.info('客户删除成功', {
          customerId: id,
          userId
        })
      }
    } catch (error) {
      logger.error('删除客户失败', { error, customerId: id, userId })
      throw error
    }
  }

  // ================================
  // 销售订单管理功能
  // ================================

  /**
   * 获取销售订单列表
   */
  static async getSalesOrderList(params: SalesOrderQueryParams): Promise<SalesOrderListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        customerId,
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
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (customerId) {
        where.customerId = customerId
      }

      if (startDate || endDate) {
        where.orderDate = {}
        if (startDate) {
          where.orderDate.gte = new Date(startDate)
        }
        if (endDate) {
          where.orderDate.lte = new Date(endDate)
        }
      }

      // 执行查询
      const [orders, total] = await Promise.all([
        prisma.distributionOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                contactPerson: true,
                phone: true,
                email: true
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
          }
        }),
        prisma.distributionOrder.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      // 转换数据格式
      const formattedOrders: SalesOrderResponse[] = orders.map(order => ({
        id: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          code: '', // Schema中没有code字段
          type: 'individual' as any,
          contactPerson: order.customer.contactPerson || undefined,
          contactPhone: order.customer.phone || undefined,
          contactEmail: order.customer.email || undefined,
          address: undefined,
          taxNumber: undefined,
          creditLimit: undefined,
          status: 'active' as any,
          notes: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined,
        customerName: order.customer?.name || '',
        sourceLocationId: '', // Schema中没有sourceLocationId字段
        sourceLocation: undefined,
        orderDate: order.orderDate.toISOString().split('T')[0],
        deliveryDate: undefined, // Schema中没有deliveryDate字段
        totalAmount: Number(order.totalAmount),
        discountAmount: Number(order.discountPercent),
        finalAmount: Number(order.finalAmount),
        status: 'pending' as any, // Schema中没有status字段，使用默认值
        notes: order.notes || undefined,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          distributionOrderId: item.distributionOrderId,
          goodsId: item.goodsId,
          goods: item.goods,
          boxQuantity: 0, // Schema使用单一quantity字段
          packQuantity: 0,
          pieceQuantity: item.quantity,
          totalPieces: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          discount: Number(item.discountPercent),
          finalPrice: Number(item.finalUnitPrice),
          notes: item.notes || undefined
        }))
      }))

      logger.info('销售订单列表查询成功', {
        total,
        page,
        limit,
        filters: { search, customerId, startDate, endDate }
      })

      return {
        orders: formattedOrders,
        total,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      logger.error('获取销售订单列表失败', { error, params })
      throw error
    }
  }

  /**
   * 获取销售订单详情
   */
  static async getSalesOrderById(id: string): Promise<SalesOrderResponse> {
    try {
      const order = await prisma.distributionOrder.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              contactPerson: true,
              phone: true,
              email: true
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
        }
      })

      if (!order) {
        throw new SalesError(
          SalesErrorType.SALES_ORDER_NOT_FOUND,
          '销售订单不存在'
        )
      }

      // 转换数据格式
      const formattedOrder: SalesOrderResponse = {
        id: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          code: '', // Schema中没有code字段
          type: 'individual' as any,
          contactPerson: order.customer.contactPerson || undefined,
          contactPhone: order.customer.phone || undefined,
          contactEmail: order.customer.email || undefined,
          address: undefined,
          taxNumber: undefined,
          creditLimit: undefined,
          status: 'active' as any,
          notes: undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined,
        customerName: order.customer?.name || '',
        sourceLocationId: '', // Schema中没有sourceLocationId字段
        sourceLocation: undefined,
        orderDate: order.orderDate.toISOString().split('T')[0],
        deliveryDate: undefined, // Schema中没有deliveryDate字段
        totalAmount: Number(order.totalAmount),
        discountAmount: Number(order.discountPercent),
        finalAmount: Number(order.finalAmount),
        status: 'pending' as any, // Schema中没有status字段，使用默认值
        notes: order.notes || undefined,
        createdBy: order.createdBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          distributionOrderId: item.distributionOrderId,
          goodsId: item.goodsId,
          goods: item.goods,
          boxQuantity: 0, // Schema使用单一quantity字段
          packQuantity: 0,
          pieceQuantity: item.quantity,
          totalPieces: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          discount: Number(item.discountPercent),
          finalPrice: Number(item.finalUnitPrice),
          notes: item.notes || undefined
        }))
      }

      logger.info('销售订单详情查询成功', { orderId: id })
      return formattedOrder
    } catch (error) {
      logger.error('获取销售订单详情失败', { error, orderId: id })
      throw error
    }
  }

  /**
   * 获取销售统计
   */
  static async getSalesStats(params: any): Promise<SalesStatsResponse> {
    try {
      // TODO: 实现销售统计逻辑
      logger.info('销售统计功能暂未实现', { params })
      
      return {
        totalOrders: 0,
        totalAmount: 0,
        pendingOrders: 0,
        pendingAmount: 0,
        completedOrders: 0,
        completedAmount: 0,
        topCustomers: [],
        monthlyStats: []
      }
    } catch (error) {
      logger.error('获取销售统计失败', { error, params })
      throw error
    }
  }

  // ================================
  // 辅助方法
  // ================================

  /**
   * 生成销售订单号
   */
  private static async generateOrderNo(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // 查找今天的最大订单号
    const lastOrder = await prisma.distributionOrder.findFirst({
      where: {
        orderNo: {
          startsWith: `SO${dateStr}`
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

    return `SO${dateStr}${sequence.toString().padStart(4, '0')}`
  }

  /**
   * 解析多语言文本
   */
  private static parseMultilingualText(text: string | null): string {
    if (!text) return ''
    
    try {
      const parsed = JSON.parse(text)
      return parsed.zh_CN || parsed.en_US || Object.values(parsed)[0] || ''
    } catch {
      return text
    }
  }
}
