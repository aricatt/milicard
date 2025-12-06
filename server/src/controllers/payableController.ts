import { Request, Response } from 'express';
import { PayableService } from '../services/payableService';
import { logger } from '../utils/logger';

/**
 * 应付管理 Controller
 * 处理应付相关的 HTTP 请求
 */
export class PayableController {
  /**
   * 获取应付列表
   * GET /api/v1/bases/:baseId/payables
   */
  static async getPayableList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const userId = req.user?.id;

      if (!baseId || isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID',
        });
      }

      const {
        current,
        pageSize,
        purchaseName,
        supplierName,
        unpaidOnly,
        startDate,
        endDate,
      } = req.query;

      const result = await PayableService.getPayableList(baseId, {
        current: current ? parseInt(current as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        purchaseName: purchaseName as string,
        supplierName: supplierName as string,
        unpaidOnly: unpaidOnly === 'true',
        startDate: startDate as string,
        endDate: endDate as string,
      });

      logger.info('获取应付列表成功', {
        baseId,
        userId,
        total: result.total,
      });

      return res.json({
        success: true,
        data: result.data,
        total: result.total,
        current: result.current,
        pageSize: result.pageSize,
        stats: result.stats,
      });
    } catch (error) {
      logger.error('获取应付列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      return res.status(500).json({
        success: false,
        message: '获取应付列表失败',
      });
    }
  }

  /**
   * 获取应付详情
   * GET /api/v1/bases/:baseId/payables/:id
   */
  static async getPayableDetail(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const purchaseOrderId = req.params.id;

      if (!baseId || isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID',
        });
      }

      const detail = await PayableService.getPayableDetail(purchaseOrderId, baseId);

      return res.json({
        success: true,
        data: detail,
      });
    } catch (error) {
      logger.error('获取应付详情失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        id: req.params.id,
      });

      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取应付详情失败',
      });
    }
  }

  /**
   * 添加付款
   * POST /api/v1/bases/:baseId/payables/:id/payment
   */
  static async addPayment(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const purchaseOrderId = req.params.id;
      const userId = req.user?.id;

      if (!baseId || isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      const { paymentAmount } = req.body;

      if (!paymentAmount || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: '付款金额必须大于0',
        });
      }

      const result = await PayableService.addPayment(
        purchaseOrderId,
        parseFloat(paymentAmount),
        userId,
        baseId
      );

      logger.info('添加付款成功', {
        baseId,
        userId,
        purchaseOrderId,
        paymentAmount,
      });

      return res.json({
        success: true,
        message: '付款成功',
        data: result,
      });
    } catch (error) {
      logger.error('添加付款失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        id: req.params.id,
      });

      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '添加付款失败',
      });
    }
  }
}

export default PayableController;
