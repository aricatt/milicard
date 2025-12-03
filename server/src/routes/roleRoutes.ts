import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { PermissionController } from '../controllers/permissionController';
import { DataPermissionController } from '../controllers/dataPermissionController';

const router = Router();

/**
 * 角色路由
 * 处理角色相关的 API
 */

// 获取角色列表
router.get('/', UserManagementController.getRoleList);

// 创建角色
router.post('/', UserManagementController.createRole);

// 获取权限树（用于权限配置页面）
router.get('/permission-tree', PermissionController.getPermissionTree);

// 获取预设权限
router.get('/preset/:roleName', PermissionController.getPresetPermissions);

// 获取角色权限（功能权限）
router.get('/:roleId/permissions', PermissionController.getRolePermissions);

// 更新角色权限（功能权限）
router.put('/:roleId/permissions', PermissionController.updateRolePermissions);

// 重置角色权限为预设值
router.post('/:roleId/permissions/reset', PermissionController.resetRolePermissions);

// 获取角色数据权限规则
router.get('/:roleId/data-permissions', DataPermissionController.getRoleDataRules);

// 创建角色数据权限规则
router.post('/:roleId/data-permissions', DataPermissionController.createRule);

// 获取角色字段权限
router.get('/:roleId/field-permissions', DataPermissionController.getRoleFieldPermissions);

// 更新角色字段权限
router.put('/:roleId/field-permissions', DataPermissionController.updateFieldPermissions);

// 获取角色详情
router.get('/:roleId', PermissionController.getRoleDetail);

// 更新角色
router.put('/:roleId', UserManagementController.updateRole);

// 删除角色
router.delete('/:roleId', UserManagementController.deleteRole);

export default router;
