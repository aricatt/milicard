import { Router } from 'express';
import { PointOrderController } from '../controllers/pointOrderController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 统计数据（放在参数化路由之前）
router.get('/:baseId/point-orders/stats',
  authenticateToken,
  checkPermission('point_order', 'read'),
  PointOrderController.getStats
);

// 获取可选点位列表（用于下单时选择）
// 使用 point 资源的权限检查和数据权限注入，以便应用点位的数据权限过滤（如点位老板只能看到自己的点位）
router.get('/:baseId/point-orders/available-points',
  authenticateToken,
  checkPermission('point', 'read'),
  injectDataPermission('point'),  // 注入点位数据权限过滤条件
  PointOrderController.getAvailablePoints
);

// 获取可选商品列表（用于下单时选择）
router.get('/:baseId/point-orders/available-goods',
  authenticateToken,
  checkPermission('point_order', 'create'),
  PointOrderController.getAvailableGoods
);

// 获取订单列表
router.get('/:baseId/point-orders',
  authenticateToken,
  checkPermission('point_order', 'read'),
  injectDataPermission('point_order'),
  filterResponseFields(),
  PointOrderController.getList
);

// 创建订单
router.post('/:baseId/point-orders',
  authenticateToken,
  checkPermission('point_order', 'create'),
  PointOrderController.create
);

// 获取订单详情
router.get('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('point_order', 'read'),
  injectDataPermission('point_order'),
  filterResponseFields(),
  PointOrderController.getById
);

// 更新订单
router.put('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('point_order', 'update'),
  injectDataPermission('point_order'),
  PointOrderController.update
);

// 删除订单
router.delete('/:baseId/point-orders/:orderId',
  authenticateToken,
  checkPermission('point_order', 'delete'),
  PointOrderController.delete
);

// 确认订单（官方人员）
router.post('/:baseId/point-orders/:orderId/confirm',
  authenticateToken,
  checkPermission('point_order', 'confirm'),
  PointOrderController.confirm
);

// 发货（官方人员）
router.post('/:baseId/point-orders/:orderId/ship',
  authenticateToken,
  checkPermission('point_order', 'ship'),
  PointOrderController.ship
);

// 确认送达（官方人员）
router.post('/:baseId/point-orders/:orderId/deliver',
  authenticateToken,
  checkPermission('point_order', 'deliver'),
  PointOrderController.deliver
);

// 确认收款（官方人员）
router.post('/:baseId/point-orders/:orderId/payment',
  authenticateToken,
  checkPermission('point_order', 'payment'),
  PointOrderController.confirmPayment
);

// 完成订单（官方人员）
router.post('/:baseId/point-orders/:orderId/complete',
  authenticateToken,
  checkPermission('point_order', 'complete'),
  PointOrderController.complete
);

// 确认收货（点位老板）
router.post('/:baseId/point-orders/:orderId/receive',
  authenticateToken,
  checkPermission('point_order', 'receive'),
  PointOrderController.receive
);

export default router;
