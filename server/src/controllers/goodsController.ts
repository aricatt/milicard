import { Request, Response } from 'express'
import { GoodsService, SimpleGoodsRequest, GoodsQueryParams } from '../services/goodsService.simple'
import { logger } from '../utils/logger'

export class GoodsController {
  /**
   * 创建商品
   */
  static async createGoods(req: Request, res: Response): Promise<void> {
    try {
      const goodsData: SimpleGoodsRequest = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const goods = await GoodsService.createGoods(goodsData, userId)

      res.status(201).json({
        success: true,
        message: '商品创建成功',
        data: goods
      })
    } catch (error) {
      logger.error('创建商品失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
        userId: req.user?.id
      })

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '创建商品失败'
      })
    }
  }

  /**
   * 获取商品列表
   */
  static async getGoodsList(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: GoodsQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        search: req.query.search as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        language: req.query.language as string
      }

      const result = await GoodsService.getGoodsList(queryParams)

      res.json({
        success: true,
        data: result.goods,
        pagination: result.pagination
      })
    } catch (error) {
      logger.error('获取商品列表失败', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '获取商品列表失败'
      })
    }
  }

  /**
   * 获取商品详情
   */
  static async getGoodsById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const goods = await GoodsService.getGoodsById(id)

      res.json({
        success: true,
        data: goods
      })
    } catch (error) {
      logger.error('获取商品详情失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: req.params.id,
        userId: req.user?.id
      })

      const statusCode = error instanceof Error && error.message === '商品不存在' ? 404 : 500
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '获取商品详情失败'
      })
    }
  }

  /**
   * 更新商品
   */
  static async updateGoods(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData: Partial<SimpleGoodsRequest> = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      const goods = await GoodsService.updateGoods(id, updateData, userId)

      res.json({
        success: true,
        message: '商品更新成功',
        data: goods
      })
    } catch (error) {
      logger.error('更新商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: req.params.id,
        body: req.body,
        userId: req.user?.id
      })

      const statusCode = error instanceof Error && error.message === '商品不存在' ? 404 : 400
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '更新商品失败'
      })
    }
  }

  /**
   * 删除商品
   */
  static async deleteGoods(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      await GoodsService.deleteGoods(id, userId)

      res.json({
        success: true,
        message: '商品删除成功'
      })
    } catch (error) {
      logger.error('删除商品失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: req.params.id,
        userId: req.user?.id
      })

      const statusCode = error instanceof Error && error.message === '商品不存在' ? 404 : 400
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : '删除商品失败'
      })
    }
  }

  /**
   * 获取商品库存信息
   */
  static async getGoodsStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const stockInfo = await GoodsService.getGoodsStock(id)

      res.json({
        success: true,
        data: stockInfo
      })
    } catch (error) {
      logger.error('获取商品库存失败', {
        error: error instanceof Error ? error.message : String(error),
        goodsId: req.params.id,
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '获取商品库存失败'
      })
    }
  }

  /**
   * 批量更新商品状态
   */
  static async batchUpdateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { goodsIds, isActive } = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '用户未认证'
        })
        return
      }

      if (!Array.isArray(goodsIds) || goodsIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '请选择要更新的商品'
        })
        return
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: '请指定商品状态'
        })
        return
      }

      // 批量更新商品状态
      const updatePromises = goodsIds.map((id: string) =>
        GoodsService.updateGoods(id, { isActive }, userId)
      )

      await Promise.all(updatePromises)

      res.json({
        success: true,
        message: `成功更新 ${goodsIds.length} 个商品的状态`
      })
    } catch (error) {
      logger.error('批量更新商品状态失败', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '批量更新商品状态失败'
      })
    }
  }

  /**
   * 搜索商品（用于选择器等场景）
   */
  static async searchGoods(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 10 } = req.query

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        })
        return
      }

      const result = await GoodsService.getGoodsList({
        search: q,
        limit: parseInt(limit as string),
        isActive: true
      })

      // 简化返回数据，只包含必要字段
      const simplifiedGoods = result.goods.map(goods => ({
        id: goods.id,
        code: goods.code,
        name: goods.name,
        retailPrice: goods.retailPrice,
        currentStock: goods.currentStock,
        imageUrl: goods.imageUrl
      }))

      res.json({
        success: true,
        data: simplifiedGoods
      })
    } catch (error) {
      logger.error('搜索商品失败', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
        userId: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: '搜索商品失败'
      })
    }
  }
}
