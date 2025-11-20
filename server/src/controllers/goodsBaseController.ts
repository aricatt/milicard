import { Request, Response } from 'express';
import { GoodsBaseServiceSimple } from '../services/goodsBaseService.simple';
import { logger } from '../utils/logger';

/**
 * 基地商品管理控制器
 */
export class GoodsBaseController {
  /**
   * 获取基地的商品列表
   */
  static async getBaseGoodsList(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const params = req.query;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      const result = await GoodsBaseServiceSimple.getBaseGoodsList(baseId, params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取基地商品列表失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId, 
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 获取所有商品（用于添加到基地）
   */
  static async getAllGoods(req: Request, res: Response) {
    try {
      const params = req.query;
      const result = await GoodsBaseServiceSimple.getAllGoods(params);
      
      res.json(result);
    } catch (error) {
      logger.error('获取商品列表失败', { 
        error: (error as Error).message, 
        service: 'milicard-api' 
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 将商品添加到基地
   */
  static async addGoodsToBase(req: Request, res: Response) {
    try {
      const baseId = parseInt(req.params.baseId);
      const { goodsId, retailPrice, purchasePrice, notes, isActive } = req.body;

      if (isNaN(baseId)) {
        return res.status(400).json({
          success: false,
          message: '无效的基地ID'
        });
      }

      if (!goodsId) {
        return res.status(400).json({
          success: false,
          message: '商品ID不能为空'
        });
      }

      const config = {
        retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        notes,
        isActive: isActive !== undefined ? isActive : true
      };

      const result = await GoodsBaseServiceSimple.addGoodsToBase(goodsId, baseId, config);
      
      res.status(201).json(result);
    } catch (error) {
      logger.error('添加商品到基地失败', { 
        error: (error as Error).message, 
        baseId: req.params.baseId,
        body: req.body,
        service: 'milicard-api' 
      });
      
      const statusCode = (error as Error).message.includes('已在该基地配置') ? 409 : 
                        (error as Error).message.includes('不存在') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: (error as Error).message
      });
    }
  }
}
