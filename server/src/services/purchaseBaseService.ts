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
      const { current = 1, pageSize = 10, orderNo, supplierName, goodsName, startDate, endDate } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询SQL - 关联订单明细、商品信息、供应商信息和到货统计
      let sql = `
        SELECT 
          poi.id,
          po.id as "purchaseOrderId",
          po.code as "orderNo",
          s.name as "supplierName",
          po.supplier_id as "supplierId",
          po.base_id as "baseId",
          po.purchase_date as "purchaseDate",
          po.actual_amount as "actualAmount",
          po.created_by as "createdBy",
          po.created_at as "createdAt",
          g.id as "goodsId",
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
          poi.total_price as "totalAmount",
          COALESCE(arr.arrived_box, 0) as "arrivedBoxQty",
          COALESCE(arr.arrived_pack, 0) as "arrivedPackQty",
          COALESCE(arr.arrived_piece, 0) as "arrivedPieceQty"
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        JOIN goods g ON poi.goods_id = g.id
        JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN (
          SELECT 
            purchase_order_id,
            SUM(box_quantity) as arrived_box,
            SUM(pack_quantity) as arrived_pack,
            SUM(piece_quantity) as arrived_piece
          FROM arrival_records
          GROUP BY purchase_order_id
        ) arr ON arr.purchase_order_id = po.id
        WHERE po.base_id = ${baseId}
      `;

      // 添加过滤条件
      if (orderNo) {
        sql += ` AND po.code ILIKE '%${orderNo}%'`;
      }
      if (supplierName) {
        sql += ` AND s.name ILIKE '%${supplierName}%'`;
      }
      if (goodsName) {
        sql += ` AND g.name ILIKE '%${goodsName}%'`;
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
        JOIN goods g ON poi.goods_id = g.id
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.base_id = ${baseId}
      `;

      if (orderNo) {
        countSql += ` AND po.code ILIKE '%${orderNo}%'`;
      }
      if (supplierName) {
        countSql += ` AND s.name ILIKE '%${supplierName}%'`;
      }
      if (goodsName) {
        countSql += ` AND g.name ILIKE '%${goodsName}%'`;
      }
      if (startDate) {
        countSql += ` AND po.purchase_date >= '${startDate}'`;
      }
      if (endDate) {
        countSql += ` AND po.purchase_date <= '${endDate}'`;
      }

      const totalResult = await prisma.$queryRawUnsafe(countSql);
      const total = Number((totalResult as any)[0]?.count || 0);

      // 转换数据格式 - 计算单价、到货和相差
      const data = (purchaseItems as any[]).map(item => {
        const packPerBox = Number(item.packPerBox) || 1;
        const piecePerPack = Number(item.piecePerPack) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        
        // 计算各级单价（假设unitPrice是箱单价）
        const unitPriceBox = unitPrice;
        const unitPricePack = unitPrice / packPerBox;
        const unitPricePiece = unitPricePack / piecePerPack;

        // 采购数量
        const purchaseBoxQty = Number(item.purchaseBoxQty) || 0;
        const purchasePackQty = Number(item.purchasePackQty) || 0;
        const purchasePieceQty = Number(item.purchasePieceQty) || 0;

        // 到货数量
        const arrivedBoxQty = Number(item.arrivedBoxQty) || 0;
        const arrivedPackQty = Number(item.arrivedPackQty) || 0;
        const arrivedPieceQty = Number(item.arrivedPieceQty) || 0;

        // 相差数量 = 采购 - 到货
        const diffBoxQty = purchaseBoxQty - arrivedBoxQty;
        const diffPackQty = purchasePackQty - arrivedPackQty;
        const diffPieceQty = purchasePieceQty - arrivedPieceQty;
        
        return {
          id: item.purchaseOrderId,       // 返回采购订单ID
          orderNo: item.orderNo,
          supplierName: item.supplierName,
          baseId: item.baseId,
          purchaseDate: item.purchaseDate,
          goodsId: item.goodsId,          // 返回商品ID
          goodsCode: item.goodsCode,
          goodsName: item.goodsName,
          retailPrice: Number(item.retailPrice),
          purchaseBoxQty,
          purchasePackQty,
          purchasePieceQty,
          arrivedBoxQty,
          arrivedPackQty,
          arrivedPieceQty,
          diffBoxQty,
          diffPackQty,
          diffPieceQty,
          unitPriceBox,
          unitPricePack,
          unitPricePiece,
          totalAmount: Number(item.totalAmount),
          actualAmount: Number(item.actualAmount) || 0,
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
      const { supplierName, targetLocationId, purchaseDate, notes, actualAmount = 0, items = [] } = orderData;

      // 通过供应商名称查找供应商（需要是该基地的供应商）
      const supplierSql = `
        SELECT s.id, s.name 
        FROM suppliers s
        INNER JOIN supplier_bases sb ON s.id = sb.supplier_id
        WHERE s.name = '${supplierName.replace(/'/g, "''")}' 
          AND sb.base_id = ${baseId}
          AND s.is_active = true
        LIMIT 1
      `;
      const supplierResult = await prisma.$queryRawUnsafe(supplierSql);
      
      if ((supplierResult as any[]).length === 0) {
        throw new Error(`供应商不存在或不属于当前基地: ${supplierName}`);
      }
      
      const supplier = (supplierResult as any)[0];
      const supplierId = supplier.id;

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

      // 注意：totalAmount 会在创建订单项目时重新计算，这里先设为0
      // 因为需要查询商品的拆分比例才能正确计算
      let totalAmount = 0;

      // 创建采购订单
      const createSql = `
        INSERT INTO purchase_orders (
          id, code, supplier_id, target_location_id, base_id, 
          purchase_date, total_amount, actual_amount, notes, created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${orderNo}', '${supplierId}', ${targetLocationId ? `${targetLocationId}` : 'NULL'}, ${baseId},
          '${purchaseDate}', ${totalAmount}, ${actualAmount}, ${notes ? `'${notes}'` : 'NULL'}, '${userId}', NOW(), NOW()
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
        
        // 计算各级单价（unitPrice是箱单价）
        const unitPriceBox = item.unitPrice || 0;
        const unitPricePack = unitPriceBox / packPerBox;
        const unitPricePiece = unitPricePack / piecePerPack;
        
        // 计算总价 = 箱数*箱单价 + 盒数*盒单价 + 包数*包单价
        const totalPrice = (boxQty * unitPriceBox) + (packQty * unitPricePack) + (pieceQty * unitPricePiece);
        
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
        
        // 累加总金额
        totalAmount += totalPrice;
      }

      // 更新主表的总金额
      const updateTotalSql = `
        UPDATE purchase_orders 
        SET total_amount = ${totalAmount}
        WHERE id = '${purchaseOrder.id}'
      `;
      await prisma.$queryRawUnsafe(updateTotalSql);

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
   * 导入采购订单（支持通过商品名称和供应商名称关联）
   */
  static async importPurchaseOrder(baseId: number, orderData: any, userId: string) {
    try {
      const { orderNo, supplierName, purchaseDate, notes, actualAmount = 0, items = [] } = orderData;

      // 通过供应商名称查找供应商（需要是该基地的供应商）
      const supplierSql = `
        SELECT s.id, s.name 
        FROM suppliers s
        INNER JOIN supplier_bases sb ON s.id = sb.supplier_id
        WHERE s.name = '${supplierName.replace(/'/g, "''")}' 
          AND sb.base_id = ${baseId}
          AND s.is_active = true
        LIMIT 1
      `;
      const supplierResult = await prisma.$queryRawUnsafe(supplierSql);
      
      if ((supplierResult as any[]).length === 0) {
        throw new Error(`供应商不存在或不属于当前基地: ${supplierName}`);
      }
      
      const supplier = (supplierResult as any)[0];
      const supplierId = supplier.id;

      // 检查是否已存在相同编号的订单（用于更新）
      let existingOrderId = null;
      if (orderNo && orderNo.trim() && !orderNo.includes('留空')) {
        const checkSql = `
          SELECT id FROM purchase_orders 
          WHERE code = '${orderNo}' AND base_id = ${baseId}
        `;
        const checkResult = await prisma.$queryRawUnsafe(checkSql);
        if ((checkResult as any[]).length > 0) {
          existingOrderId = (checkResult as any)[0].id;
        }
      }

      // 如果存在则先删除旧订单
      if (existingOrderId) {
        await prisma.$queryRawUnsafe(`DELETE FROM purchase_order_items WHERE purchase_order_id = '${existingOrderId}'`);
        await prisma.$queryRawUnsafe(`DELETE FROM purchase_orders WHERE id = '${existingOrderId}'`);
      }

      // 生成采购订单号（如果没有提供有效的编号）
      const finalOrderNo = (orderNo && orderNo.trim() && !orderNo.includes('留空')) 
        ? orderNo 
        : await CodeGenerator.generatePurchaseOrderCode();

      // 先创建订单，totalAmount 后面更新
      let totalAmount = 0;

      // 创建采购订单
      const createSql = `
        INSERT INTO purchase_orders (
          id, code, supplier_id, base_id, 
          purchase_date, total_amount, actual_amount, notes, created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '${finalOrderNo}', '${supplierId}', ${baseId},
          '${purchaseDate}', ${totalAmount}, ${actualAmount}, ${notes ? `'${notes}'` : 'NULL'}, '${userId}', NOW(), NOW()
        ) RETURNING *
      `;

      const result = await prisma.$queryRawUnsafe(createSql);
      const purchaseOrder = (result as any)[0];

      // 创建采购订单项目
      for (const item of items) {
        const boxQty = item.boxQuantity || 0;
        const packQty = item.packQuantity || 0;
        const pieceQty = item.pieceQuantity || 0;

        // 通过商品名称查找商品
        const goodsName = item.goodsName || '';
        const goodsSql = `
          SELECT id, code, pack_per_box, piece_per_pack 
          FROM goods 
          WHERE name = '${goodsName.replace(/'/g, "''")}'
          LIMIT 1
        `;
        const goodsResult = await prisma.$queryRawUnsafe(goodsSql);
        
        if ((goodsResult as any[]).length === 0) {
          throw new Error(`商品不存在: ${goodsName}`);
        }
        
        const goods = (goodsResult as any)[0];
        const goodsRealId = goods.id;
        const packPerBox = goods.pack_per_box || 1;
        const piecePerPack = goods.piece_per_pack || 1;
        
        // 计算总件数
        const totalPieces = (boxQty * packPerBox * piecePerPack) + (packQty * piecePerPack) + pieceQty;
        
        // 计算各级单价（unitPrice是箱单价）
        const unitPriceBox = item.unitPrice || 0;
        const unitPricePack = unitPriceBox / packPerBox;
        const unitPricePiece = unitPricePack / piecePerPack;
        
        // 计算总价 = 箱数*箱单价 + 盒数*盒单价 + 包数*包单价
        const totalPrice = (boxQty * unitPriceBox) + (packQty * unitPricePack) + (pieceQty * unitPricePiece);
        
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
        
        // 累加总金额
        totalAmount += totalPrice;
      }

      // 更新主表的总金额
      const updateTotalSql = `
        UPDATE purchase_orders 
        SET total_amount = ${totalAmount}
        WHERE id = '${purchaseOrder.id}'
      `;
      await prisma.$queryRawUnsafe(updateTotalSql);

      logger.info('导入采购订单成功', {
        service: 'milicard-api',
        baseId,
        orderId: purchaseOrder.id,
        orderNo: finalOrderNo,
        totalAmount,
        isUpdate: !!existingOrderId
      });

      return {
        success: true,
        data: {
          id: purchaseOrder.id,
          orderNo: finalOrderNo,
          supplierName,
          baseId,
          purchaseDate,
          totalAmount,
          actualAmount,
          notes,
          itemCount: items.length,
          isUpdate: !!existingOrderId
        }
      };
    } catch (error) {
      logger.error('导入采购订单失败', { error, baseId, orderData, service: 'milicard-api' });
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
          COUNT(DISTINCT supplier_id) as "uniqueSuppliers",
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
   * 删除采购订单
   */
  static async deletePurchaseOrder(baseId: number, orderId: string) {
    try {
      // 先尝试通过订单ID查找
      let checkSql = `
        SELECT id FROM purchase_orders 
        WHERE id = '${orderId}' AND base_id = ${baseId}
      `;
      let checkResult = await prisma.$queryRawUnsafe(checkSql);
      let realOrderId = orderId;

      // 如果找不到，尝试通过明细ID查找对应的订单ID
      if ((checkResult as any[]).length === 0) {
        const itemCheckSql = `
          SELECT po.id 
          FROM purchase_orders po
          JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
          WHERE poi.id = '${orderId}' AND po.base_id = ${baseId}
        `;
        const itemCheckResult = await prisma.$queryRawUnsafe(itemCheckSql);
        
        if ((itemCheckResult as any[]).length === 0) {
          throw new Error('采购订单不存在或不属于该基地');
        }
        
        realOrderId = (itemCheckResult as any[])[0].id;
      }

      // 删除订单（由于设置了 onDelete: Cascade，订单明细会自动删除）
      const deleteSql = `
        DELETE FROM purchase_orders 
        WHERE id = '${realOrderId}' AND base_id = ${baseId}
      `;
      await prisma.$queryRawUnsafe(deleteSql);

      logger.info('删除采购订单成功', {
        service: 'milicard-api',
        baseId,
        orderId
      });

      return {
        success: true,
        message: '删除成功'
      };
    } catch (error) {
      logger.error('删除采购订单失败', { error, baseId, orderId, service: 'milicard-api' });
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
      // 生成供应商编号（使用统一的CodeGenerator）
      const code = await CodeGenerator.generateSupplierCode();

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

}
