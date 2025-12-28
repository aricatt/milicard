import { Router } from 'express';
import { PersonnelBaseController } from '../controllers/personnelBaseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取基地人员统计（放在前面避免路由冲突）
 * GET /api/v1/bases/{baseId}/personnel/stats
 */
router.get('/:baseId/personnel/stats', checkPermission('personnel', 'read'), injectDataPermission('personnel'), filterResponseFields(), PersonnelBaseController.getBasePersonnelStats);

/**
 * 获取基地的人员列表
 * GET /api/v1/bases/{baseId}/personnel
 */
router.get('/:baseId/personnel', checkPermission('personnel', 'read'), injectDataPermission('personnel'), filterResponseFields(), PersonnelBaseController.getBasePersonnelList);

/**
 * 获取人员详情
 * GET /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.get('/:baseId/personnel/:personnelId', checkPermission('personnel', 'read'), injectDataPermission('personnel'), filterResponseFields(), PersonnelBaseController.getPersonnelById);

/**
 * 创建人员
 * POST /api/v1/bases/{baseId}/personnel
 */
router.post('/:baseId/personnel', checkPermission('personnel', 'create'), PersonnelBaseController.createPersonnel);

/**
 * 更新人员
 * PUT /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.put('/:baseId/personnel/:personnelId', checkPermission('personnel', 'update'), PersonnelBaseController.updatePersonnel);

/**
 * 删除人员
 * DELETE /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.delete('/:baseId/personnel/:personnelId', checkPermission('personnel', 'delete'), PersonnelBaseController.deletePersonnel);

export default router;
