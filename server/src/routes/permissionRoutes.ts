import { Router } from 'express'
import { PermissionController } from '../controllers/permissionController'
import { authenticateToken } from '../middleware/authMiddleware'
import { requireSuperAdmin, requireAdmin } from '../middleware/permissionMiddleware'

const router = Router()

/**
 * @route GET /api/v1/permissions/user/:userId
 * @desc 获取用户权限信息
 * @access Private (Admin+)
 */
router.get('/user/:userId',
  authenticateToken,
  requireAdmin,
  PermissionController.getUserPermissions
)

/**
 * @route GET /api/v1/permissions/me
 * @desc 获取当前用户权限信息
 * @access Private
 */
router.get('/me',
  authenticateToken,
  PermissionController.getUserPermissions
)

/**
 * @route POST /api/v1/permissions/assign-role
 * @desc 为用户分配角色
 * @access Private (Super Admin)
 */
router.post('/assign-role',
  authenticateToken,
  requireSuperAdmin,
  PermissionController.assignRole
)

/**
 * @route POST /api/v1/permissions/remove-role
 * @desc 移除用户角色
 * @access Private (Super Admin)
 */
router.post('/remove-role',
  authenticateToken,
  requireSuperAdmin,
  PermissionController.removeRole
)

/**
 * @route GET /api/v1/permissions/check
 * @desc 检查权限
 * @access Private
 */
router.get('/check',
  authenticateToken,
  PermissionController.checkPermission
)

/**
 * @route GET /api/v1/permissions/roles
 * @desc 获取所有角色
 * @access Private (Admin+)
 */
router.get('/roles',
  authenticateToken,
  requireAdmin,
  PermissionController.getRoles
)

/**
 * @route GET /api/v1/permissions/roles/:roleId
 * @desc 获取角色详情
 * @access Private (Admin+)
 */
router.get('/roles/:roleId',
  authenticateToken,
  requireAdmin,
  PermissionController.getRoleDetail
)

/**
 * @route POST /api/v1/permissions/roles/add-permission
 * @desc 为角色添加权限
 * @access Private (Super Admin)
 */
router.post('/roles/add-permission',
  authenticateToken,
  requireSuperAdmin,
  PermissionController.addPermissionToRole
)

/**
 * @route POST /api/v1/permissions/roles/remove-permission
 * @desc 从角色删除权限
 * @access Private (Super Admin)
 */
router.post('/roles/remove-permission',
  authenticateToken,
  requireSuperAdmin,
  PermissionController.removePermissionFromRole
)

/**
 * @route POST /api/v1/permissions/reload
 * @desc 重新加载权限策略
 * @access Private (Super Admin)
 */
router.post('/reload',
  authenticateToken,
  requireSuperAdmin,
  PermissionController.reloadPolicy
)

export default router
