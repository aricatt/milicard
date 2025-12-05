import { Router } from 'express';
import { PointOrderController } from '../controllers/pointOrderController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 统计数据（放在参数化路由之前）
router.get('/:baseId/point-orders/stats',
  authenticateToken,
  checkPermission('pointOrder', 'read'),
  PointOrderController.getStats
);

// 获取可选点位列表（用于下单时选择）
router.get('/:baseId/point-orders/available-points',
  authenticateToken,
  checkPermission('pointOrder', 'create'),
  PointOrderController.getAvailablePoints
);

// 获取可选商品列表（用于下单时选择）
router.get('/:baseId/point-orders/available-goods',
  authenticateToken,
  checkPermission('pointOrder', 'create'),
  PointOrderController.getAvailableGoods
);

// 获取订单列表
router.get('/:baseId/point-orders',
  authenticateToken,
  checkPermission('pointOrder', 'read'),
  injectDataPermission('pointOrder'),
  filterResponseFields(),
  PointOrderController.getList
);

// 创建订单
router.post('/:baseId/point-orders',
  authenticateToken,
  checkPermission('pointOrder', 'create'),
  PointOrderController.create
);

// 获取订单详情
router.get('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('pointOrder', 'read'),
  injectDataPermission('pointOrder'),
  filterResponseFields(),
  PointOrderController.getById
);

// 更新订单
router.put('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('pointOrder', 'update'),
  injectDataPermission('pointOrder'),
  PointOrderController.update
);

// 删除订单
router.delete('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('pointOrder', 'delete'),
  PointOrderController.delete
);

// 发货
router.post('/:baseId/point-orders/:orderId/ship',
  authenticateToken,
  checkPermission('pointOrder', 'update'),
  PointOrderController.ship
);

// 确认送达
router.post('/:baseId/point-orders/:orderId/deliver',
  authenticateToken,
  checkPermission('pointOrder', 'update'),
  PointOrderController.deliver
);

// 确认收款
router.post('/:baseId/point-orders/:orderId/payment',
  authenticateToken,
  checkPermission('pointOrder', 'update'),
  PointOrderController.confirmPayment
);

// 完成订单
router.post('/:baseId/point-orders/:orderId/complete',
  authenticateToken,
  checkPermission('pointOrder', 'update'),
  PointOrderController.complete
);

export default router;
