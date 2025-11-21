import { Router } from 'express';
import { LocationBaseController } from '../controllers/locationBaseController';

const router = Router();

/**
 * 获取基地位置统计
 * GET /api/v1/bases/{baseId}/locations/stats
 */
router.get('/:baseId/locations/stats', LocationBaseController.getBaseLocationStats);

/**
 * 获取基地的位置列表
 * GET /api/v1/bases/{baseId}/locations
 */
router.get('/:baseId/locations', LocationBaseController.getBaseLocationList);

/**
 * 获取位置详情
 * GET /api/v1/bases/{baseId}/locations/{locationId}
 */
router.get('/:baseId/locations/:locationId', LocationBaseController.getLocationById);

/**
 * 创建位置
 * POST /api/v1/bases/{baseId}/locations
 */
router.post('/:baseId/locations', LocationBaseController.createLocation);

/**
 * 更新位置
 * PUT /api/v1/bases/{baseId}/locations/{locationId}
 */
router.put('/:baseId/locations/:locationId', LocationBaseController.updateLocation);

/**
 * 删除位置
 * DELETE /api/v1/bases/{baseId}/locations/{locationId}
 */
router.delete('/:baseId/locations/:locationId', LocationBaseController.deleteLocation);

export default router;
