import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * 用户管理路由
 * 处理用户 CRUD 和角色管理
 * 所有路由都需要认证
 */
router.use(authenticateToken);

// 获取用户统计信息（放在 :id 路由之前，避免被匹配）
router.get('/stats', UserManagementController.getUserStats);

// 获取用户列表
router.get('/', UserManagementController.getUserList);

// 获取用户详情
router.get('/:id', UserManagementController.getUserById);

// 创建用户
router.post('/', UserManagementController.createUser);

// 更新用户
router.put('/:id', UserManagementController.updateUser);

// 删除用户
router.delete('/:id', UserManagementController.deleteUser);

// 重置用户密码
router.post('/:id/reset-password', UserManagementController.resetPassword);

export default router;
