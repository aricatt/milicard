/**
 * 销售管理控制器
 */

import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { SalesService } from '../services/salesService'
import { 
  CustomerQueryParams,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  SalesOrderQueryParams,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  SalesError 
} from '../types/sales'

export class SalesController {
  // ================================
  // 客户管理控制器
  // ================================

  /**
   * 获取客户列表
   */
  static async getCustomerList(req: Request, res: Response): Promise<void> {
    try {
      const params = req.query as unknown as CustomerQueryParams
      const result = await SalesService.getCustomerList(params)

      res.json({
        success: true,
        message: '获取客户列表成功',
        data: result
      })
    } catch (error) {
      logger.error('获取客户列表失败', { 
        error, 
        query: req.query,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 获取客户详情
   */
  static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await SalesService.getCustomerById(id)

      res.json({
        success: true,
        message: '获取客户详情成功',
        data: result
      })
    } catch (error) {
      logger.error('获取客户详情失败', { 
        error, 
        customerId: req.params.id,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(404).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 创建客户
   */
  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateCustomerRequest
      const userId = req.user!.id
      
      const result = await SalesService.createCustomer(data, userId)

      logger.info('客户创建成功', {
        customerId: result.id,
        customerName: result.name,
        userId
      })

      res.status(201).json({
        success: true,
        message: '创建客户成功',
        data: result
      })
    } catch (error) {
      logger.error('创建客户失败', { 
        error, 
        data: req.body,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 更新客户
   */
  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data = req.body as UpdateCustomerRequest
      const userId = req.user!.id
      
      const result = await SalesService.updateCustomer(id, data, userId)

      logger.info('客户更新成功', {
        customerId: id,
        userId
      })

      res.json({
        success: true,
        message: '更新客户成功',
        data: result
      })
    } catch (error) {
      logger.error('更新客户失败', { 
        error, 
        customerId: req.params.id,
        data: req.body,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 删除客户
   */
  static async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      
      await SalesService.deleteCustomer(id, userId)

      logger.info('客户删除成功', {
        customerId: id,
        userId
      })

      res.json({
        success: true,
        message: '删除客户成功'
      })
    } catch (error) {
      logger.error('删除客户失败', { 
        error, 
        customerId: req.params.id,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  // ================================
  // 销售订单管理控制器
  // ================================

  /**
   * 获取销售订单列表
   */
  static async getSalesOrderList(req: Request, res: Response): Promise<void> {
    try {
      const params = req.query as unknown as SalesOrderQueryParams
      const result = await SalesService.getSalesOrderList(params)

      res.json({
        success: true,
        message: '获取销售订单列表成功',
        data: result
      })
    } catch (error) {
      logger.error('获取销售订单列表失败', { 
        error, 
        query: req.query,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 获取销售订单详情
   */
  static async getSalesOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await SalesService.getSalesOrderById(id)

      res.json({
        success: true,
        message: '获取销售订单详情成功',
        data: result
      })
    } catch (error) {
      logger.error('获取销售订单详情失败', { 
        error, 
        orderId: req.params.id,
        userId: req.user?.id 
      })

      if (error instanceof SalesError) {
        res.status(404).json({
          success: false,
          message: error.message,
          errorType: error.type
        })
      } else {
        res.status(500).json({
          success: false,
          message: '服务器内部错误'
        })
      }
    }
  }

  /**
   * 创建销售订单
   */
  static async createSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateSalesOrderRequest
      const userId = req.user!.id
      
      // TODO: 实现创建销售订单逻辑
      res.status(501).json({
        success: false,
        message: '功能暂未实现'
      })
    } catch (error) {
      logger.error('创建销售订单失败', { 
        error, 
        data: req.body,
        userId: req.user?.id 
      })

      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }

  /**
   * 更新销售订单
   */
  static async updateSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data = req.body as UpdateSalesOrderRequest
      const userId = req.user!.id
      
      // TODO: 实现更新销售订单逻辑
      res.status(501).json({
        success: false,
        message: '功能暂未实现'
      })
    } catch (error) {
      logger.error('更新销售订单失败', { 
        error, 
        orderId: req.params.id,
        data: req.body,
        userId: req.user?.id 
      })

      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }

  /**
   * 删除销售订单
   */
  static async deleteSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user!.id
      
      // TODO: 实现删除销售订单逻辑
      res.status(501).json({
        success: false,
        message: '功能暂未实现'
      })
    } catch (error) {
      logger.error('删除销售订单失败', { 
        error, 
        orderId: req.params.id,
        userId: req.user?.id 
      })

      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }

  /**
   * 获取销售统计
   */
  static async getSalesStats(req: Request, res: Response): Promise<void> {
    try {
      const params = req.query
      const result = await SalesService.getSalesStats(params)

      res.json({
        success: true,
        message: '获取销售统计成功',
        data: result
      })
    } catch (error) {
      logger.error('获取销售统计失败', { 
        error, 
        query: req.query,
        userId: req.user?.id 
      })

      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
}
