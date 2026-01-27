import { Request, Response } from 'express';
import { StockService } from '../services/stockService';
import { GoodsCostService } from '../services/goodsCostService';
import { logger } from '../utils/logger';

export class StockController {
  /**
   * 获取基地实时库存列表
   */
  static async getRealTimeStock(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { goodsName, goodsCode, categoryCode, stockStatus, locationId, stockThreshold, stockUnit, current, pageSize, sortField, sortOrder } = req.query;

      const result = await StockService.getBaseRealTimeStock(baseId, {
        goodsName: goodsName as string,
        goodsCode: goodsCode as string,
        categoryCode: categoryCode as string,
        stockStatus: stockStatus as string,
        locationId: locationId ? parseInt(locationId as string, 10) : undefined,
        stockThreshold: stockThreshold ? parseInt(stockThreshold as string, 10) : undefined,
        stockUnit: stockUnit as 'box' | 'pack' | 'piece' | undefined,
        current: current ? parseInt(current as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        sortField: sortField as string,
        sortOrder: sortOrder as 'ascend' | 'descend' | undefined,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        lastUpdated: result.lastUpdated,
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

  /**
   * 获取指定商品在指定仓库的库存
   */
  static async getGoodsStock(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { goodsId, locationId } = req.query;

      if (!goodsId || !locationId) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: goodsId, locationId',
        });
      }

      const stock = await StockService.getStock(
        baseId,
        goodsId as string,
        parseInt(locationId as string, 10)
      );

      res.json({
        success: true,
        data: stock,
      });
    } catch (error) {
      logger.error('获取商品库存失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        query: req.query,
      });
      res.status(500).json({
        success: false,
        message: '获取商品库存失败',
      });
    }
  }

  /**
   * 重新计算基地所有商品的平均成本（修复历史数据）
   */
  static async recalculateAllCosts(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);

      const updatedCount = await GoodsCostService.recalculateAllAverageCosts(baseId);

      res.json({
        success: true,
        message: `已重新计算 ${updatedCount} 个商品的平均成本`,
        data: { updatedCount },
      });
    } catch (error) {
      logger.error('重新计算平均成本失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });
      res.status(500).json({
        success: false,
        message: '重新计算平均成本失败',
      });
    }
  }
}
