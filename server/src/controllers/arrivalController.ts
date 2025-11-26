import { Request, Response } from 'express';
import { ArrivalRecordService } from '../services/arrivalRecordService';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import type { CreateArrivalRequest, ArrivalQueryParams } from '../types/arrival';

export class ArrivalController {
  /**
   * 获取基地到货记录列表
   */
  static async getArrivalRecords(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const params: ArrivalQueryParams = {
        current: req.query.current ? parseInt(req.query.current as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
        warehouseId: req.query.warehouseId as string,
        purchaseOrderId: req.query.purchaseOrderId as string,
        purchaseOrderNo: req.query.purchaseOrderNo as string,  // 采购编号搜索
        goodsId: req.query.goodsId as string,
        goodsName: req.query.goodsName as string,              // 商品名称搜索
        handlerId: req.query.handlerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await ArrivalRecordService.getBaseArrivalRecords(baseId, params);
      res.json(result);

    } catch (error) {
      logger.error('获取到货记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        query: req.query,
        controller: 'ArrivalController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 创建到货记录
   */
  static async createArrivalRecord(req: Request, res: Response) {
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
          message: '用户未认证'
        });
      }

      const data: CreateArrivalRequest = req.body;
      const result = await ArrivalRecordService.createArrivalRecord(baseId, data, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: '到货记录创建成功'
      });

    } catch (error) {
      logger.error('创建到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        userId: req.user?.id,
        controller: 'ArrivalController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 删除到货记录
   */
  static async deleteArrivalRecord(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const recordId = req.params.recordId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      if (!recordId) {
        return res.status(400).json({
          success: false,
          message: '记录ID无效'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      await ArrivalRecordService.deleteArrivalRecord(baseId, recordId, userId);

      res.json({
        success: true,
        message: '到货记录删除成功'
      });

    } catch (error) {
      logger.error('删除到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        recordId: req.params.recordId,
        userId: req.user?.id,
        controller: 'ArrivalController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 获取到货统计
   */
  static async getArrivalStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const result = await ArrivalRecordService.getArrivalStats(baseId);
      res.json(result);

    } catch (error) {
      logger.error('获取到货统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'ArrivalController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }

  /**
   * 导入到货记录（通过名称匹配）
   */
  static async importArrivalRecord(req: Request, res: Response) {
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
          message: '用户未认证'
        });
      }

      const data = req.body;
      const result = await ArrivalRecordService.importArrivalRecord(baseId, data, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: '到货记录导入成功'
      });

    } catch (error) {
      logger.error('导入到货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        userId: req.user?.id,
        controller: 'ArrivalController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }
    }
  }
}
