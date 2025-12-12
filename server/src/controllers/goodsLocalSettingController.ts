import { Request, Response } from 'express'
import { GoodsLocalSettingService } from '../services/goodsLocalSettingService'
import { logger } from '../utils/logger'

/**
 * 基地商品设置控制器
 */
export class GoodsLocalSettingController {
  /**
   * 获取基地商品设置列表
   */
  static async list(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const { page, pageSize, search, manufacturer, isActive } = req.query

      const result = await GoodsLocalSettingService.list(baseId, {
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
        search: search as string,
        manufacturer: manufacturer as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
      })

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error: any) {
      logger.error('获取基地商品设置列表失败', { error })
      res.status(500).json({
        success: false,
        message: error.message || '获取基地商品设置列表失败'
      })
    }
  }

  /**
   * 获取单个基地商品设置
   */
  static async getById(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const { id } = req.params
      const setting = await GoodsLocalSettingService.getById(baseId, id)

      res.json({
        success: true,
        data: setting
      })
    } catch (error: any) {
      logger.error('获取基地商品设置失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 500).json({
        success: false,
        message: error.message || '获取基地商品设置失败'
      })
    }
  }

  /**
   * 创建基地商品设置
   */
  static async create(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const setting = await GoodsLocalSettingService.create(baseId, req.body)

      res.status(201).json({
        success: true,
        data: setting,
        message: '添加成功'
      })
    } catch (error: any) {
      logger.error('创建基地商品设置失败', { error, body: req.body })
      res.status(error.message?.includes('已') ? 400 : 500).json({
        success: false,
        message: error.message || '创建基地商品设置失败'
      })
    }
  }

  /**
   * 更新基地商品设置
   */
  static async update(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const { id } = req.params
      const setting = await GoodsLocalSettingService.update(baseId, id, req.body)

      res.json({
        success: true,
        data: setting,
        message: '更新成功'
      })
    } catch (error: any) {
      logger.error('更新基地商品设置失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 500).json({
        success: false,
        message: error.message || '更新基地商品设置失败'
      })
    }
  }

  /**
   * 删除基地商品设置
   */
  static async delete(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const { id } = req.params
      await GoodsLocalSettingService.delete(baseId, id)

      res.json({
        success: true,
        message: '移除成功'
      })
    } catch (error: any) {
      logger.error('删除基地商品设置失败', { error, id: req.params.id })
      res.status(error.message?.includes('不存在') ? 404 : 500).json({
        success: false,
        message: error.message || '删除基地商品设置失败'
      })
    }
  }

  /**
   * 获取基地可用商品列表（用于采购、到货等业务）
   */
  static async getAvailableGoods(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId)
      const { search } = req.query
      
      const goods = await GoodsLocalSettingService.getAvailableGoods(baseId, {
        search: search as string
      })

      res.json({
        success: true,
        data: goods
      })
    } catch (error: any) {
      logger.error('获取基地可用商品列表失败', { error })
      res.status(500).json({
        success: false,
        message: error.message || '获取基地可用商品列表失败'
      })
    }
  }
}
