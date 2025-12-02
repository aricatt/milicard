import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';

const router = Router();

/**
 * 角色路由
 * 处理角色相关的 API
 */

// 获取角色列表
router.get('/', UserManagementController.getRoleList);

export default router;
