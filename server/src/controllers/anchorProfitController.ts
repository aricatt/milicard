import { Request, Response } from 'express';
import { AnchorProfitService } from '../services/anchorProfitService';
import { logger } from '../utils/logger';

export class AnchorProfitController {
  /**
   * 获取主播利润列表
   */
  static async getAnchorProfits(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const { page, pageSize, handlerId, startDate, endDate } = req.query;

      const result = await AnchorProfitService.getAnchorProfits(baseId, {
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
        handlerId: handlerId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(result);
    } catch (error) {
      logger.error('获取主播利润列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 创建主播利润记录
   */
  static async createAnchorProfit(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权',
        });
      }

      const result = await AnchorProfitService.createAnchorProfit(
        baseId,
        req.body,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('创建主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        baseId: req.params.baseId,
        body: req.body,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 更新主播利润记录
   */
  static async updateAnchorProfit(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const { id } = req.params;

      if (isNaN(baseId) || !id) {
        return res.status(400).json({
          success: false,
          message: '参数无效',
        });
      }

      const result = await AnchorProfitService.updateAnchorProfit(
        baseId,
        id,
        req.body
      );

      res.json(result);
    } catch (error) {
      logger.error('更新主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        id: req.params.id,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 删除主播利润记录
   */
  static async deleteAnchorProfit(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const { id } = req.params;

      if (isNaN(baseId) || !id) {
        return res.status(400).json({
          success: false,
          message: '参数无效',
        });
      }

      const result = await AnchorProfitService.deleteAnchorProfit(baseId, id);

      res.json(result);
    } catch (error) {
      logger.error('删除主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        id: req.params.id,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取统计数据
   */
  static async getStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const result = await AnchorProfitService.getStats(baseId);

      res.json(result);
    } catch (error) {
      logger.error('获取主播利润统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取未关联利润的消耗记录
   */
  static async getUnlinkedConsumptions(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const { handlerId, currentConsumptionId } = req.query;

      if (!handlerId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：handlerId',
        });
      }

      const result = await AnchorProfitService.getUnlinkedConsumptions(
        baseId,
        handlerId as string,
        currentConsumptionId as string | undefined
      );

      res.json(result);
    } catch (error) {
      logger.error('获取未关联消耗记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取消耗金额（根据消耗记录ID）
   */
  static async getConsumptionAmount(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const { consumptionId } = req.query;

      if (!consumptionId) {
        return res.status(400).json({
          success: false,
          message: '缺少必填参数：consumptionId',
        });
      }

      const result = await AnchorProfitService.getConsumptionAmount(
        baseId,
        consumptionId as string
      );

      res.json(result);
    } catch (error) {
      logger.error('获取消耗金额失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 导入主播利润记录
   */
  static async importAnchorProfit(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效',
        });
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权',
        });
      }

      const result = await AnchorProfitService.importAnchorProfit(
        baseId,
        req.body,
        userId
      );

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('导入主播利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'AnchorProfitController',
      });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
}
