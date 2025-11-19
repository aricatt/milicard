/**
 * 销售管理路由
 */

import { Router } from 'express'
import { SalesController } from '../controllers/salesController'
import { authenticateToken } from '../middleware/authMiddleware'
import { requirePermission, applyDataPermission } from '../middleware/permissionMiddleware'
import { ResourceModule, PermissionAction } from '../types/permission'
import {
  validateCustomerQuery,
  validateCreateCustomer,
  validateUpdateCustomer,
  validateSalesOrderQuery,
  validateCreateSalesOrder,
  validateUpdateSalesOrder,
  validateSalesStatsQuery
} from '../validators/salesValidators'

const router = Router()

// 应用认证中间件
router.use(authenticateToken)

// ================================
// 客户管理路由
// ================================

/**
 * 获取客户列表
 * GET /api/v1/sales/customers
 */
router.get('/customers',
  validateCustomerQuery,
  requirePermission({
    resource: ResourceModule.CUSTOMER,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.CUSTOMER, PermissionAction.READ),
  SalesController.getCustomerList
)

/**
 * 获取客户详情
 * GET /api/v1/sales/customers/:id
 */
router.get('/customers/:id',
  requirePermission({
    resource: ResourceModule.CUSTOMER,
    action: PermissionAction.READ
  }),
  SalesController.getCustomerById
)

/**
 * 创建客户
 * POST /api/v1/sales/customers
 */
router.post('/customers',
  validateCreateCustomer,
  requirePermission({
    resource: ResourceModule.CUSTOMER,
    action: PermissionAction.CREATE
  }),
  SalesController.createCustomer
)

/**
 * 更新客户
 * PUT /api/v1/sales/customers/:id
 */
router.put('/customers/:id',
  validateUpdateCustomer,
  requirePermission({
    resource: ResourceModule.CUSTOMER,
    action: PermissionAction.UPDATE
  }),
  SalesController.updateCustomer
)

/**
 * 删除客户
 * DELETE /api/v1/sales/customers/:id
 */
router.delete('/customers/:id',
  requirePermission({
    resource: ResourceModule.CUSTOMER,
    action: PermissionAction.DELETE
  }),
  SalesController.deleteCustomer
)

// ================================
// 销售订单管理路由
// ================================

/**
 * 获取销售订单列表
 * GET /api/v1/sales/orders
 */
router.get('/orders',
  validateSalesOrderQuery,
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.DISTRIBUTION_ORDER, PermissionAction.READ),
  SalesController.getSalesOrderList
)

/**
 * 获取销售订单详情
 * GET /api/v1/sales/orders/:id
 */
router.get('/orders/:id',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.READ
  }),
  SalesController.getSalesOrderById
)

/**
 * 创建销售订单
 * POST /api/v1/sales/orders
 */
router.post('/orders',
  validateCreateSalesOrder,
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.CREATE
  }),
  SalesController.createSalesOrder
)

/**
 * 更新销售订单
 * PUT /api/v1/sales/orders/:id
 */
router.put('/orders/:id',
  validateUpdateSalesOrder,
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.UPDATE
  }),
  SalesController.updateSalesOrder
)

/**
 * 删除销售订单
 * DELETE /api/v1/sales/orders/:id
 */
router.delete('/orders/:id',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.DELETE
  }),
  SalesController.deleteSalesOrder
)

// ================================
// 销售统计路由
// ================================

/**
 * 获取销售统计
 * GET /api/v1/sales/stats
 */
router.get('/stats',
  validateSalesStatsQuery,
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.DISTRIBUTION_ORDER, PermissionAction.READ),
  SalesController.getSalesStats
)

// ================================
// 预留扩展路由
// ================================

/**
 * 销售订单审核
 * POST /api/v1/sales/orders/:id/approve
 */
router.post('/orders/:id/approve',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
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
 * 销售订单取消
 * POST /api/v1/sales/orders/:id/cancel
 */
router.post('/orders/:id/cancel',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
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
 * 销售订单发货
 * POST /api/v1/sales/orders/:id/ship
 */
router.post('/orders/:id/ship',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
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
 * POST /api/v1/sales/orders/batch
 */
router.post('/orders/batch',
  requirePermission({
    resource: ResourceModule.DISTRIBUTION_ORDER,
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
