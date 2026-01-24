import { Request, Response } from 'express';
import { GlobalSettingService } from '../services/globalSettingService';
import { logger } from '../utils/logger';

export class GlobalSettingController {
  /**
   * 获取全局配置列表
   */
  static async getList(req: Request, res: Response) {
    try {
      const { page, pageSize, search, category, isActive } = req.query;

      const result = await GlobalSettingService.getList({
        page: page ? parseInt(page as string, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : 20,
        search: search as string,
        category: category as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('获取全局配置列表失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '获取全局配置列表失败',
      });
    }
  }

  /**
   * 根据 ID 获取配置
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const setting = await GlobalSettingService.getById(id);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '配置不存在',
        });
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error) {
      logger.error('获取全局配置失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      res.status(500).json({
        success: false,
        message: '获取全局配置失败',
      });
    }
  }

  /**
   * 根据 key 获取配置
   */
  static async getByKey(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const setting = await GlobalSettingService.getByKey(key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '配置不存在',
        });
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error) {
      logger.error('获取全局配置失败', {
        error: error instanceof Error ? error.message : String(error),
        key: req.params.key,
      });
      res.status(500).json({
        success: false,
        message: '获取全局配置失败',
      });
    }
  }

  /**
   * 获取配置值（仅返回 value）
   */
  static async getValue(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const value = await GlobalSettingService.getValue(key);

      res.json({
        success: true,
        data: value,
      });
    } catch (error) {
      logger.error('获取配置值失败', {
        error: error instanceof Error ? error.message : String(error),
        key: req.params.key,
      });
      res.status(500).json({
        success: false,
        message: '获取配置值失败',
      });
    }
  }

  /**
   * 批量获取配置值
   */
  static async getValues(req: Request, res: Response) {
    try {
      const { keys } = req.body;

      if (!Array.isArray(keys)) {
        return res.status(400).json({
          success: false,
          message: 'keys 必须是数组',
        });
      }

      const values = await GlobalSettingService.getValues(keys);

      res.json({
        success: true,
        data: values,
      });
    } catch (error) {
      logger.error('批量获取配置值失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '批量获取配置值失败',
      });
    }
  }

  /**
   * 创建配置
   */
  static async create(req: Request, res: Response) {
    try {
      const { key, value, description, category, isActive, isSystem } = req.body;
      const userId = (req as any).user?.id;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: key, value',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权：缺少用户信息',
        });
      }

      const setting = await GlobalSettingService.create(
        {
          key,
          value,
          description,
          category,
          isActive,
          isSystem,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: setting,
        message: '创建成功',
      });
    } catch (error) {
      logger.error('创建全局配置失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      });

      const message = error instanceof Error ? error.message : '创建全局配置失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 更新配置
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { key, value, description, category, isActive, isSystem } = req.body;

      const setting = await GlobalSettingService.update(id, {
        key,
        value,
        description,
        category,
        isActive,
        isSystem,
      });

      res.json({
        success: true,
        data: setting,
        message: '更新成功',
      });
    } catch (error) {
      logger.error('更新全局配置失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
        body: req.body,
      });

      const message = error instanceof Error ? error.message : '更新全局配置失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 删除配置
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await GlobalSettingService.delete(id);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除全局配置失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });

      const message = error instanceof Error ? error.message : '删除全局配置失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }

  /**
   * 获取所有分类
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await GlobalSettingService.getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('获取配置分类失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: '获取配置分类失败',
      });
    }
  }

  /**
   * 批量设置配置值
   */
  static async setValues(req: Request, res: Response) {
    try {
      const { values } = req.body;
      const userId = (req as any).user?.id;

      if (!Array.isArray(values)) {
        return res.status(400).json({
          success: false,
          message: 'values 必须是数组',
        });
      }

      const results = await GlobalSettingService.setValues(values, userId);

      res.json({
        success: true,
        data: results,
        message: '批量设置成功',
      });
    } catch (error) {
      logger.error('批量设置配置值失败', {
        error: error instanceof Error ? error.message : String(error),
      });

      const message = error instanceof Error ? error.message : '批量设置配置值失败';
      res.status(400).json({
        success: false,
        message,
      });
    }
  }
}
