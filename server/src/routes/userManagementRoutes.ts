import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkSystemPermission } from '../middleware/permissionMiddleware';

const router = Router();

/**
 * 用户管理路由
 * 处理用户 CRUD 和角色管理
 * 所有路由都需要认证和权限检查
 */
router.use(authenticateToken);

// 获取用户统计信息（需要 user:read 权限）
router.get('/stats', checkSystemPermission('user', 'read'), UserManagementController.getUserStats);

// 获取用户列表（需要 user:read 权限）
router.get('/', checkSystemPermission('user', 'read'), UserManagementController.getUserList);

// 获取用户详情（需要 user:read 权限）
router.get('/:id', checkSystemPermission('user', 'read'), UserManagementController.getUserById);

// 创建用户（需要 user:create 权限）
router.post('/', checkSystemPermission('user', 'create'), UserManagementController.createUser);

// 更新用户（需要 user:update 权限）
router.put('/:id', checkSystemPermission('user', 'update'), UserManagementController.updateUser);

// 删除用户（需要 user:delete 权限）
router.delete('/:id', checkSystemPermission('user', 'delete'), UserManagementController.deleteUser);

// 重置用户密码（需要 user:update 权限）
router.post('/:id/reset-password', checkSystemPermission('user', 'update'), UserManagementController.resetPassword);

export default router;
