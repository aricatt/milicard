import { Router } from 'express';
import { LocationBaseController } from '../controllers/locationBaseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取基地位置统计（放在前面避免路由冲突）
 * GET /api/v1/bases/{baseId}/locations/stats
 */
router.get('/:baseId/locations/stats', checkPermission('location', 'read'), injectDataPermission('location'), filterResponseFields(), LocationBaseController.getBaseLocationStats);

/**
 * 获取基地的位置列表
 * GET /api/v1/bases/{baseId}/locations
 * 注意：此API返回包含baseName字段，需要合并base资源的字段权限
 */
router.get('/:baseId/locations', checkPermission('location', 'read'), injectDataPermission('location', ['base']), filterResponseFields(), LocationBaseController.getBaseLocationList);

/**
 * 获取位置详情
 * GET /api/v1/bases/{baseId}/locations/{locationId}
 */
router.get('/:baseId/locations/:locationId', checkPermission('location', 'read'), injectDataPermission('location'), filterResponseFields(), LocationBaseController.getLocationById);

/**
 * 创建位置
 * POST /api/v1/bases/{baseId}/locations
 */
router.post('/:baseId/locations', checkPermission('location', 'create'), LocationBaseController.createLocation);

/**
 * 更新位置
 * PUT /api/v1/bases/{baseId}/locations/{locationId}
 */
router.put('/:baseId/locations/:locationId', checkPermission('location', 'update'), LocationBaseController.updateLocation);

/**
 * 删除位置
 * DELETE /api/v1/bases/{baseId}/locations/{locationId}
 */
router.delete('/:baseId/locations/:locationId', checkPermission('location', 'delete'), LocationBaseController.deleteLocation);

export default router;
