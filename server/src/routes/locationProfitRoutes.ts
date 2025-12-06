import { Router } from 'express';
import { LocationProfitController } from '../controllers/locationProfitController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true });

// 所有路由都需要认证
router.use(authenticateToken);

// 获取可选点位列表（放在 :id 路由之前，避免路由冲突）
router.get('/available-points', LocationProfitController.getAvailablePoints);

// 预览利润计算（不保存）
router.post('/preview', LocationProfitController.preview);

// 获取利润记录列表
router.get('/', LocationProfitController.getList);

// 获取单条利润记录
router.get('/:id', LocationProfitController.getById);

// 计算并创建利润记录
router.post('/', LocationProfitController.create);

// 删除利润记录
router.delete('/:id', LocationProfitController.delete);

export default router;
