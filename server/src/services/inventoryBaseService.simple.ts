import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * 简化的基地库存服务 - 专注于核心功能测试
 */
export class InventoryBaseServiceSimple {
  /**
   * 获取基地的库存列表 - 简化版本
   */
  static async getBaseInventoryList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, goodsCode, goodsName } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询SQL
      let sql = `
        SELECT 
          i.id,
          i.goods_id as "goodsId",
          i.location_id as "locationId", 
          i.base_id as "baseId",
          i.stock_quantity as "stockQuantity",
          i.average_cost as "averageCost",
          i.updated_at as "updatedAt",
          g.code as "goodsCode",
          g.name as "goodsName",
          g.description as "goodsDescription",
          l.name as "locationName",
          l.type as "locationType",
          b.name as "baseName"
        FROM inventory i
        JOIN goods g ON i.goods_id = g.id
        JOIN locations l ON i.location_id = l.id  
        JOIN bases b ON i.base_id = b.id
        WHERE i.base_id = ${baseId}
      `;

      if (goodsCode) {
        sql += ` AND g.code ILIKE '%${goodsCode}%'`;
      }
      if (goodsName) {
        sql += ` AND g.name ILIKE '%${goodsName}%'`;
      }

      sql += ` ORDER BY i.updated_at DESC LIMIT ${pageSize} OFFSET ${skip}`;

      // 使用原始查询来避免类型问题
      const inventories = await prisma.$queryRawUnsafe(sql);

      // 获取总数
      let countSql = `
        SELECT COUNT(*) as count
        FROM inventory i
        JOIN goods g ON i.goods_id = g.id
        WHERE i.base_id = ${baseId}
      `;

      if (goodsCode) {
        countSql += ` AND g.code ILIKE '%${goodsCode}%'`;
      }
      if (goodsName) {
        countSql += ` AND g.name ILIKE '%${goodsName}%'`;
      }

      const totalResult = await prisma.$queryRawUnsafe(countSql);

      const total = Number((totalResult as any)[0]?.count || 0);

      // 转换数据格式
      const data = (inventories as any[]).map(inv => ({
        id: inv.id,
        goodsId: inv.goodsId,
        locationId: inv.locationId,
        baseId: inv.baseId,
        stockQuantity: inv.stockQuantity,
        averageCost: Number(inv.averageCost),
        updatedAt: inv.updatedAt.toISOString(),
        goods: {
          code: inv.goodsCode,
          name: inv.goodsName,
          description: inv.goodsDescription
        },
        location: {
          name: inv.locationName,
          type: inv.locationType
        },
        base: {
          name: inv.baseName
        },
        totalValue: inv.stockQuantity * Number(inv.averageCost)
      }));

      logger.info('获取基地库存列表成功', {
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
      logger.error('获取基地库存列表失败', { error, baseId, params, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地的位置列表
   */
  static async getBaseLocations(baseId: number) {
    try {
      const sql = `
        SELECT 
          id,
          name,
          type,
          description,
          address
        FROM locations
        WHERE base_id = ${baseId} AND is_active = true
        ORDER BY name ASC
      `;

      const locations = await prisma.$queryRawUnsafe(sql);

      logger.info('获取基地位置列表成功', {
        service: 'milicard-api',
        baseId,
        count: (locations as any[]).length
      });

      return {
        success: true,
        data: locations
      };
    } catch (error) {
      logger.error('获取基地位置列表失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地库存统计
   */
  static async getBaseInventoryStats(baseId: number) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as "totalItems",
          SUM(stock_quantity) as "totalQuantity",
          COUNT(DISTINCT goods_id) as "uniqueGoods",
          COUNT(DISTINCT location_id) as "uniqueLocations",
          SUM(stock_quantity * average_cost) as "totalValue"
        FROM inventory
        WHERE base_id = ${baseId}
      `;

      const statsResult = await prisma.$queryRawUnsafe(sql);
      const stats = (statsResult as any)[0];
      
      const result = {
        totalItems: Number(stats.totalItems || 0),
        totalQuantity: Number(stats.totalQuantity || 0),
        uniqueGoods: Number(stats.uniqueGoods || 0),
        uniqueLocations: Number(stats.uniqueLocations || 0),
        totalValue: Number(stats.totalValue || 0)
      };

      logger.info('获取基地库存统计成功', {
        service: 'milicard-api',
        baseId,
        stats: result
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地库存统计失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 调整库存数量
   */
  static async adjustInventory(baseId: number, inventoryId: string, newQuantity: number, reason: string = '') {
    try {
      // 检查库存是否存在且属于该基地
      const checkSql = `
        SELECT id, stock_quantity as "oldQuantity"
        FROM inventory
        WHERE id = '${inventoryId}' AND base_id = ${baseId}
      `;

      const checkResult = await prisma.$queryRawUnsafe(checkSql);

      if ((checkResult as any[]).length === 0) {
        throw new Error('库存记录不存在或不属于该基地');
      }

      const oldQuantity = (checkResult as any)[0].oldQuantity;

      // 更新库存数量
      const updateSql = `
        UPDATE inventory
        SET stock_quantity = ${newQuantity}, updated_at = NOW()
        WHERE id = '${inventoryId}'
      `;

      await prisma.$queryRawUnsafe(updateSql);

      logger.info('调整库存成功', {
        service: 'milicard-api',
        baseId,
        inventoryId,
        oldQuantity,
        newQuantity,
        reason
      });

      return {
        success: true,
        data: {
          inventoryId,
          oldQuantity,
          newQuantity,
          reason
        }
      };
    } catch (error) {
      logger.error('调整库存失败', { error, baseId, inventoryId, newQuantity, reason, service: 'milicard-api' });
      throw error;
    }
  }
}
