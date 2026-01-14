import { Request, Response } from 'express';
import { PurchaseBaseService } from '../services/purchaseBaseService';
import * as logisticsService from '../services/logisticsService';
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

      // 从权限中间件获取数据过滤条件
      const dataFilter = req.permissionContext?.dataFilter || {};

      const result = await PurchaseBaseService.getBasePurchaseOrderList(baseId, params, dataFilter);
      
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
   * 导入采购订单（支持通过商品名称关联）
   */
  static async importPurchaseOrder(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const orderData = req.body;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const { supplierName, purchaseDate, items } = orderData;

      if (!supplierName || !purchaseDate) {
        return res.status(400).json({
          success: false,
          message: '供应商和采购日期不能为空'
        });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: '采购明细不能为空'
        });
      }

      // 获取用户ID
      const userId = (req as any).user?.id || 'system';

      const result = await PurchaseBaseService.importPurchaseOrder(baseId, orderData, userId);
      
      res.json(result);
    } catch (error) {
      logger.error('导入采购订单失败', { 
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

  /**
   * 获取采购订单物流信息
   */
  static async getPurchaseOrderLogistics(req: Request, res: Response) {
    try {
      const orderId = req.params.orderId;

      const result = await logisticsService.getPurchaseOrderLogistics(orderId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('获取采购订单物流信息失败', { 
        error: (error as Error).message, 
        orderId: req.params.orderId,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('不存在') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 添加物流单号
   */
  static async addLogisticsRecord(req: Request, res: Response) {
    try {
      const orderId = req.params.orderId;
      const { trackingNumber } = req.body;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          message: '物流单号不能为空'
        });
      }

      const result = await logisticsService.addLogisticsRecord(orderId, trackingNumber);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('添加物流单号失败', { 
        error: (error as Error).message, 
        orderId: req.params.orderId,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('不存在') ? 404 : 
                        (error as Error).message.includes('已存在') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 删除物流记录
   */
  static async deleteLogisticsRecord(req: Request, res: Response) {
    try {
      const logisticsId = req.params.logisticsId;

      await logisticsService.deleteLogisticsRecord(logisticsId);
      
      res.json({
        success: true,
        message: '物流记录已删除'
      });
    } catch (error) {
      logger.error('删除物流记录失败', { 
        error: (error as Error).message, 
        logisticsId: req.params.logisticsId,
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 刷新单个物流记录
   */
  static async refreshLogisticsRecord(req: Request, res: Response) {
    try {
      const logisticsId = req.params.logisticsId;
      const { mobile } = req.body;

      const result = await logisticsService.refreshLogisticsRecord(logisticsId, mobile);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('刷新物流记录失败', { 
        error: (error as Error).message, 
        logisticsId: req.params.logisticsId,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('不存在') ? 404 : 
                        (error as Error).message.includes('太频繁') ? 429 :
                        (error as Error).message.includes('已签收') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 更新采购订单
   */
  static async updatePurchaseOrder(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const orderId = req.params.orderId;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        });
      }

      const result = await PurchaseBaseService.updatePurchaseOrder(baseId, orderId, req.body, userId);
      
      res.json(result);
    } catch (error) {
      logger.error('更新采购订单失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        orderId: req.params.orderId,
        body: req.body,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('不存在') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }
}
