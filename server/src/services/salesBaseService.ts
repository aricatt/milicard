import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 基地感知的销售服务类
 * 处理特定基地的销售管理
 */
export class SalesBaseService {
  /**
   * 获取基地的客户列表
   */
  static async getBaseCustomerList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, name, phone } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询SQL - 查询属于该基地或全局客户
      let sql = `
        SELECT 
          c.id,
          c.name,
          c.contact_person as "contactPerson",
          c.phone,
          c.email,
          c.address,
          c.notes,
          c.base_id as "baseId",
          c.is_active as "isActive",
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          b.name as "baseName"
        FROM customers c
        LEFT JOIN bases b ON c.base_id = b.id
        WHERE (c.base_id = ${baseId} OR c.base_id IS NULL)
        AND c.is_active = true
      `;

      // 添加过滤条件
      if (name) {
        sql += ` AND c.name ILIKE '%${name}%'`;
      }
      if (phone) {
        sql += ` AND c.phone ILIKE '%${phone}%'`;
      }

      sql += ` ORDER BY c.created_at DESC LIMIT ${pageSize} OFFSET ${skip}`;

      // 执行查询
      const customers = await prisma.$queryRawUnsafe(sql);

      // 获取总数
      let countSql = `
        SELECT COUNT(*) as count
        FROM customers c
        WHERE (c.base_id = ${baseId} OR c.base_id IS NULL)
        AND c.is_active = true
      `;

      if (name) {
        countSql += ` AND c.name ILIKE '%${name}%'`;
      }
      if (phone) {
        countSql += ` AND c.phone ILIKE '%${phone}%'`;
      }

      const totalResult = await prisma.$queryRawUnsafe(countSql);
      const total = Number((totalResult as any)[0]?.count || 0);

      // 转换数据格式
      const data = (customers as any[]).map(customer => ({
        id: customer.id,
        name: customer.name,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        baseId: customer.baseId,
        isActive: customer.isActive,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        baseName: customer.baseName || '全局客户'
      }));

      logger.info('获取基地客户列表成功', {
        service: 'milicard-api',
        baseId,
        count: data.length,
        total
      });

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取基地客户列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地的销售订单列表（分销订单）
   */
  static async getBaseDistributionOrderList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, orderNo, customerName, startDate, endDate } = params;
      const skip = (current - 1) * pageSize;

      // 由于DistributionOrder表还没有baseId字段，我们通过customer关联查询
      let sql = `
        SELECT 
          do.id,
          do.order_no as "orderNo",
          do.customer_id as "customerId",
          do.order_date as "orderDate",
          do.total_amount as "totalAmount",
          do.notes,
          do.created_by as "createdBy",
          do.created_at as "createdAt",
          do.updated_at as "updatedAt",
          c.name as "customerName",
          c.phone as "customerPhone"
        FROM distribution_orders do
        JOIN customers c ON do.customer_id = c.id
        WHERE (c.base_id = ${baseId} OR c.base_id IS NULL)
      `;

      // 添加过滤条件
      if (orderNo) {
        sql += ` AND do.order_no ILIKE '%${orderNo}%'`;
      }
      if (customerName) {
        sql += ` AND c.name ILIKE '%${customerName}%'`;
      }
      if (startDate) {
        sql += ` AND d.order_date >= '${startDate}'`;
      }
      if (endDate) {
        sql += ` AND d.order_date <= '${endDate}'`;
      }

      sql += ` ORDER BY do.created_at DESC LIMIT ${pageSize} OFFSET ${skip}`;

      // 执行查询
      const orders = await prisma.$queryRawUnsafe(sql);

      // 获取总数
      let countSql = `
        SELECT COUNT(*) as count
        FROM distribution_orders do
        JOIN customers c ON do.customer_id = c.id
        WHERE (c.base_id = ${baseId} OR c.base_id IS NULL)
      `;

      if (orderNo) {
        countSql += ` AND do.order_no ILIKE '%${orderNo}%'`;
      }
      if (customerName) {
        countSql += ` AND c.name ILIKE '%${customerName}%'`;
      }
      if (startDate) {
        countSql += ` AND d.order_date >= '${startDate}'`;
      }
      if (endDate) {
        countSql += ` AND d.order_date <= '${endDate}'`;
      }

      const totalResult = await prisma.$queryRawUnsafe(countSql);
      const total = Number((totalResult as any)[0]?.count || 0);

      // 转换数据格式
      const data = (orders as any[]).map(order => ({
        id: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId,
        orderDate: order.orderDate,
        totalAmount: Number(order.totalAmount),
        notes: order.notes,
        createdBy: order.createdBy,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        customer: {
          name: order.customerName,
          phone: order.customerPhone
        }
      }));

      logger.info('获取基地销售订单列表成功', {
        service: 'milicard-api',
        baseId,
        count: data.length,
        total
      });

      return {
        success: true,
        data,
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取基地销售订单列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建客户
   */
  static async createCustomer(baseId: number, customerData: any) {
    try {
      const { name, contactPerson, phone, email, address, notes } = customerData;

      // 检查客户名称是否已存在（在该基地范围内）
      const existingSql = `
        SELECT id FROM customers 
        WHERE name = '${name}' 
        AND (base_id = ${baseId} OR base_id IS NULL)
      `;
      const existingResult = await prisma.$queryRawUnsafe(existingSql);

      if ((existingResult as any[]).length > 0) {
        throw new Error('客户名称已存在');
      }

      // 创建客户
      const createSql = `
        INSERT INTO customers (
          id, name, contact_person, phone, email, address, notes, base_id, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${name}', ${contactPerson ? `'${contactPerson}'` : 'NULL'}, 
          ${phone ? `'${phone}'` : 'NULL'}, ${email ? `'${email}'` : 'NULL'}, 
          ${address ? `'${address}'` : 'NULL'}, ${notes ? `'${notes}'` : 'NULL'}, 
          ${baseId}, true, NOW(), NOW()
        ) RETURNING *
      `;

      const result = await prisma.$queryRawUnsafe(createSql);
      const customer = (result as any)[0];

      logger.info('创建客户成功', {
        service: 'milicard-api',
        baseId,
        customerId: customer.id,
        customerName: name
      });

      return {
        success: true,
        data: {
          id: customer.id,
          name: customer.name,
          contactPerson: customer.contact_person,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          notes: customer.notes,
          baseId: customer.base_id,
          isActive: customer.is_active
        }
      };
    } catch (error) {
      logger.error('创建客户失败', { error, baseId, customerData, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地销售统计
   */
  static async getBaseSalesStats(baseId: number, params: any = {}) {
    try {
      const { startDate, endDate } = params;

      let sql = `
        SELECT 
          COUNT(d.id) as "totalOrders",
          SUM(d.total_amount) as "totalAmount",
          COUNT(DISTINCT d.customer_id) as "uniqueCustomers",
          AVG(d.total_amount) as "averageAmount"
        FROM distribution_orders d
        JOIN customers c ON d.customer_id = c.id
        WHERE (c.base_id = ${baseId} OR c.base_id IS NULL)
      `;

      if (startDate) {
        sql += ` AND d.order_date >= '${startDate}'`;
      }
      if (endDate) {
        sql += ` AND d.order_date <= '${endDate}'`;
      }

      const statsResult = await prisma.$queryRawUnsafe(sql);
      const stats = (statsResult as any)[0];

      const result = {
        totalOrders: Number(stats.totalOrders || 0),
        totalAmount: Number(stats.totalAmount || 0),
        uniqueCustomers: Number(stats.uniqueCustomers || 0),
        averageAmount: Number(stats.averageAmount || 0)
      };

      logger.info('获取基地销售统计成功', {
        service: 'milicard-api',
        baseId,
        stats: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地销售统计失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }
}
