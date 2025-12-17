import { Request, Response } from 'express';
import { InternationalLogisticsService } from '../services/internationalLogisticsService';
import { logger } from '../utils/logger';

export class InternationalLogisticsController {
  /**
   * 创建国际货运记录
   */
  static async create(req: Request, res: Response) {
    try {
      const { purchaseOrderId } = req.params;
      const data = {
        purchaseOrderId,
        ...req.body
      };

      const record = await InternationalLogisticsService.create(data);

      res.status(201).json({
        success: true,
        data: record,
        message: '国际货运记录创建成功'
      });
    } catch (error: any) {
      logger.error('创建国际货运记录失败', {
        error: error.message,
        purchaseOrderId: req.params.purchaseOrderId,
        body: req.body
      });

      if (error.type === 'VALIDATION_ERROR') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      if (error.type === 'RESOURCE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '创建国际货运记录失败'
      });
    }
  }

  /**
   * 获取采购单的国际货运记录列表
   */
  static async getByPurchaseOrderId(req: Request, res: Response) {
    try {
      const { purchaseOrderId } = req.params;

      const records = await InternationalLogisticsService.getByPurchaseOrderId(purchaseOrderId);

      res.json({
        success: true,
        data: records
      });
    } catch (error: any) {
      logger.error('获取国际货运记录列表失败', {
        error: error.message,
        purchaseOrderId: req.params.purchaseOrderId
      });

      res.status(500).json({
        success: false,
        message: '获取国际货运记录列表失败'
      });
    }
  }

  /**
   * 获取单个国际货运记录
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const record = await InternationalLogisticsService.getById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '国际货运记录不存在'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error: any) {
      logger.error('获取国际货运记录失败', {
        error: error.message,
        id: req.params.id
      });

      res.status(500).json({
        success: false,
        message: '获取国际货运记录失败'
      });
    }
  }

  /**
   * 更新国际货运记录
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const record = await InternationalLogisticsService.update(id, req.body);

      res.json({
        success: true,
        data: record,
        message: '国际货运记录更新成功'
      });
    } catch (error: any) {
      logger.error('更新国际货运记录失败', {
        error: error.message,
        id: req.params.id,
        body: req.body
      });

      if (error.type === 'VALIDATION_ERROR') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      if (error.type === 'RESOURCE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '更新国际货运记录失败'
      });
    }
  }

  /**
   * 删除国际货运记录
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await InternationalLogisticsService.delete(id);

      res.json({
        success: true,
        message: '国际货运记录删除成功'
      });
    } catch (error: any) {
      logger.error('删除国际货运记录失败', {
        error: error.message,
        id: req.params.id
      });

      if (error.type === 'RESOURCE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '删除国际货运记录失败'
      });
    }
  }
}
