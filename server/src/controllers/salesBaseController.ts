import { Request, Response } from 'express';
import { SalesBaseService } from '../services/salesBaseService';
import { logger } from '../utils/logger';

/**
 * 基地销售管理控制器
 */
export class SalesBaseController {
  /**
   * 获取基地的客户列表
   */
  static async getBaseCustomerList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await SalesBaseService.getBaseCustomerList(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地客户列表失败', { 
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
   * 获取基地的销售订单列表
   */
  static async getBaseDistributionOrderList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await SalesBaseService.getBaseDistributionOrderList(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地销售订单列表失败', { 
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
   * 创建客户
   */
  static async createCustomer(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const customerData = req.body;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const { name } = customerData;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: '客户名称不能为空'
        });
      }

      const result = await SalesBaseService.createCustomer(baseId, customerData);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error('创建客户失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        body: req.body,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('已存在') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }

  /**
   * 获取基地销售统计
   */
  static async getBaseSalesStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await SalesBaseService.getBaseSalesStats(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地销售统计失败', { 
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
