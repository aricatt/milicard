import { Request, Response } from 'express';
import { AnchorGmvAdsService } from '../services/anchorGmvAdsService';
import { logger } from '../utils/logger';

export class AnchorGmvAdsController {
  /**
   * 获取月度GMV-ADS统计数据
   */
  static async getMonthlyStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const { month, handlerIds, selectedDates } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({
          success: false,
          message: '缺少月份参数',
        });
      }

      const params: any = { month };

      if (handlerIds) {
        params.handlerIds = typeof handlerIds === 'string' 
          ? handlerIds.split(',') 
          : handlerIds;
      }

      if (selectedDates) {
        params.selectedDates = typeof selectedDates === 'string'
          ? selectedDates.split(',')
          : selectedDates;
      }

      const result = await AnchorGmvAdsService.getMonthlyGmvAdsStats(baseId, params);

      res.json(result);
    } catch (error) {
      logger.error('获取月度GMV-ADS统计数据失败', {
        error: error instanceof Error ? error.message : String(error),
        controller: 'AnchorGmvAdsController',
        method: 'getMonthlyStats',
      });
      res.status(500).json({
        success: false,
        message: '获取数据失败',
      });
    }
  }

  /**
   * 创建或更新ADS记录
   */
  static async upsertAdsRecord(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const data = req.body;

      if (!data.month) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：month',
        });
      }

      // 如果没有handlerId但有handlerName，则通过handlerName查找handlerId（用于导入）
      if (!data.handlerId && data.handlerName) {
        const result = await AnchorGmvAdsService.upsertAdsRecord(baseId, data);
        
        if (!result.success) {
          return res.status(400).json(result);
        }
        
        return res.json(result);
      }

      // 必须有handlerId或handlerName
      if (!data.handlerId && !data.handlerName) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：handlerId 或 handlerName',
        });
      }

      const result = await AnchorGmvAdsService.upsertAdsRecord(baseId, data);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('创建/更新ADS记录失败', {
        error: error instanceof Error ? error.message : String(error),
        controller: 'AnchorGmvAdsController',
        method: 'upsertAdsRecord',
      });
      res.status(500).json({
        success: false,
        message: '操作失败',
      });
    }
  }

  /**
   * 获取主播列表
   */
  static async getHandlerOptions(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);

      const result = await AnchorGmvAdsService.getHandlerOptions(baseId);

      res.json(result);
    } catch (error) {
      logger.error('获取主播列表失败', {
        error: error instanceof Error ? error.message : String(error),
        controller: 'AnchorGmvAdsController',
        method: 'getHandlerOptions',
      });
      res.status(500).json({
        success: false,
        message: '获取主播列表失败',
      });
    }
  }

  /**
   * 删除ADS记录
   */
  static async deleteAdsRecord(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const { id } = req.params;

      const result = await AnchorGmvAdsService.deleteAdsRecord(baseId, id);

      res.json(result);
    } catch (error) {
      logger.error('删除ADS记录失败', {
        error: error instanceof Error ? error.message : String(error),
        controller: 'AnchorGmvAdsController',
        method: 'deleteAdsRecord',
      });
      res.status(500).json({
        success: false,
        message: '删除失败',
      });
    }
  }
}
