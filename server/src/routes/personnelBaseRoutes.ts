import { Router } from 'express';
import { PersonnelBaseController } from '../controllers/personnelBaseController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取基地人员统计
 * GET /api/v1/bases/{baseId}/personnel/stats
 */
router.get('/:baseId/personnel/stats', PersonnelBaseController.getBasePersonnelStats);

/**
 * 获取基地的人员列表
 * GET /api/v1/bases/{baseId}/personnel
 */
router.get('/:baseId/personnel', PersonnelBaseController.getBasePersonnelList);

/**
 * 获取人员详情
 * GET /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.get('/:baseId/personnel/:personnelId', PersonnelBaseController.getPersonnelById);

/**
 * 创建人员
 * POST /api/v1/bases/{baseId}/personnel
 */
router.post('/:baseId/personnel', PersonnelBaseController.createPersonnel);

/**
 * 更新人员
 * PUT /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.put('/:baseId/personnel/:personnelId', PersonnelBaseController.updatePersonnel);

/**
 * 删除人员
 * DELETE /api/v1/bases/{baseId}/personnel/{personnelId}
 */
router.delete('/:baseId/personnel/:personnelId', PersonnelBaseController.deletePersonnel);

export default router;
