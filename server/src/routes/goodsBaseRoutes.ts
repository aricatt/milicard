import { Router } from 'express';
import { GoodsController } from '../controllers/goodsController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

/**
 * 基地商品路由 - 阿米巴模式
 * 所有路由都需要认证和权限检查
 */

/**
 * 获取基地商品统计
 * GET /api/v1/bases/:baseId/goods/stats
 */
router.get('/:baseId/goods/stats', authenticateToken, checkPermission('goods', 'read'), GoodsController.getGoodsStats);

/**
 * 获取基地商品列表
 * GET /api/v1/bases/:baseId/goods
 */
router.get('/:baseId/goods', authenticateToken, checkPermission('goods', 'read'), GoodsController.getBaseGoods);

/**
 * 获取商品详情
 * GET /api/v1/bases/:baseId/goods/:goodsId
 */
router.get('/:baseId/goods/:goodsId', authenticateToken, checkPermission('goods', 'read'), GoodsController.getGoodsById);

/**
 * 创建基地商品
 * POST /api/v1/bases/:baseId/goods
 */
router.post('/:baseId/goods', authenticateToken, checkPermission('goods', 'create'), GoodsController.createGoods);

/**
 * 更新商品
 * PUT /api/v1/bases/:baseId/goods/:goodsId
 */
router.put('/:baseId/goods/:goodsId', authenticateToken, checkPermission('goods', 'update'), GoodsController.updateGoods);

/**
 * 删除商品
 * DELETE /api/v1/bases/:baseId/goods/:goodsId
 */
router.delete('/:baseId/goods/:goodsId', authenticateToken, checkPermission('goods', 'delete'), GoodsController.deleteGoods);

export default router;
