import { Router } from 'express';
import { InventoryBaseController } from '../controllers/inventoryBaseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取基地库存统计（放在前面避免路由冲突）
 * GET /api/v1/bases/{baseId}/inventory/stats
 */
router.get('/:baseId/inventory/stats', checkPermission('inventory', 'read'), InventoryBaseController.getBaseInventoryStats);

/**
 * 获取基地的库存列表
 * GET /api/v1/bases/{baseId}/inventory
 */
router.get('/:baseId/inventory', checkPermission('inventory', 'read'), InventoryBaseController.getBaseInventoryList);

/**
 * 获取基地的位置列表
 * GET /api/v1/bases/{baseId}/locations
 */
router.get('/:baseId/locations', checkPermission('location', 'read'), InventoryBaseController.getBaseLocations);

/**
 * 调整库存数量
 * PUT /api/v1/bases/{baseId}/inventory/{inventoryId}/adjust
 */
router.put('/:baseId/inventory/:inventoryId/adjust', checkPermission('inventory', 'update'), InventoryBaseController.adjustInventory);

export default router;
