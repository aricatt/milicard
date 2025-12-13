import { Request, Response } from 'express'
import { GlobalGoodsService } from '../services/globalGoodsService'
import { logger } from '../utils/logger'

/**
 * 全局商品控制器
 */
export class GlobalGoodsController {
  /**
   * 获取全局商品列表
   */
  static async list(req: Request, res: Response) {
    try {
      const { page, pageSize, search, manufacturer, categoryId, isActive } = req.query

      const result = await GlobalGoodsService.list({
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
        search: search as string,
        manufacturer: manufacturer as string,
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      })

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error: any) {
      logger.error('获取全局商品列表失败', { error })
      res.status(500).json({
        success: false,
        message: error.message || '获取全局商品列表失败'
      })
    }
  }

  /**
   * 获取单个全局商品
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const goods = await GlobalGoodsService.getById(id)

      res.json({
        success: true,
        data: goods
      })
    } catch (error: any) {
      logger.error('获取全局商品失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 500).json({
        success: false,
        message: error.message || '获取全局商品失败'
      })
    }
  }

  /**
   * 创建全局商品
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        })
      }

      const goods = await GlobalGoodsService.create(req.body, userId)

      res.status(201).json({
        success: true,
        data: goods,
        message: '创建成功'
      })
    } catch (error: any) {
      logger.error('创建全局商品失败', { error, body: req.body })
      res.status(error.message?.includes('已存在') ? 400 : 500).json({
        success: false,
        message: error.message || '创建全局商品失败'
      })
    }
  }

  /**
   * 更新全局商品
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权'
        })
      }

      const goods = await GlobalGoodsService.update(id, req.body, userId)

      res.json({
        success: true,
        data: goods,
        message: '更新成功'
      })
    } catch (error: any) {
      logger.error('更新全局商品失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 500).json({
        success: false,
        message: error.message || '更新全局商品失败'
      })
    }
  }

  /**
   * 删除全局商品
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await GlobalGoodsService.delete(id)

      res.json({
        success: true,
        message: '删除成功'
      })
    } catch (error: any) {
      logger.error('删除全局商品失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 400).json({
        success: false,
        message: error.message || '删除全局商品失败'
      })
    }
  }

  /**
   * 获取所有厂家列表（用于筛选）
   */
  static async getManufacturers(req: Request, res: Response) {
    try {
      const manufacturers = await GlobalGoodsService.getManufacturers()

      res.json({
        success: true,
        data: manufacturers
      })
    } catch (error: any) {
      logger.error('获取厂家列表失败', { error })
      res.status(500).json({
        success: false,
        message: error.message || '获取厂家列表失败'
      })
    }
  }
}
