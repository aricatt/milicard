import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';

/**
 * 基地感知的采购服务类
 * 处理特定基地的采购管理
 */
export class PurchaseBaseService {
  /**
   * 获取基地的采购订单列表
   */
  static async getBasePurchaseOrderList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, orderNo, supplierName, startDate, endDate } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询SQL
      let sql = `
        SELECT 
          po.id,
          po.order_no as "orderNo",
          po.supplier_name as "supplierName",
          po.target_location_id as "targetLocationId",
          po.base_id as "baseId",
          po.purchase_date as "purchaseDate",
          po.total_amount as "totalAmount",
          po.notes,
          po.created_by as "createdBy",
          po.created_at as "createdAt",
          po.updated_at as "updatedAt",
          l.name as "locationName",
          l.type as "locationType",
          b.name as "baseName"
        FROM purchase_orders po
        JOIN locations l ON po.target_location_id = l.id
        JOIN bases b ON po.base_id = b.id
        WHERE po.base_id = ${baseId}
      `;

      // 添加过滤条件
      if (orderNo) {
        sql += ` AND po.order_no ILIKE '%${orderNo}%'`;
      }
      if (supplierName) {
        sql += ` AND po.supplier_name ILIKE '%${supplierName}%'`;
      }
      if (startDate) {
        sql += ` AND po.purchase_date >= '${startDate}'`;
      }
      if (endDate) {
        sql += ` AND po.purchase_date <= '${endDate}'`;
      }

      sql += ` ORDER BY po.created_at DESC LIMIT ${pageSize} OFFSET ${skip}`;

      // 执行查询
      const purchaseOrders = await prisma.$queryRawUnsafe(sql);

      // 获取总数
      let countSql = `
        SELECT COUNT(*) as count
        FROM purchase_orders po
        WHERE po.base_id = ${baseId}
      `;

      if (orderNo) {
        countSql += ` AND po.order_no ILIKE '%${orderNo}%'`;
      }
      if (supplierName) {
        countSql += ` AND po.supplier_name ILIKE '%${supplierName}%'`;
      }
      if (startDate) {
        countSql += ` AND po.purchase_date >= '${startDate}'`;
      }
      if (endDate) {
        countSql += ` AND po.purchase_date <= '${endDate}'`;
      }

      const totalResult = await prisma.$queryRawUnsafe(countSql);
      const total = Number((totalResult as any)[0]?.count || 0);

      // 转换数据格式
      const data = (purchaseOrders as any[]).map(po => ({
        id: po.id,
        orderNo: po.orderNo,
        supplierName: po.supplierName,
        targetLocationId: po.targetLocationId,
        baseId: po.baseId,
        purchaseDate: po.purchaseDate,
        totalAmount: Number(po.totalAmount),
        notes: po.notes,
        createdBy: po.createdBy,
        createdAt: po.createdAt.toISOString(),
        updatedAt: po.updatedAt.toISOString(),
        location: {
          name: po.locationName,
          type: po.locationType
        },
        base: {
          name: po.baseName
        }
      }));

      logger.info('获取基地采购订单列表成功', {
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
      logger.error('获取基地采购订单列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建采购订单
   */
  static async createPurchaseOrder(baseId: number, orderData: any) {
    try {
      const { supplierName, targetLocationId, purchaseDate, notes, items = [] } = orderData;

      // 检查目标位置是否属于该基地
      const locationSql = `
        SELECT id, name FROM locations 
        WHERE id = '${targetLocationId}' AND base_id = ${baseId}
      `;
      const locationResult = await prisma.$queryRawUnsafe(locationSql);

      if ((locationResult as any[]).length === 0) {
        throw new Error('目标位置不存在或不属于该基地');
      }

      // 生成采购订单号
      const orderNo = await CodeGenerator.generatePurchaseOrderCode();

      // 计算总金额
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += (item.quantity || 0) * (item.unitPrice || 0);
      }

      // 创建采购订单（不包含created_by外键约束）
      const createSql = `
        INSERT INTO purchase_orders (
          id, order_no, supplier_name, target_location_id, base_id, 
          purchase_date, total_amount, notes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${orderNo}', '${supplierName}', '${targetLocationId}', ${baseId},
          '${purchaseDate}', ${totalAmount}, ${notes ? `'${notes}'` : 'NULL'}, NOW(), NOW()
        ) RETURNING *
      `;

      const result = await prisma.$queryRawUnsafe(createSql);
      const purchaseOrder = (result as any)[0];

      // 创建采购订单项目
      for (const item of items) {
        const itemSql = `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, goods_id, box_quantity, pack_quantity, 
            piece_quantity, unit_price, total_price, notes
          ) VALUES (
            gen_random_uuid(), '${purchaseOrder.id}', '${item.goodsId}', 
            ${item.boxQuantity || 0}, ${item.packQuantity || 0}, ${item.pieceQuantity || 0},
            ${item.unitPrice || 0}, ${(item.quantity || 0) * (item.unitPrice || 0)}, 
            ${item.notes ? `'${item.notes}'` : 'NULL'}
          )
        `;
        await prisma.$queryRawUnsafe(itemSql);
      }

      logger.info('创建采购订单成功', {
        service: 'milicard-api',
        baseId,
        orderId: purchaseOrder.id,
        orderNo,
        totalAmount
      });

      return {
        success: true,
        data: {
          id: purchaseOrder.id,
          orderNo,
          supplierName,
          targetLocationId,
          baseId,
          purchaseDate,
          totalAmount,
          notes,
          itemCount: items.length
        }
      };
    } catch (error) {
      logger.error('创建采购订单失败', { error, baseId, orderData, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地的采购统计
   */
  static async getBasePurchaseStats(baseId: number, params: any = {}) {
    try {
      const { startDate, endDate } = params;

      let sql = `
        SELECT 
          COUNT(*) as "totalOrders",
          SUM(total_amount) as "totalAmount",
          COUNT(DISTINCT supplier_name) as "uniqueSuppliers",
          AVG(total_amount) as "averageAmount"
        FROM purchase_orders
        WHERE base_id = ${baseId}
      `;

      if (startDate) {
        sql += ` AND purchase_date >= '${startDate}'`;
      }
      if (endDate) {
        sql += ` AND purchase_date <= '${endDate}'`;
      }

      const statsResult = await prisma.$queryRawUnsafe(sql);
      const stats = (statsResult as any)[0];

      const result = {
        totalOrders: Number(stats.totalOrders || 0),
        totalAmount: Number(stats.totalAmount || 0),
        uniqueSuppliers: Number(stats.uniqueSuppliers || 0),
        averageAmount: Number(stats.averageAmount || 0)
      };

      logger.info('获取基地采购统计成功', {
        service: 'milicard-api',
        baseId,
        stats: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地采购统计失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地的供应商列表
   */
  static async getBaseSuppliers(baseId: number) {
    try {
      const sql = `
        SELECT DISTINCT 
          s.id,
          s.code,
          s.name,
          s.contact_person as "contactPerson",
          s.phone,
          s.email,
          sb.payment_terms as "paymentTerms",
          sb.credit_limit as "creditLimit"
        FROM suppliers s
        JOIN supplier_bases sb ON s.id = sb.supplier_id
        WHERE sb.base_id = ${baseId} AND sb.is_active = true
        ORDER BY s.name ASC
      `;

      const suppliers = await prisma.$queryRawUnsafe(sql);

      logger.info('获取基地供应商列表成功', {
        service: 'milicard-api',
        baseId,
        count: (suppliers as any[]).length
      });

      return {
        success: true,
        data: suppliers
      };
    } catch (error) {
      logger.error('获取基地供应商列表失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建基地供应商
   */
  static async createBaseSupplier(baseId: number, supplierData: any) {
    try {
      // 生成供应商编号
      const code = await this.generateSupplierCode();

      // 创建供应商
      const supplier = await prisma.supplier.create({
        data: {
          code,
          name: supplierData.name,
          contactPerson: supplierData.contactPerson,
          phone: supplierData.phone,
          email: supplierData.email,
          address: supplierData.address,
          notes: supplierData.notes,
          isActive: true,
        }
      });

      // 创建供应商与基地的关联
      await prisma.supplierBase.create({
        data: {
          supplierId: supplier.id,
          baseId: baseId,
          paymentTerms: 'NET_30', // 默认付款条件
          creditLimit: 0,
          isActive: true,
        }
      });

      logger.info('创建基地供应商成功', {
        service: 'milicard-api',
        baseId,
        supplierId: supplier.id,
        supplierName: supplier.name
      });

      return {
        success: true,
        data: {
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          notes: supplier.notes,
          isActive: true,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        }
      };
    } catch (error) {
      logger.error('创建基地供应商失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 生成供应商编号
   */
  private static async generateSupplierCode(): Promise<string> {
    const prefix = 'SUP';
    const charset = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      let randomStr = '';
      for (let i = 0; i < 8; i++) {
        randomStr += charset[Math.floor(Math.random() * charset.length)];
      }
      code = `${prefix}-${randomStr}`;

      // 检查编号是否已存在
      const existing = await prisma.supplier.findUnique({
        where: { code }
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return code!;
  }
}
