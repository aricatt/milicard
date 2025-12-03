import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { PermissionController } from '../controllers/permissionController';

const router = Router();

/**
 * 角色路由
 * 处理角色相关的 API
 */

// 获取角色列表
router.get('/', UserManagementController.getRoleList);

// 获取权限树（用于权限配置页面）
router.get('/permission-tree', PermissionController.getPermissionTree);

// 获取预设权限
router.get('/preset/:roleName', PermissionController.getPresetPermissions);

// 获取角色权限
router.get('/:roleId/permissions', PermissionController.getRolePermissions);

// 更新角色权限
router.put('/:roleId/permissions', PermissionController.updateRolePermissions);

// 重置角色权限为预设值
router.post('/:roleId/permissions/reset', PermissionController.resetRolePermissions);

// 获取角色详情
router.get('/:roleId', PermissionController.getRoleDetail);

export default router;
