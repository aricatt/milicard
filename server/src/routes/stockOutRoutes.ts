/**
 * 出库路由
 */
import { Router } from 'express';
import { StockOutController } from '../controllers/stockOutController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 获取出库统计（放在参数化路由之前）
router.get('/:baseId/stock-outs/stats',
  authenticateToken,
  checkPermission('stock_out', 'read'),
  injectDataPermission('stockOut'),
  filterResponseFields(),
  StockOutController.getStats
);

// 获取出库列表
router.get('/:baseId/stock-outs',
  authenticateToken,
  checkPermission('stock_out', 'read'),
  injectDataPermission('stockOut'),
  filterResponseFields(),
  StockOutController.getList
);

// 获取单个出库记录
router.get('/:baseId/stock-outs/:id',
  authenticateToken,
  checkPermission('stock_out', 'read'),
  injectDataPermission('stockOut'),
  filterResponseFields(),
  StockOutController.getById
);

// 创建出库记录（手动出库）
router.post('/:baseId/stock-outs',
  authenticateToken,
  checkPermission('stock_out', 'create'),
  StockOutController.create
);

// 更新出库记录
router.put('/:baseId/stock-outs/:id',
  authenticateToken,
  checkPermission('stock_out', 'update'),
  StockOutController.update
);

// 删除出库记录
router.delete('/:baseId/stock-outs/:id',
  authenticateToken,
  checkPermission('stock_out', 'delete'),
  StockOutController.delete
);

export default router;
