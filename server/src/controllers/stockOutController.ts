/**
 * 出库控制器
 */
import { Request, Response } from 'express';
import { stockOutService } from '../services/stockOutService';
import { logger } from '../utils/logger';

export class StockOutController {
  /**
   * 获取出库列表
   */
  static async getList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const {
        page = '1',
        pageSize = '20',
        type,
        goodsId,
        locationId,
        startDate,
        endDate,
        keyword,
      } = req.query;

      const result = await stockOutService.getList({
        baseId,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        type: type as any,
        goodsId: goodsId as string,
        locationId: locationId ? parseInt(locationId as string, 10) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        keyword: keyword as string,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('获取出库列表失败', { error });
      res.status(500).json({
        success: false,
        message: '获取出库列表失败',
      });
    }
  }

  /**
   * 获取单个出库记录
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stockOut = await stockOutService.getById(id);

      if (!stockOut) {
        return res.status(404).json({
          success: false,
          message: '出库记录不存在',
        });
      }

      res.json({
        success: true,
        data: stockOut,
      });
    } catch (error) {
      logger.error('获取出库记录失败', { error });
      res.status(500).json({
        success: false,
        message: '获取出库记录失败',
      });
    }
  }

  /**
   * 创建出库记录（手动出库）
   */
  static async create(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权',
        });
      }

      const {
        date,
        goodsId,
        targetName,
        locationId,
        boxQuantity,
        packQuantity,
        pieceQuantity,
        remark,
      } = req.body;

      // 验证必填字段
      if (!date || !goodsId || !locationId) {
        return res.status(400).json({
          success: false,
          message: '日期、商品和出库仓库为必填项',
        });
      }

      const stockOut = await stockOutService.create({
        baseId,
        date,
        goodsId,
        type: 'MANUAL',
        targetName,
        locationId,
        boxQuantity: boxQuantity || 0,
        packQuantity: packQuantity || 0,
        pieceQuantity: pieceQuantity || 0,
        remark,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: stockOut,
        message: '创建成功',
      });
    } catch (error) {
      logger.error('创建出库记录失败', { error });
      res.status(500).json({
        success: false,
        message: '创建出库记录失败',
      });
    }
  }

  /**
   * 更新出库记录（仅手动出库可更新）
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        date,
        goodsId,
        targetName,
        locationId,
        boxQuantity,
        packQuantity,
        pieceQuantity,
        remark,
      } = req.body;

      const stockOut = await stockOutService.update(id, {
        date,
        goodsId,
        targetName,
        locationId,
        boxQuantity,
        packQuantity,
        pieceQuantity,
        remark,
      });

      res.json({
        success: true,
        data: stockOut,
        message: '更新成功',
      });
    } catch (error: any) {
      logger.error('更新出库记录失败', { error });
      res.status(400).json({
        success: false,
        message: error.message || '更新出库记录失败',
      });
    }
  }

  /**
   * 删除出库记录（仅手动出库可删除）
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await stockOutService.delete(id);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error: any) {
      logger.error('删除出库记录失败', { error });
      res.status(400).json({
        success: false,
        message: error.message || '删除出库记录失败',
      });
    }
  }

  /**
   * 获取统计数据
   */
  static async getStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { startDate, endDate } = req.query;

      const stats = await stockOutService.getStats(
        baseId,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取出库统计失败', { error });
      res.status(500).json({
        success: false,
        message: '获取出库统计失败',
      });
    }
  }

  /**
   * 导入出库记录
   */
  static async importRecord(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权',
        });
      }

      const {
        date,
        type,
        goodsCode,
        categoryName,
        goodsName,
        locationName,
        targetName,
        relatedOrderCode,
        boxQuantity,
        packQuantity,
        pieceQuantity,
        remark,
      } = req.body;

      // 验证必填字段
      if (!date || !type || !locationName) {
        return res.status(400).json({
          success: false,
          message: '出库日期、出库类型和出库位置为必填项',
        });
      }

      // 验证商品识别方式：必须提供商品编号，或者同时提供品类名称和商品名称
      if (!goodsCode && !(categoryName && goodsName)) {
        return res.status(400).json({
          success: false,
          message: '必须提供商品编号，或者同时提供品类名称和商品名称',
        });
      }

      // 出库类型映射
      const typeMap: Record<string, string> = {
        '点单出库': 'POINT_ORDER',
        '调拨出库': 'TRANSFER',
        '手动出库': 'MANUAL',
      };

      const stockOutType = typeMap[type] || type;

      if (!['POINT_ORDER', 'TRANSFER', 'MANUAL'].includes(stockOutType)) {
        return res.status(400).json({
          success: false,
          message: '出库类型无效，可选值：点单出库、调拨出库、手动出库',
        });
      }

      const stockOut = await stockOutService.importRecord({
        baseId,
        date,
        type: stockOutType as 'POINT_ORDER' | 'TRANSFER' | 'MANUAL',
        goodsCode,
        categoryName,
        goodsName,
        locationName,
        targetName,
        relatedOrderCode,
        boxQuantity: boxQuantity || 0,
        packQuantity: packQuantity || 0,
        pieceQuantity: pieceQuantity || 0,
        remark,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: stockOut,
        message: '导入成功',
      });
    } catch (error: any) {
      logger.error('导入出库记录失败', { error });
      res.status(400).json({
        success: false,
        message: error.message || '导入出库记录失败',
      });
    }
  }
}
