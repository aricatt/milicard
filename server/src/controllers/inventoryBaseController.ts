import { Request, Response } from 'express';
import { InventoryBaseService } from '../services/inventoryBaseService';
import { logger } from '../utils/logger';

/**
 * 基地库存管理控制器
 */
export class InventoryBaseController {
  /**
   * 获取基地的库存列表
   */
  static async getBaseInventoryList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await InventoryBaseService.getBaseInventoryList(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地库存列表失败', { 
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
   * 获取基地的位置列表
   */
  static async getBaseLocations(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await InventoryBaseService.getBaseLocations(baseId);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地位置列表失败', { 
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
   * 获取基地库存统计
   */
  static async getBaseInventoryStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await InventoryBaseService.getBaseInventoryStats(baseId);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地库存统计失败', { 
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
   * 调整库存数量
   */
  static async adjustInventory(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const inventoryId = req.params.inventoryId;
      const { newQuantity, reason } = req.body;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      if (!inventoryId) {
        return res.status(400).json({
          success: false,
          message: '库存ID不能为空'
        });
      }

      if (newQuantity === undefined || newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: '新数量必须大于等于0'
        });
      }

      const result = await InventoryBaseService.adjustInventory(
        baseId, 
        inventoryId, 
        parseInt(newQuantity), 
        reason || ''
      );
      
      res.json(result);
    } catch (error) {
      logger.error('调整库存失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        inventoryId: req.params.inventoryId,
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
