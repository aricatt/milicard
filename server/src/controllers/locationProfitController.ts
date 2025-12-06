import { Request, Response } from 'express';
import { LocationProfitService } from '../services/locationProfitService';
import { logger } from '../utils/logger';

export class LocationProfitController {
  /**
   * 获取点位利润列表
   * GET /api/v1/bases/:baseId/location-profits
   */
  static async getList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const {
        page = '1',
        pageSize = '20',
        pointId,
        startDate,
        endDate,
      } = req.query;

      const result = await LocationProfitService.getList({
        baseId,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        pointId: pointId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    } catch (error) {
      logger.error('获取点位利润列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位利润列表失败',
      });
    }
  }

  /**
   * 获取单条利润记录
   * GET /api/v1/bases/:baseId/location-profits/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const record = await LocationProfitService.getById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '记录不存在',
        });
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      logger.error('获取利润记录详情失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取利润记录详情失败',
      });
    }
  }

  /**
   * 计算并创建点位利润记录
   * POST /api/v1/bases/:baseId/location-profits
   */
  static async create(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录',
        });
      }

      const { pointId, startDate, endDate, notes } = req.body;

      if (!pointId) {
        return res.status(400).json({
          success: false,
          message: '请选择点位',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '请选择日期范围',
        });
      }

      // 验证日期格式和逻辑
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: '日期格式无效',
        });
      }

      if (start > end) {
        return res.status(400).json({
          success: false,
          message: '开始日期不能晚于结束日期',
        });
      }

      const result = await LocationProfitService.calculateProfit({
        baseId,
        pointId,
        startDate,
        endDate,
        notes,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: '利润计算完成',
      });
    } catch (error) {
      logger.error('计算点位利润失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '计算点位利润失败',
      });
    }
  }

  /**
   * 删除利润记录
   * DELETE /api/v1/bases/:baseId/location-profits/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await LocationProfitService.delete(id);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除利润记录失败', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });

      const statusCode = error instanceof Error && error.message === '记录不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除失败',
      });
    }
  }

  /**
   * 预览利润计算（不保存）
   * POST /api/v1/bases/:baseId/location-profits/preview
   */
  static async preview(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { pointId, startDate, endDate } = req.body;

      if (!pointId) {
        return res.status(400).json({
          success: false,
          message: '请选择点位',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '请选择日期范围',
        });
      }

      const result = await LocationProfitService.previewProfit({
        baseId,
        pointId,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('预览利润计算失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '预览失败',
      });
    }
  }

  /**
   * 获取可选点位列表
   * GET /api/v1/bases/:baseId/location-profits/available-points
   */
  static async getAvailablePoints(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { keyword } = req.query;

      const points = await LocationProfitService.getAvailablePoints(baseId, keyword as string);

      res.json({
        success: true,
        data: points,
      });
    } catch (error) {
      logger.error('获取可选点位列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取可选点位列表失败',
      });
    }
  }
}
