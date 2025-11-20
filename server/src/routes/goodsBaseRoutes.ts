import { Router } from 'express';
import { GoodsBaseController } from '../controllers/goodsBaseController';

const router = Router();

/**
 * 获取基地的商品列表
 * GET /api/v1/bases/{baseId}/goods
 */
router.get('/:baseId/goods', GoodsBaseController.getBaseGoodsList);

/**
 * 获取所有商品（用于添加到基地）
 * GET /api/v1/goods/all
 */
router.get('/goods/all', GoodsBaseController.getAllGoods);

/**
 * 将商品添加到基地
 * POST /api/v1/bases/{baseId}/goods
 */
router.post('/:baseId/goods', GoodsBaseController.addGoodsToBase);

export default router;
