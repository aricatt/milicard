import { Request, Response } from 'express';
import { PointOrderService } from '../services/pointOrderService';
import { logger } from '../utils/logger';

export class PointOrderController {
  /**
   * 获取点位订单列表
   * GET /api/v1/bases/:baseId/point-orders
   */
  static async getList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const {
        page = '1',
        pageSize = '20',
        keyword,
        pointId,
        status,
        paymentStatus,
        startDate,
        endDate,
      } = req.query;

      const dataFilter = req.permissionContext?.dataFilter || {};

      const result = await PointOrderService.getList({
        baseId,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        keyword: keyword as string,
        pointId: pointId as string,
        status: status as any,
        paymentStatus: paymentStatus as any,
        startDate: startDate as string,
        endDate: endDate as string,
        dataFilter,
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
      logger.error('获取点位订单列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取点位订单列表失败',
      });
    }
  }

  /**
   * 获取订单详情
   * GET /api/v1/bases/:baseId/point-orders/:orderId
   */
  static async getById(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await PointOrderService.getById(orderId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error('获取订单详情失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取订单详情失败',
      });
    }
  }

  /**
   * 创建点位订单
   * POST /api/v1/bases/:baseId/point-orders
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

      const { pointId, orderDate, shippingAddress, shippingPhone, customerNotes, items } = req.body;

      if (!pointId) {
        return res.status(400).json({
          success: false,
          message: '请选择点位',
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请添加商品',
        });
      }

      const order = await PointOrderService.create({
        pointId,
        baseId,
        orderDate: orderDate || new Date().toISOString().split('T')[0],
        shippingAddress,
        shippingPhone,
        customerNotes,
        createdBy: userId,
        items,
      });

      res.status(201).json({
        success: true,
        data: order,
        message: '创建订单成功',
      });
    } catch (error) {
      logger.error('创建点位订单失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建订单失败',
      });
    }
  }

  /**
   * 更新订单
   * PUT /api/v1/bases/:baseId/point-orders/:orderId
   */
  static async update(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未登录',
        });
      }

      const order = await PointOrderService.update(orderId, req.body, userId);

      res.json({
        success: true,
        data: order,
        message: '更新订单成功',
      });
    } catch (error) {
      logger.error('更新订单失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
        body: req.body,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新订单失败',
      });
    }
  }

  /**
   * 删除订单
   * DELETE /api/v1/bases/:baseId/point-orders/:orderId
   */
  static async delete(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      await PointOrderService.delete(orderId);

      res.json({
        success: true,
        message: '删除订单成功',
      });
    } catch (error) {
      logger.error('删除订单失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除订单失败',
      });
    }
  }

  /**
   * 获取订单统计
   * GET /api/v1/bases/:baseId/point-orders/stats
   */
  static async getStats(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { startDate, endDate } = req.query;

      const stats = await PointOrderService.getStats(baseId, {
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取订单统计失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取订单统计失败',
      });
    }
  }

  /**
   * 获取可选点位列表
   * GET /api/v1/bases/:baseId/point-orders/available-points
   */
  static async getAvailablePoints(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { keyword } = req.query;

      const points = await PointOrderService.getAvailablePoints(baseId, keyword as string);

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

  /**
   * 获取可选商品列表
   * GET /api/v1/bases/:baseId/point-orders/available-goods
   */
  static async getAvailableGoods(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId, 10);
      const { keyword, pointId } = req.query;

      const goods = await PointOrderService.getAvailableGoods(
        baseId, 
        pointId as string, 
        keyword as string
      );

      res.json({
        success: true,
        data: goods,
      });
    } catch (error) {
      logger.error('获取可选商品列表失败', {
        error: error instanceof Error ? error.message : String(error),
        baseId: req.params.baseId,
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取可选商品列表失败',
      });
    }
  }

  /**
   * 发货
   * POST /api/v1/bases/:baseId/point-orders/:orderId/ship
   */
  static async ship(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { deliveryPerson, deliveryPhone, trackingNumber } = req.body;

      const order = await PointOrderService.ship(orderId, {
        deliveryPerson,
        deliveryPhone,
        trackingNumber,
      });

      res.json({
        success: true,
        message: '发货成功',
        data: order,
      });
    } catch (error) {
      logger.error('发货失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '发货失败',
      });
    }
  }

  /**
   * 确认送达
   * POST /api/v1/bases/:baseId/point-orders/:orderId/deliver
   */
  static async deliver(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await PointOrderService.deliver(orderId);

      res.json({
        success: true,
        message: '确认送达成功',
        data: order,
      });
    } catch (error) {
      logger.error('确认送达失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '确认送达失败',
      });
    }
  }

  /**
   * 确认收款
   * POST /api/v1/bases/:baseId/point-orders/:orderId/payment
   */
  static async confirmPayment(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { amount, paymentMethod, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: '收款金额必须大于0',
        });
      }

      const order = await PointOrderService.confirmPayment(orderId, {
        amount: Number(amount),
        paymentMethod,
        notes,
      });

      res.json({
        success: true,
        message: '收款确认成功',
        data: order,
      });
    } catch (error) {
      logger.error('收款确认失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '收款确认失败',
      });
    }
  }

  /**
   * 完成订单
   * POST /api/v1/bases/:baseId/point-orders/:orderId/complete
   */
  static async complete(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await PointOrderService.complete(orderId);

      res.json({
        success: true,
        message: '订单已完成',
        data: order,
      });
    } catch (error) {
      logger.error('完成订单失败', {
        error: error instanceof Error ? error.message : String(error),
        orderId: req.params.orderId,
      });

      const statusCode = error instanceof Error && error.message === '订单不存在' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '完成订单失败',
      });
    }
  }
}
