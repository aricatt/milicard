import { Router } from 'express';
import { StockController } from '../controllers/stockController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

// 获取基地库存统计（放在参数化路由之前）
router.get(
  '/:baseId/real-time-stock/stats',
  authenticateToken,
  checkPermission('stock', 'read'),
  StockController.getStockStats
);

// 获取基地实时库存列表
router.get(
  '/:baseId/real-time-stock',
  authenticateToken,
  checkPermission('stock', 'read'),
  StockController.getRealTimeStock
);

// 获取仓库列表
router.get(
  '/:baseId/warehouses',
  authenticateToken,
  checkPermission('stock', 'read'),
  StockController.getWarehouses
);

// 获取指定仓库的库存
router.get(
  '/:baseId/warehouses/:locationId/stock',
  authenticateToken,
  checkPermission('stock', 'read'),
  StockController.getLocationStock
);

// 获取指定商品在指定仓库的库存
router.get(
  '/:baseId/stock',
  authenticateToken,
  checkPermission('stock', 'read'),
  StockController.getGoodsStock
);

export default router;
