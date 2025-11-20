import { Request, Response } from 'express';
import { BaseService } from '../services/baseService';
import { logger } from '../utils/logger';
import { BaseError, BaseErrorType } from '../types/base';

/**
 * 基地控制器
 */
export class BaseController {
  /**
   * 获取基地列表
   */
  static async getBaseList(req: Request, res: Response) {
    try {
      const { current = 1, pageSize = 10, name, code } = req.query;
      
      const params = {
        current: parseInt(current as string),
        pageSize: parseInt(pageSize as string),
        name: name as string,
        code: code as string,
      };

      const result = await BaseService.getBaseList(params);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      logger.error('获取基地列表失败', { error, service: 'milicard-api' });
      
      if (error instanceof BaseError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type,
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
   * 获取基地详情
   */
  static async getBaseById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const baseId = parseInt(id);

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID',
        });
      }

      const base = await BaseService.getBaseById(baseId);
      
      res.json({
        success: true,
        data: base,
      });
    } catch (error) {
      logger.error('获取基地详情失败', { error, baseId: req.params.id, service: 'milicard-api' });
      
      if (error instanceof BaseError) {
        const statusCode = error.type === BaseErrorType.BASE_NOT_FOUND ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: error.message,
          errorType: error.type,
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
   * 创建基地
   */
  static async createBase(req: Request, res: Response) {
    try {
      const { code, name, description } = req.body;
      const userId = req.user?.id || 'system'; // 暂时使用system用户进行测试

      const base = await BaseService.createBase({ code, name, description }, userId);
      
      res.status(201).json({
        success: true,
        data: base,
      });
    } catch (error) {
      logger.error('创建基地失败', { error, body: req.body, service: 'milicard-api' });
      
      if (error instanceof BaseError) {
        const statusCode = error.type === BaseErrorType.BASE_CODE_EXISTS ? 409 : 400;
        res.status(statusCode).json({
          success: false,
          message: error.message,
          errorType: error.type,
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
   * 更新基地
   */
  static async updateBase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { code, name } = req.body;
      const userId = req.user?.id;
      const baseId = parseInt(id);

      if (isNaN(baseId)) {
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

      const base = await BaseService.updateBase(baseId, { code, name }, userId);
      
      res.json({
        success: true,
        data: base,
      });
    } catch (error) {
      logger.error('更新基地失败', { error, baseId: req.params.id, body: req.body, service: 'milicard-api' });
      
      if (error instanceof BaseError) {
        const statusCode = error.type === BaseErrorType.BASE_NOT_FOUND ? 404 : 
                          error.type === BaseErrorType.BASE_CODE_EXISTS ? 409 : 400;
        res.status(statusCode).json({
          success: false,
          message: error.message,
          errorType: error.type,
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
   * 删除基地
   */
  static async deleteBase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const baseId = parseInt(id);

      if (isNaN(baseId)) {
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

      await BaseService.deleteBase(baseId, userId);
      
      res.json({
        success: true,
        message: '基地删除成功',
      });
    } catch (error) {
      logger.error('删除基地失败', { error, baseId: req.params.id, service: 'milicard-api' });
      
      if (error instanceof BaseError) {
        const statusCode = error.type === BaseErrorType.BASE_NOT_FOUND ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          message: error.message,
          errorType: error.type,
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
