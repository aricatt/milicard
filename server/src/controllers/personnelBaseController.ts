import { Request, Response } from 'express';
import { PersonnelBaseService } from '../services/personnelBaseService';
import { logger } from '../utils/logger';

export class PersonnelBaseController {
  /**
   * 获取基地人员列表
   * GET /api/v1/bases/:baseId/personnel
   */
  static async getBasePersonnelList(req: Request, res: Response) {
    try {
      const { baseId } = req.params;
      const params = req.query;

      const result = await PersonnelBaseService.getBasePersonnelList(Number(baseId), params);

      res.json(result);
    } catch (error) {
      logger.error('获取基地人员列表失败', { error, service: 'milicard-api' });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 创建人员
   * POST /api/v1/bases/:baseId/personnel
   */
  static async createPersonnel(req: Request, res: Response) {
    try {
      const { baseId } = req.params;
      const personnelData = req.body;
      const createdBy = req.user?.id || 'system'; // 从JWT中获取用户ID

      // 基本验证
      if (!personnelData.name || !personnelData.role) {
        return res.status(400).json({
          success: false,
          message: '姓名和角色为必填项'
        });
      }

      const result = await PersonnelBaseService.createPersonnel(
        Number(baseId),
        personnelData,
        createdBy
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('创建人员失败', { error, service: 'milicard-api' });
      
      // 业务逻辑错误（如重名）返回400
      if (error instanceof Error && error.message.includes('已存在同名')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 更新人员
   * PUT /api/v1/bases/:baseId/personnel/:personnelId
   */
  static async updatePersonnel(req: Request, res: Response) {
    try {
      const { baseId, personnelId } = req.params;
      const personnelData = req.body;
      const updatedBy = req.user?.id || 'system'; // 从JWT中获取用户ID

      // 基本验证
      if (!personnelData.name || !personnelData.role) {
        return res.status(400).json({
          success: false,
          message: '姓名和角色为必填项'
        });
      }

      const result = await PersonnelBaseService.updatePersonnel(
        Number(baseId),
        personnelId,
        personnelData,
        updatedBy
      );

      res.json(result);
    } catch (error) {
      logger.error('更新人员失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 业务逻辑错误（如重名）返回400
      if (error instanceof Error && error.message.includes('已存在同名')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 删除人员
   * DELETE /api/v1/bases/:baseId/personnel/:personnelId
   */
  static async deletePersonnel(req: Request, res: Response) {
    try {
      const { baseId, personnelId } = req.params;

      const result = await PersonnelBaseService.deletePersonnel(
        Number(baseId),
        personnelId
      );

      res.json(result);
    } catch (error) {
      logger.error('删除人员失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取基地人员统计
   * GET /api/v1/bases/:baseId/personnel/stats
   */
  static async getBasePersonnelStats(req: Request, res: Response) {
    try {
      const { baseId } = req.params;

      const result = await PersonnelBaseService.getBasePersonnelStats(Number(baseId));

      res.json(result);
    } catch (error) {
      logger.error('获取基地人员统计失败', { error, service: 'milicard-api' });
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取人员详情
   * GET /api/v1/bases/:baseId/personnel/:personnelId
   */
  static async getPersonnelById(req: Request, res: Response) {
    try {
      const { baseId, personnelId } = req.params;

      const result = await PersonnelBaseService.getPersonnelById(
        Number(baseId),
        personnelId
      );

      res.json(result);
    } catch (error) {
      logger.error('获取人员详情失败', { error, service: 'milicard-api' });
      
      if (error instanceof Error && error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}
