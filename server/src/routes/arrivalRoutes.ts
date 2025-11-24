import { Router } from 'express';
import { ArrivalController } from '../controllers/arrivalController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 基地到货管理路由
 * 基础路径: /api/v1/bases/:baseId/arrivals
 */

// 获取基地到货记录列表
router.get('/:baseId/arrivals', ArrivalController.getArrivalRecords);

// 创建到货记录
router.post('/:baseId/arrivals', ArrivalController.createArrivalRecord);

// 删除到货记录
router.delete('/:baseId/arrivals/:recordId', ArrivalController.deleteArrivalRecord);

// 获取到货统计
router.get('/:baseId/arrivals/stats', ArrivalController.getArrivalStats);

export default router;
