/**
 * 采购管理路由
 */

import { Router } from 'express'
import { PurchaseController } from '../controllers/purchaseController'
import { authenticateToken } from '../middleware/authMiddleware'
import { requirePermission, applyDataPermission } from '../middleware/permissionMiddleware'
import { ResourceModule, PermissionAction } from '../types/permission'
import {
  validatePurchaseOrderQuery,
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validatePurchaseStatsQuery
} from '../validators/purchaseValidators'

const router = Router()

// 应用认证中间件
router.use(authenticateToken)

// ================================
// 采购订单管理路由
// ================================

/**
 * 获取采购订单列表
 * GET /api/v1/purchase/orders
 */
router.get('/orders',
  validatePurchaseOrderQuery,
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.PURCHASE_ORDER, PermissionAction.READ),
  PurchaseController.getPurchaseOrderList
)

/**
 * 获取采购订单详情
 * GET /api/v1/purchase/orders/:id
 */
router.get('/orders/:id',
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.READ
  }),
  PurchaseController.getPurchaseOrderById
)

/**
 * 创建采购订单
 * POST /api/v1/purchase/orders
 */
router.post('/orders',
  validateCreatePurchaseOrder,
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.CREATE
  }),
  PurchaseController.createPurchaseOrder
)

/**
 * 更新采购订单
 * PUT /api/v1/purchase/orders/:id
 */
router.put('/orders/:id',
  validateUpdatePurchaseOrder,
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.UPDATE
  }),
  PurchaseController.updatePurchaseOrder
)

/**
 * 删除采购订单
 * DELETE /api/v1/purchase/orders/:id
 */
router.delete('/orders/:id',
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.DELETE
  }),
  PurchaseController.deletePurchaseOrder
)

// ================================
// 采购统计路由
// ================================

/**
 * 获取采购统计
 * GET /api/v1/purchase/stats
 */
router.get('/stats',
  validatePurchaseStatsQuery,
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.PURCHASE_ORDER, PermissionAction.READ),
  PurchaseController.getPurchaseStats
)

// ================================
// 预留扩展路由
// ================================

/**
 * 采购订单审核
 * POST /api/v1/purchase/orders/:id/approve
 */
router.post('/orders/:id/approve',
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.UPDATE
  }),
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '功能暂未实现'
    })
  }
)

/**
 * 采购订单取消
 * POST /api/v1/purchase/orders/:id/cancel
 */
router.post('/orders/:id/cancel',
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.UPDATE
  }),
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '功能暂未实现'
    })
  }
)

/**
 * 批量操作
 * POST /api/v1/purchase/orders/batch
 */
router.post('/orders/batch',
  requirePermission({
    resource: ResourceModule.PURCHASE_ORDER,
    action: PermissionAction.UPDATE
  }),
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '功能暂未实现'
    })
  }
)

export default router
