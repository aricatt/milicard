import { Router } from 'express';
import { InventoryBaseController } from '../controllers/inventoryBaseController';

const router = Router();

/**
 * 获取基地的库存列表
 * GET /api/v1/bases/{baseId}/inventory
 */
router.get('/:baseId/inventory', InventoryBaseController.getBaseInventoryList);

/**
 * 获取基地的位置列表
 * GET /api/v1/bases/{baseId}/locations
 */
router.get('/:baseId/locations', InventoryBaseController.getBaseLocations);

/**
 * 获取基地库存统计
 * GET /api/v1/bases/{baseId}/inventory/stats
 */
router.get('/:baseId/inventory/stats', InventoryBaseController.getBaseInventoryStats);

/**
 * 调整库存数量
 * PUT /api/v1/bases/{baseId}/inventory/{inventoryId}/adjust
 */
router.put('/:baseId/inventory/:inventoryId/adjust', InventoryBaseController.adjustInventory);

export default router;
