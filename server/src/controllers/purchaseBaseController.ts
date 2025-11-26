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

      const { supplierName, purchaseDate } = orderData;

      if (!supplierName || !purchaseDate) {
        return res.status(400).json({
          success: false,
          message: '供应商名称和采购日期不能为空'
        });
      }

      // 从认证中间件获取用户ID
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const result = await PurchaseBaseService.createPurchaseOrder(baseId, orderData, userId);
      
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
   * 删除采购订单
   */
  static async deletePurchaseOrder(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const orderId = req.params.orderId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.deletePurchaseOrder(baseId, orderId);
      
      res.json(result);
    } catch (error) {
      logger.error('删除采购订单失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        orderId: req.params.orderId,
        service: 'milicard-api' 
      });
      
      res.status(500).json({
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

  /**
   * 创建基地供应商
   */
  static async createBaseSupplier(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.createBaseSupplier(baseId, req.body);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error('创建基地供应商失败', { 
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
   * 更新基地供应商
   */
  static async updateBaseSupplier(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const supplierId = req.params.supplierId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.updateBaseSupplier(baseId, supplierId, req.body);
      
      res.json(result);
    } catch (error) {
      logger.error('更新基地供应商失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        supplierId: req.params.supplierId,
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 删除基地供应商
   */
  static async deleteBaseSupplier(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const supplierId = req.params.supplierId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await PurchaseBaseService.deleteBaseSupplier(baseId, supplierId);
      
      res.json(result);
    } catch (error) {
      logger.error('删除基地供应商失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        supplierId: req.params.supplierId,
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
