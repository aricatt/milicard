import { Request, Response } from 'express';
import { PointService } from '../services/pointService';
import { logger } from '../utils/logger';

export class PointController {
  /**
   * 获取点位列表
   * GET /api/v1/bases/:baseId/points
   */
  static async getList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const {
        page = '1',
        pageSize = '20',
        keyword,
        isActive,
        ownerId,
        dealerId,
      } = req.query;

      const result = await PointService.getList({
        baseId,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        keyword: keyword as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        ownerId: ownerId as string,
        dealerId: dealerId as string,
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
      logger.error('获取点位列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位列表失败',
      });
    }
  }

  /**
   * 获取点位详情
   * GET /api/v1/bases/:baseId/points/:pointId
   */
  static async getById(req: Request, res: Response) {
    try {
      const { pointId } = req.params;

      const point = await PointService.getById(pointId);

      res.json({
        success: true,
        data: point,
      });
    } catch (error) {
      logger.error('获取点位详情失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
      });

      const statusCode = error instanceof Error && error.message === '点位不存在' ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位详情失败',
      });
    }
  }

  /**
   * 创建点位
   * POST /api/v1/bases/:baseId/points
   */
  static async create(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { name, address, contactPerson, contactPhone, ownerId, dealerId, notes } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: '店铺名称不能为空',
        });
      }

      const point = await PointService.create({
        name,
        address,
        contactPerson,
        contactPhone,
        baseId,
        ownerId,
        dealerId,
        notes,
      });

      res.status(201).json({
        success: true,
        data: point,
        message: '创建点位成功',
      });
    } catch (error) {
      logger.error('创建点位失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建点位失败',
      });
    }
  }

  /**
   * 更新点位
   * PUT /api/v1/bases/:baseId/points/:pointId
   */
  static async update(req: Request, res: Response) {
    try {
      const { pointId } = req.params;
      const { name, address, contactPerson, contactPhone, ownerId, dealerId, notes, isActive } = req.body;

      const point = await PointService.update(pointId, {
        name,
        address,
        contactPerson,
        contactPhone,
        ownerId,
        dealerId,
        notes,
        isActive,
      });

      res.json({
        success: true,
        data: point,
        message: '更新点位成功',
      });
    } catch (error) {
      logger.error('更新点位失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
        body: req.body,
      });

      const statusCode = error instanceof Error && error.message === '点位不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新点位失败',
      });
    }
  }

  /**
   * 删除点位
   * DELETE /api/v1/bases/:baseId/points/:pointId
   */
  static async delete(req: Request, res: Response) {
    try {
      const { pointId } = req.params;

      await PointService.delete(pointId);

      res.json({
        success: true,
        message: '删除点位成功',
      });
    } catch (error) {
      logger.error('删除点位失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
      });

      const statusCode = error instanceof Error && error.message === '点位不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除点位失败',
      });
    }
  }

  /**
   * 获取点位库存
   * GET /api/v1/bases/:baseId/points/:pointId/inventory
   */
  static async getInventory(req: Request, res: Response) {
    try {
      const { pointId } = req.params;

      const inventory = await PointService.getInventory(pointId);

      res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      logger.error('获取点位库存失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位库存失败',
      });
    }
  }

  /**
   * 获取点位订单列表
   * GET /api/v1/bases/:baseId/points/:pointId/orders
   */
  static async getOrders(req: Request, res: Response) {
    try {
      const { pointId } = req.params;
      const { page = '1', pageSize = '20', status } = req.query;

      const result = await PointService.getOrders(pointId, {
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        status: status as string,
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
      logger.error('获取点位订单失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位订单失败',
      });
    }
  }

  /**
   * 获取可选用户列表（用于选择老板/经销商）
   * GET /api/v1/bases/:baseId/points/available-users
   */
  static async getAvailableUsers(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { role } = req.query;

      const users = await PointService.getAvailableUsers(baseId, role as string);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('获取可选用户列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取可选用户列表失败',
      });
    }
  }
}
