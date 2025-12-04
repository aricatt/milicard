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

      // 从权限中间件获取数据过滤条件
      const dataFilter = req.permissionContext?.dataFilter || {};

      const result = await PointService.getList({
        baseId,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        keyword: keyword as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        ownerId: ownerId as string,
        dealerId: dealerId as string,
        dataFilter, // 传递数据权限过滤条件
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

  /**
   * 获取点位可采购商品列表
   * GET /api/v1/bases/:baseId/points/:pointId/goods
   */
  static async getPointGoods(req: Request, res: Response) {
    try {
      const { pointId } = req.params;

      const pointGoods = await PointService.getPointGoods(pointId);

      res.json({
        success: true,
        data: pointGoods,
      });
    } catch (error) {
      logger.error('获取点位可采购商品失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位可采购商品失败',
      });
    }
  }

  /**
   * 添加点位可采购商品
   * POST /api/v1/bases/:baseId/points/:pointId/goods
   */
  static async addPointGoods(req: Request, res: Response) {
    try {
      const { pointId } = req.params;
      const { goodsId, maxBoxQuantity, maxPackQuantity, unitPrice } = req.body;

      if (!goodsId) {
        return res.status(400).json({
          success: false,
          message: '请选择商品',
        });
      }

      const pointGoods = await PointService.addPointGoods(pointId, {
        goodsId,
        maxBoxQuantity,
        maxPackQuantity,
        unitPrice,
      });

      res.status(201).json({
        success: true,
        data: pointGoods,
        message: '添加成功',
      });
    } catch (error) {
      logger.error('添加点位可采购商品失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '添加失败',
      });
    }
  }

  /**
   * 更新点位可采购商品
   * PUT /api/v1/bases/:baseId/points/:pointId/goods/:goodsConfigId
   */
  static async updatePointGoods(req: Request, res: Response) {
    try {
      const { goodsConfigId } = req.params;
      const { maxBoxQuantity, maxPackQuantity, unitPrice, isActive } = req.body;

      const pointGoods = await PointService.updatePointGoods(goodsConfigId, {
        maxBoxQuantity,
        maxPackQuantity,
        unitPrice,
        isActive,
      });

      res.json({
        success: true,
        data: pointGoods,
        message: '更新成功',
      });
    } catch (error) {
      logger.error('更新点位可采购商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsConfigId: req.params.goodsConfigId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '更新失败',
      });
    }
  }

  /**
   * 删除点位可采购商品
   * DELETE /api/v1/bases/:baseId/points/:pointId/goods/:goodsConfigId
   */
  static async deletePointGoods(req: Request, res: Response) {
    try {
      const { goodsConfigId } = req.params;

      await PointService.deletePointGoods(goodsConfigId);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除点位可采购商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsConfigId: req.params.goodsConfigId,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '删除失败',
      });
    }
  }

  /**
   * 批量设置点位可采购商品
   * POST /api/v1/bases/:baseId/points/:pointId/goods/batch
   */
  static async batchSetPointGoods(req: Request, res: Response) {
    try {
      const { pointId } = req.params;
      const { goodsIds } = req.body;

      if (!Array.isArray(goodsIds)) {
        return res.status(400).json({
          success: false,
          message: '商品ID列表格式错误',
        });
      }

      const pointGoods = await PointService.batchSetPointGoods(pointId, goodsIds);

      res.json({
        success: true,
        data: pointGoods,
        message: '设置成功',
      });
    } catch (error) {
      logger.error('批量设置点位可采购商品失败', {
        error: error instanceof Error ? error.message : String(error),
        pointId: req.params.pointId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '设置失败',
      });
    }
  }
}
