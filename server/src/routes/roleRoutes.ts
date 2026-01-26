import { Router } from 'express';
import { UserManagementController } from '../controllers/userManagementController';
import { PermissionController } from '../controllers/permissionController';
import { DataPermissionController } from '../controllers/dataPermissionController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkSystemPermission } from '../middleware/permissionMiddleware';

const router = Router();

/**
 * 角色路由
 * 处理角色相关的 API
 * 所有路由都需要认证和权限检查
 */

// 所有角色路由都需要认证
router.use(authenticateToken);

// 获取角色列表（需要 role:read 权限）
router.get('/', checkSystemPermission('role', 'read'), UserManagementController.getRoleList);

// 创建角色（需要 role:create 权限）
router.post('/', checkSystemPermission('role', 'create'), UserManagementController.createRole);

// 获取权限树（需要 role:read 权限）
router.get('/permission-tree', checkSystemPermission('role', 'read'), PermissionController.getPermissionTree);

// 获取预设权限（需要 role:read 权限）
router.get('/preset/:roleName', checkSystemPermission('role', 'read'), PermissionController.getPresetPermissions);

// 获取角色权限（需要 role:read 权限）
router.get('/:roleId/permissions', checkSystemPermission('role', 'read'), PermissionController.getRolePermissions);

// 更新角色权限（需要 role:update 权限）
router.put('/:roleId/permissions', checkSystemPermission('role', 'update'), PermissionController.updateRolePermissions);

// 重置角色权限为预设值（需要 role:update 权限）
router.post('/:roleId/permissions/reset', checkSystemPermission('role', 'update'), PermissionController.resetRolePermissions);

// 获取角色数据权限规则（需要 role:read 权限）
router.get('/:roleId/data-permissions', checkSystemPermission('role', 'read'), DataPermissionController.getRoleDataRules);

// 创建角色数据权限规则（需要 role:update 权限）
router.post('/:roleId/data-permissions', checkSystemPermission('role', 'update'), DataPermissionController.createRule);

// 获取角色字段权限（需要 role:read 权限）
router.get('/:roleId/field-permissions', checkSystemPermission('role', 'read'), DataPermissionController.getRoleFieldPermissions);

// 更新角色字段权限（需要 role:update 权限）
router.put('/:roleId/field-permissions', checkSystemPermission('role', 'update'), DataPermissionController.updateFieldPermissions);

// 重置指定资源的字段权限（需要 role:update 权限）
router.delete('/:roleId/field-permissions/:resource', checkSystemPermission('role', 'update'), DataPermissionController.resetResourceFieldPermissions);

// 获取角色详情（需要 role:read 权限）
router.get('/:roleId', checkSystemPermission('role', 'read'), PermissionController.getRoleDetail);

// 更新角色（需要 role:update 权限）
router.put('/:roleId', checkSystemPermission('role', 'update'), UserManagementController.updateRole);

// 删除角色（需要 role:delete 权限）
router.delete('/:roleId', checkSystemPermission('role', 'delete'), UserManagementController.deleteRole);

export default router;
