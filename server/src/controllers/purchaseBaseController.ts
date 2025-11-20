import { Request, Response } from 'express';
import { PurchaseBaseService } from '../services/purchaseBaseService';
import { logger } from '../utils/logger';

/**
 * 基地采购管理控制器
 */
export class PurchaseBaseController {
  /**
   * 获取基地的采购订单列表
   */
  static async getBasePurchaseOrderList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.getBasePurchaseOrderList(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地采购订单列表失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId, 
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 创建采购订单
   */
  static async createPurchaseOrder(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const orderData = req.body;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const { supplierName, targetLocationId, purchaseDate } = orderData;

      if (!supplierName || !targetLocationId || !purchaseDate) {
        return res.status(400).json({
          success: false,
          message: '供应商名称、目标位置和采购日期不能为空'
        });
      }

      const result = await PurchaseBaseService.createPurchaseOrder(baseId, orderData);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error('创建采购订单失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        body: req.body,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('不存在') ? 404 : 
                        (error as Error).message.includes('不属于') ? 403 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 获取基地采购统计
   */
  static async getBasePurchaseStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.getBasePurchaseStats(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地采购统计失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId, 
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取基地供应商列表
   */
  static async getBaseSuppliers(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.getBaseSuppliers(baseId);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地供应商列表失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId, 
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
