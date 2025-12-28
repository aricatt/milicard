import { Router } from 'express';
import { LocationProfitController } from '../controllers/locationProfitController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router({ mergeParams: true });

// 所有路由都需要认证
router.use(authenticateToken);

// 获取可选点位列表（放在 :id 路由之前，避免路由冲突）
router.get('/available-points', 
  checkPermission('location_profit', 'read'),
  LocationProfitController.getAvailablePoints
);

// 预览利润计算（不保存）
router.post('/preview', 
  checkPermission('location_profit', 'read'),
  LocationProfitController.preview
);

// 获取利润记录列表
router.get('/', 
  checkPermission('location_profit', 'read'),
  injectDataPermission('locationProfit'),
  filterResponseFields(),
  LocationProfitController.getList
);

// 获取单条利润记录
router.get('/:id', 
  checkPermission('location_profit', 'read'),
  injectDataPermission('locationProfit'),
  filterResponseFields(),
  LocationProfitController.getById
);

// 计算并创建利润记录
router.post('/', 
  checkPermission('location_profit', 'create'),
  LocationProfitController.create
);

// 删除利润记录
router.delete('/:id', 
  checkPermission('location_profit', 'delete'),
  LocationProfitController.delete
);

export default router;
