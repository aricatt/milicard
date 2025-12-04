import { Router } from 'express';
import { PointController } from '../controllers/pointController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 获取可选用户列表（放在 :pointId 路由之前，避免被匹配）
router.get('/:baseId/points/available-users', authenticateToken, PointController.getAvailableUsers);

// 点位 CRUD - 应用功能权限、数据权限和字段过滤
router.get('/:baseId/points', 
  authenticateToken, 
  checkPermission('point', 'read'),
  injectDataPermission('point'),
  filterResponseFields(),
  PointController.getList
);

router.post('/:baseId/points', 
  authenticateToken, 
  checkPermission('point', 'create'),
  PointController.create
);

router.get('/:baseId/points/:pointId', 
  authenticateToken, 
  checkPermission('point', 'read'),
  injectDataPermission('point'),
  filterResponseFields(),
  PointController.getById
);

router.put('/:baseId/points/:pointId', 
  authenticateToken, 
  checkPermission('point', 'update'),
  injectDataPermission('point'),
  PointController.update
);

router.delete('/:baseId/points/:pointId', 
  authenticateToken, 
  checkPermission('point', 'delete'),
  PointController.delete
);

// 点位库存和订单
router.get('/:baseId/points/:pointId/inventory', 
  authenticateToken, 
  checkPermission('pointInventory', 'read'),
  injectDataPermission('pointInventory'),
  filterResponseFields(),
  PointController.getInventory
);

router.get('/:baseId/points/:pointId/orders', 
  authenticateToken, 
  checkPermission('pointOrder', 'read'),
  injectDataPermission('pointOrder'),
  filterResponseFields(),
  PointController.getOrders
);

// 点位可采购商品管理
router.get('/:baseId/points/:pointId/goods', 
  authenticateToken, 
  checkPermission('point', 'read'),
  PointController.getPointGoods
);

router.post('/:baseId/points/:pointId/goods/batch', 
  authenticateToken, 
  checkPermission('point', 'update'),
  PointController.batchSetPointGoods
);

router.post('/:baseId/points/:pointId/goods', 
  authenticateToken, 
  checkPermission('point', 'update'),
  PointController.addPointGoods
);

router.put('/:baseId/points/:pointId/goods/:goodsConfigId', 
  authenticateToken, 
  checkPermission('point', 'update'),
  PointController.updatePointGoods
);

router.delete('/:baseId/points/:pointId/goods/:goodsConfigId', 
  authenticateToken, 
  checkPermission('point', 'update'),
  PointController.deletePointGoods
);

export default router;
