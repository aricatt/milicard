import { Router } from 'express';
import { TransferController } from '../controllers/transferController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 基地调货管理路由
 * 基础路径: /api/v1/bases/:baseId/transfers
 */

// 获取调货统计（放在前面避免路由冲突）
router.get('/:baseId/transfers/stats', checkPermission('stock_transfer', 'read'), TransferController.getTransferStats);

// 导入调货记录
router.post('/:baseId/transfers/import', checkPermission('stock_transfer', 'create'), TransferController.importTransferRecord);

// 获取基地调货记录列表
router.get('/:baseId/transfers', checkPermission('stock_transfer', 'read'), TransferController.getTransferRecords);

// 创建调货记录
router.post('/:baseId/transfers', checkPermission('stock_transfer', 'create'), TransferController.createTransferRecord);

// 更新调货记录状态
router.patch('/:baseId/transfers/:recordId/status', checkPermission('stock_transfer', 'update'), TransferController.updateTransferStatus);

// 删除调货记录
router.delete('/:baseId/transfers/:recordId', checkPermission('stock_transfer', 'delete'), TransferController.deleteTransferRecord);

export default router;
