import { Request, Response } from 'express';
import { LocationBaseService } from '../services/locationBaseService';
import { logger } from '../utils/logger';

/**
 * 位置基地控制器
 */
export class LocationBaseController {
  /**
   * 获取基地位置统计
   */
  static async getBaseLocationStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      
      if (!baseId) {
        return res.status(400).json({
          success: false,
          message: '基地ID不能为空',
        });
      }

      const result = await LocationBaseService.getBaseLocationStats(baseId);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地位置统计失败', { error, service: 'milicard-api' });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取基地的位置列表
   */
  static async getBaseLocationList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      
      if (!baseId) {
        return res.status(400).json({
          success: false,
          message: '基地ID不能为空',
        });
      }

      const result = await LocationBaseService.getBaseLocationList(baseId, req.query);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地位置列表失败', { error, service: 'milicard-api' });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取位置详情
   */
  static async getLocationById(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const locationId = parseInt(req.params.locationId);
      
      if (!baseId || !locationId) {
        return res.status(400).json({
          success: false,
          message: '基地ID和位置ID不能为空',
        });
      }

      const result = await LocationBaseService.getLocationById(baseId, locationId);
      
      res.json(result);
    } catch (error) {
      logger.error('获取位置详情失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message === '位置不存在') {
        res.status(404).json({
          success: false,
          message: '位置不存在',
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误',
        });
      }
    }
  }

  /**
   * 创建位置
   */
  static async createLocation(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const locationData = req.body;
      
      if (!baseId) {
        return res.status(400).json({
          success: false,
          message: '基地ID不能为空',
        });
      }

      // 验证必填字段
      if (!locationData.name || !locationData.type) {
        return res.status(400).json({
          success: false,
          message: '位置名称和类型不能为空',
        });
      }

      // 验证位置类型
      if (!['MAIN_WAREHOUSE', 'WAREHOUSE', 'LIVE_ROOM'].includes(locationData.type)) {
        return res.status(400).json({
          success: false,
          message: '位置类型必须是 MAIN_WAREHOUSE、WAREHOUSE 或 LIVE_ROOM',
        });
      }

      const result = await LocationBaseService.createLocation(baseId, locationData);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error('创建位置失败', { error, service: 'milicard-api' });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 更新位置
   */
  static async updateLocation(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const locationId = parseInt(req.params.locationId);
      const locationData = req.body;
      
      if (!baseId || !locationId) {
        return res.status(400).json({
          success: false,
          message: '基地ID和位置ID不能为空',
        });
      }

      // 验证位置类型（如果提供）
      if (locationData.type && !['MAIN_WAREHOUSE', 'WAREHOUSE', 'LIVE_ROOM'].includes(locationData.type)) {
        return res.status(400).json({
          success: false,
          message: '位置类型必须是 MAIN_WAREHOUSE、WAREHOUSE 或 LIVE_ROOM',
        });
      }

      const result = await LocationBaseService.updateLocation(baseId, locationId, locationData);
      
      res.json(result);
    } catch (error) {
      logger.error('更新位置失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        res.status(404).json({
          success: false,
          message: '位置不存在',
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误',
        });
      }
    }
  }

  /**
   * 删除位置
   */
  static async deleteLocation(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const locationId = parseInt(req.params.locationId);
      
      if (!baseId || !locationId) {
        return res.status(400).json({
          success: false,
          message: '基地ID和位置ID不能为空',
        });
      }

      const result = await LocationBaseService.deleteLocation(baseId, locationId);
      
      res.json(result);
    } catch (error) {
      logger.error('删除位置失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        res.status(404).json({
          success: false,
          message: '位置不存在',
        });
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误',
        });
      }
    }
  }
}
