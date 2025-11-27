import { Request, Response } from 'express';
import { TransferRecordService } from '../services/transferRecordService';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';
import type { CreateTransferRequest, TransferQueryParams, TransferStatus } from '../types/transfer';

export class TransferController {
  /**
   * 获取基地调货记录列表
   */
  static async getTransferRecords(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const params: TransferQueryParams = {
        current: req.query.current ? parseInt(req.query.current as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
        sourceLocationId: req.query.sourceLocationId as string,
        destinationLocationId: req.query.destinationLocationId as string,
        goodsId: req.query.goodsId as string,
        goodsName: req.query.goodsName as string,  // 商品名称搜索
        handlerId: req.query.handlerId as string,
        status: req.query.status as TransferStatus,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await TransferRecordService.getBaseTransferRecords(baseId, params);
      res.json(result);

    } catch (error) {
      logger.error('获取调货记录列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        query: req.query,
        controller: 'TransferController'
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
   * 创建调货记录
   */
  static async createTransferRecord(req: Request, res: Response) {
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

      const data: CreateTransferRequest = req.body;
      const result = await TransferRecordService.createTransferRecord(baseId, data, userId);

      res.status(201).json({
        success: true,
        data: result,
        message: '调货记录创建成功'
      });

    } catch (error) {
      logger.error('创建调货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        userId: req.user?.id,
        controller: 'TransferController'
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
   * 更新调货记录状态
   */
  static async updateTransferStatus(req: Request, res: Response) {
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

      const { status } = req.body;
      if (!status || !['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: '状态参数无效'
        });
      }

      const result = await TransferRecordService.updateTransferStatus(
        baseId, 
        recordId, 
        status as TransferStatus, 
        userId
      );

      res.json({
        success: true,
        data: result,
        message: '调货记录状态更新成功'
      });

    } catch (error) {
      logger.error('更新调货记录状态失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        recordId: req.params.recordId,
        body: req.body,
        userId: req.user?.id,
        controller: 'TransferController'
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
   * 删除调货记录
   */
  static async deleteTransferRecord(req: Request, res: Response) {
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

      await TransferRecordService.deleteTransferRecord(baseId, recordId, userId);

      res.json({
        success: true,
        message: '调货记录删除成功'
      });

    } catch (error) {
      logger.error('删除调货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        recordId: req.params.recordId,
        userId: req.user?.id,
        controller: 'TransferController'
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
   * 获取调货统计
   */
  static async getTransferStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '基地ID无效'
        });
      }

      const result = await TransferRecordService.getTransferStats(baseId);
      res.json(result);

    } catch (error) {
      logger.error('获取调货统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        controller: 'TransferController'
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
   * 导入调货记录（通过名称匹配）
   */
  static async importTransferRecord(req: Request, res: Response) {
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

      const result = await TransferRecordService.importTransferRecord(baseId, req.body, userId);
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('导入调货记录失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
        controller: 'TransferController'
      });

      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : '服务器内部错误'
        });
      }
    }
  }
}
