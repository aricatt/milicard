/**
 * 数据权限路由
 */
import { Router } from 'express';
import { DataPermissionController } from '../controllers/dataPermissionController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/permissionMiddleware';

const router = Router();

// 获取配置元数据（值类型、操作符、资源列表）
router.get('/metadata', authenticateToken, DataPermissionController.getMetadata);

// 数据权限规则 CRUD
router.put('/:ruleId', authenticateToken, requireRole('ADMIN'), DataPermissionController.updateRule);
router.delete('/:ruleId', authenticateToken, requireRole('ADMIN'), DataPermissionController.deleteRule);

export default router;
