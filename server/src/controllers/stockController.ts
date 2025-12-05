import { Request, Response } from 'express';
import { StockService } from '../services/stockService';
import { logger } from '../utils/logger';

export class StockController {
  /**
   * 获取基地实时库存列表
   */
  static async getRealTimeStock(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { goodsName, goodsCode, locationId, current, pageSize } = req.query;

      const result = await StockService.getBaseRealTimeStock(baseId, {
        goodsName: goodsName as string,
        goodsCode: goodsCode as string,
        locationId: locationId ? parseInt(locationId as string, 10) : undefined,
        current: current ? parseInt(current as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      logger.error('获取实时库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });
      res.status(500).json({
        success: false,
        message: '获取实时库存失败',
      });
    }
  }

  /**
   * 获取基地库存统计
   */
  static async getStockStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const stats = await StockService.getBaseStockStats(baseId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取库存统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });
      res.status(500).json({
        success: false,
        message: '获取库存统计失败',
      });
    }
  }

  /**
   * 获取仓库列表
   */
  static async getWarehouses(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const warehouses = await StockService.getWarehouses(baseId);

      res.json({
        success: true,
        data: warehouses,
      });
    } catch (error) {
      logger.error('获取仓库列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });
      res.status(500).json({
        success: false,
        message: '获取仓库列表失败',
      });
    }
  }

  /**
   * 获取指定仓库的库存
   */
  static async getLocationStock(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const locationId = parseInt(req.params.locationId, 10);

      const stock = await StockService.getLocationStock(baseId, locationId);

      res.json({
        success: true,
        data: stock,
      });
    } catch (error) {
      logger.error('获取仓库库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        locationId: req.params.locationId,
      });
      res.status(500).json({
        success: false,
        message: '获取仓库库存失败',
      });
    }
  }
}
