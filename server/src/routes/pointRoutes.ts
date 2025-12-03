import { Router } from 'express';
import { PointController } from '../controllers/pointController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 获取可选用户列表（放在 :pointId 路由之前，避免被匹配）
router.get('/:baseId/points/available-users', authenticateToken, PointController.getAvailableUsers);

// 点位 CRUD
router.get('/:baseId/points', authenticateToken, PointController.getList);
router.post('/:baseId/points', authenticateToken, PointController.create);
router.get('/:baseId/points/:pointId', authenticateToken, PointController.getById);
router.put('/:baseId/points/:pointId', authenticateToken, PointController.update);
router.delete('/:baseId/points/:pointId', authenticateToken, PointController.delete);

// 点位库存和订单
router.get('/:baseId/points/:pointId/inventory', authenticateToken, PointController.getInventory);
router.get('/:baseId/points/:pointId/orders', authenticateToken, PointController.getOrders);

export default router;
