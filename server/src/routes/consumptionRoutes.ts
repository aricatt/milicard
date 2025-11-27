import { Router } from 'express';
import { ConsumptionController } from '../controllers/consumptionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 基地消耗管理路由
 * 基础路径: /api/v1/bases/:baseId/consumptions
 */

// 获取消耗统计（放在前面避免路由冲突）
router.get('/:baseId/consumptions/stats', ConsumptionController.getConsumptionStats);

// 获取期初数据（调入总量）
router.get('/:baseId/consumptions/opening-stock', ConsumptionController.getOpeningStock);

// 导入消耗记录
router.post('/:baseId/consumptions/import', ConsumptionController.importConsumption);

// 获取消耗记录列表
router.get('/:baseId/consumptions', ConsumptionController.getConsumptionList);

// 创建消耗记录
router.post('/:baseId/consumptions', ConsumptionController.createConsumption);

// 删除消耗记录
router.delete('/:baseId/consumptions/:recordId', ConsumptionController.deleteConsumption);

export default router;
