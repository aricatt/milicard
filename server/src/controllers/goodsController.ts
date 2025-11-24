import { Request, Response } from 'express'
import { GoodsService } from '../services/goodsService'
import { logger } from '../utils/logger'

export class GoodsController {
  /**
   * 创建基地商品
   * POST /api/v1/bases/:baseId/goods
   */
  static async createGoods(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const goods = await GoodsService.createGoods(baseId, req.body, userId)

      res.status(201).json({
        success: true,
        message: '商品创建成功',
        data: goods
      })
    } catch (error: any) {
      logger.error('创建商品失败', {
        error: error.message,
        baseId: req.params.baseId,
        userId: req.user?.id
      })

      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || '创建商品失败'
      })
    }
  }

  /**
   * 获取基地商品列表
   * GET /api/v1/bases/:baseId/goods
   */
  static async getBaseGoods(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const queryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        search: req.query.search as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        manufacturer: req.query.manufacturer as string
      }

      const result = await GoodsService.getBaseGoods(baseId, queryParams)

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error: any) {
      logger.error('获取商品列表失败', {
        error: error.message,
        baseId: req.params.baseId
      })

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '获取商品列表失败'
      })
    }
  }

  /**
   * 获取商品详情
   * GET /api/v1/bases/:baseId/goods/:goodsId
   */
  static async getGoodsById(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const goodsId = req.params.goodsId

      const goods = await GoodsService.getGoodsById(goodsId, baseId)

      res.json({
        success: true,
        data: goods
      })
    } catch (error: any) {
      logger.error('获取商品详情失败', {
        error: error.message,
        goodsId: req.params.goodsId
      })

      res.status(error.statusCode || 404).json({
        success: false,
        message: error.message || '商品不存在'
      })
    }
  }

  /**
   * 更新商品
   * PUT /api/v1/bases/:baseId/goods/:goodsId
   */
  static async updateGoods(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const goodsId = req.params.goodsId
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const goods = await GoodsService.updateGoods(goodsId, baseId, req.body, userId)

      res.json({
        success: true,
        message: '商品更新成功',
        data: goods
      })
    } catch (error: any) {
      logger.error('更新商品失败', {
        error: error.message,
        goodsId: req.params.goodsId,
        userId: req.user?.id
      })

      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || '更新商品失败'
      })
    }
  }

  /**
   * 删除商品
   * DELETE /api/v1/bases/:baseId/goods/:goodsId
   */
  static async deleteGoods(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const goodsId = req.params.goodsId
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      await GoodsService.deleteGoods(goodsId, baseId, userId)

      res.json({
        success: true,
        message: '商品删除成功'
      })
    } catch (error: any) {
      logger.error('删除商品失败', {
        error: error.message,
        goodsId: req.params.goodsId,
        userId: req.user?.id
      })

      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || '删除商品失败'
      })
    }
  }

  /**
   * 获取基地商品统计
   * GET /api/v1/bases/:baseId/goods/stats
   */
  static async getGoodsStats(req: Request, res: Response): Promise<void> {
    try {
      const baseId = parseInt(req.params.baseId)
      const stats = await GoodsService.getBaseGoodsStats(baseId)

      res.json({
        success: true,
        data: stats
      })
    } catch (error: any) {
      logger.error('获取商品统计失败', {
        error: error.message,
        baseId: req.params.baseId
      })

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || '获取商品统计失败'
      })
    }
  }
}
