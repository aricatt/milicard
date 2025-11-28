import { Request, Response } from 'express';
import { ConsumptionService } from '../services/consumptionService';
import { logger } from '../utils/logger';
import { BaseError } from '../types/base';

export class ConsumptionController {
  /**
   * 获取消耗记录列表
   */
  static async getConsumptionList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const params = {
        current: req.query.current ? parseInt(req.query.current as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
        goodsId: req.query.goodsId as string,
        goodsName: req.query.goodsName as string,
        locationId: req.query.locationId ? parseInt(req.query.locationId as string) : undefined,
        handlerId: req.query.handlerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await ConsumptionService.getConsumptionList(baseId, params);
      res.json(result);

    } catch (error) {
      logger.error('获取消耗记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: '服务器内部错误' });
      }
    }
  }

  /**
   * 创建消耗记录
   */
  static async createConsumption(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const result = await ConsumptionService.createConsumption(baseId, req.body, userId);
      res.json({ success: true, data: result });

    } catch (error) {
      logger.error('创建消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : '服务器内部错误'
        });
      }
    }
  }

  /**
   * 导入消耗记录
   */
  static async importConsumption(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const result = await ConsumptionService.importConsumption(baseId, req.body, userId);
      res.json({ success: true, data: result });

    } catch (error) {
      logger.error('导入消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : '服务器内部错误'
        });
      }
    }
  }

  /**
   * 删除消耗记录
   */
  static async deleteConsumption(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const recordId = req.params.recordId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      await ConsumptionService.deleteConsumption(baseId, recordId);
      res.json({ success: true, message: '删除成功' });

    } catch (error) {
      logger.error('删除消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        recordId: req.params.recordId,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: '服务器内部错误' });
      }
    }
  }

  /**
   * 获取期初数据（调入总量）
   * 按主播查询，因为直播间的货物归属是人
   */
  static async getOpeningStock(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const goodsId = req.query.goodsId as string;
      const handlerId = req.query.handlerId as string;

      if (!goodsId || !handlerId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：goodsId 和 handlerId'
        });
      }

      const result = await ConsumptionService.getOpeningStock(baseId, goodsId, handlerId);
      res.json(result);

    } catch (error) {
      logger.error('获取期初数据失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        goodsId: req.query.goodsId,
        locationId: req.query.locationId,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: '服务器内部错误' });
      }
    }
  }

  /**
   * 获取消耗统计
   */
  static async getConsumptionStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const result = await ConsumptionService.getConsumptionStats(baseId);
      res.json(result);

    } catch (error) {
      logger.error('获取消耗统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'ConsumptionController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: '服务器内部错误' });
      }
    }
  }
}
