import { Router } from 'express';
import { TransferController } from '../controllers/transferController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 基地调货管理路由
 * 基础路径: /api/v1/bases/:baseId/transfers
 */

// 获取基地调货记录列表
router.get('/:baseId/transfers', TransferController.getTransferRecords);

// 创建调货记录
router.post('/:baseId/transfers', TransferController.createTransferRecord);

// 更新调货记录状态
router.patch('/:baseId/transfers/:recordId/status', TransferController.updateTransferStatus);

// 删除调货记录
router.delete('/:baseId/transfers/:recordId', TransferController.deleteTransferRecord);

// 获取调货统计
router.get('/:baseId/transfers/stats', TransferController.getTransferStats);

export default router;
