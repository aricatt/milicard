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

      // 构建查询SQL - 关联订单明细和商品信息
      let sql = `
        SELECT 
          poi.id,
          po.code as "orderNo",
          po.supplier_name as "supplierName",
          po.base_id as "baseId",
          po.purchase_date as "purchaseDate",
          po.created_by as "createdBy",
          po.created_at as "createdAt",
          g.code as "goodsCode",
          g.name as "goodsName",
          g.retail_price as "retailPrice",
          g.pack_per_box as "packPerBox",
          g.piece_per_pack as "piecePerPack",
          poi.box_quantity as "purchaseBoxQty",
          poi.pack_quantity as "purchasePackQty",
          poi.piece_quantity as "purchasePieceQty",
          poi.unit_price as "unitPrice",
          poi.total_pieces as "totalPieces",
          poi.total_price as "totalAmount"
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN goods g ON poi.goods_id = g.id
        WHERE po.base_id = ${baseId}
      `;

      // 添加过滤条件
      if (orderNo) {
        sql += ` AND po.code ILIKE '%${orderNo}%'`;
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

      sql += ` ORDER BY po.created_at DESC, poi.id LIMIT ${pageSize} OFFSET ${skip}`;

      // 执行查询
      const purchaseItems = await prisma.$queryRawUnsafe(sql);

      // 获取总数（按明细行计数）
      let countSql = `
        SELECT COUNT(*) as count
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.base_id = ${baseId}
      `;

      if (orderNo) {
        countSql += ` AND po.code ILIKE '%${orderNo}%'`;
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

      // 转换数据格式 - 计算单价
      const data = (purchaseItems as any[]).map(item => {
        const packPerBox = Number(item.packPerBox) || 1;
        const piecePerPack = Number(item.piecePerPack) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        
        // 计算各级单价（假设unitPrice是箱单价）
        const unitPriceBox = unitPrice;
        const unitPricePack = unitPrice / packPerBox;
        const unitPricePiece = unitPricePack / piecePerPack;
        
        return {
          id: item.id,
          orderNo: item.orderNo,
          supplierName: item.supplierName,
          baseId: item.baseId,
          purchaseDate: item.purchaseDate,
          goodsCode: item.goodsCode,
          goodsName: item.goodsName,
          retailPrice: Number(item.retailPrice),
          purchaseBoxQty: Number(item.purchaseBoxQty),
          purchasePackQty: Number(item.purchasePackQty),
          purchasePieceQty: Number(item.purchasePieceQty),
          unitPriceBox,
          unitPricePack,
          unitPricePiece,
          totalAmount: Number(item.totalAmount),
          createdBy: item.createdBy,
          createdAt: item.createdAt?.toISOString?.() || item.createdAt,
        };
      });

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
  static async createPurchaseOrder(baseId: number, orderData: any, userId: string) {
    try {
      const { supplierName, targetLocationId, purchaseDate, notes, items = [] } = orderData;

      // 如果指定了目标位置，检查是否属于该基地
      if (targetLocationId) {
        const locationSql = `
          SELECT id, name FROM locations 
          WHERE id = '${targetLocationId}' AND base_id = ${baseId}
        `;
        const locationResult = await prisma.$queryRawUnsafe(locationSql);

        if ((locationResult as any[]).length === 0) {
          throw new Error('目标位置不存在或不属于该基地');
        }
      }

      // 生成采购订单号
      const orderNo = await CodeGenerator.generatePurchaseOrderCode();

      // 计算总金额
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += (item.quantity || 0) * (item.unitPrice || 0);
      }

      // 创建采购订单
      const createSql = `
        INSERT INTO purchase_orders (
          id, code, supplier_name, target_location_id, base_id, 
          purchase_date, total_amount, notes, created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${orderNo}', '${supplierName}', ${targetLocationId ? `${targetLocationId}` : 'NULL'}, ${baseId},
          '${purchaseDate}', ${totalAmount}, ${notes ? `'${notes}'` : 'NULL'}, '${userId}', NOW(), NOW()
        ) RETURNING *
      `;

      const result = await prisma.$queryRawUnsafe(createSql);
      const purchaseOrder = (result as any)[0];

      // 创建采购订单项目
      for (const item of items) {
        const boxQty = item.boxQuantity || 0;
        const packQty = item.packQuantity || 0;
        const pieceQty = item.pieceQuantity || 0;
        
        // 从商品表获取拆分比例和真实ID
        const goodsSql = `
          SELECT id, pack_per_box, piece_per_pack 
          FROM goods 
          WHERE code = '${item.goodsId}'
        `;
        const goodsResult = await prisma.$queryRawUnsafe(goodsSql);
        const goods = (goodsResult as any[])[0];
        
        if (!goods) {
          throw new Error(`商品不存在: ${item.goodsId}`);
        }
        
        const goodsRealId = goods.id;  // 商品的真实UUID
        const packPerBox = goods.pack_per_box || 1;
        const piecePerPack = goods.piece_per_pack || 1;
        
        // 计算总件数
        const totalPieces = (boxQty * packPerBox * piecePerPack) + (packQty * piecePerPack) + pieceQty;
        
        // 计算总价
        const totalPrice = (boxQty + packQty + pieceQty) * (item.unitPrice || 0);
        
        const itemSql = `
          INSERT INTO purchase_order_items (
            id, purchase_order_id, goods_id, box_quantity, pack_quantity, 
            piece_quantity, total_pieces, unit_price, total_price, notes
          ) VALUES (
            gen_random_uuid(), '${purchaseOrder.id}', '${goodsRealId}', 
            ${boxQty}, ${packQty}, ${pieceQty}, ${totalPieces},
            ${item.unitPrice || 0}, ${totalPrice}, 
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
          s.address,
          s.notes,
          s.is_active as "isActive",
          s.created_at as "createdAt",
          s.updated_at as "updatedAt",
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
        data: suppliers,
        total: (suppliers as any[]).length
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
   * 更新基地供应商
   */
  static async updateBaseSupplier(baseId: number, supplierId: string, supplierData: any) {
    try {
      // 验证供应商是否属于该基地
      const supplierBase = await prisma.supplierBase.findFirst({
        where: {
          supplierId,
          baseId,
          isActive: true
        }
      });

      if (!supplierBase) {
        return {
          success: false,
          message: '供应商不存在或不属于该基地'
        };
      }

      // 更新供应商信息
      const supplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          name: supplierData.name,
          contactPerson: supplierData.contactPerson,
          phone: supplierData.phone,
          email: supplierData.email,
          address: supplierData.address,
          notes: supplierData.notes,
        }
      });

      logger.info('更新基地供应商成功', {
        service: 'milicard-api',
        baseId,
        supplierId,
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
          isActive: supplier.isActive,
          createdAt: supplier.createdAt,
          updatedAt: supplier.updatedAt,
        }
      };
    } catch (error) {
      logger.error('更新基地供应商失败', { error, baseId, supplierId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 删除基地供应商（软删除：禁用关联关系）
   */
  static async deleteBaseSupplier(baseId: number, supplierId: string) {
    try {
      // 验证供应商是否属于该基地
      const supplierBase = await prisma.supplierBase.findFirst({
        where: {
          supplierId,
          baseId,
          isActive: true
        }
      });

      if (!supplierBase) {
        return {
          success: false,
          message: '供应商不存在或不属于该基地'
        };
      }

      // 软删除：禁用供应商与基地的关联
      await prisma.supplierBase.update({
        where: { id: supplierBase.id },
        data: { isActive: false }
      });

      logger.info('删除基地供应商成功', {
        service: 'milicard-api',
        baseId,
        supplierId
      });

      return {
        success: true,
        message: '供应商已删除'
      };
    } catch (error) {
      logger.error('删除基地供应商失败', { error, baseId, supplierId, service: 'milicard-api' });
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
