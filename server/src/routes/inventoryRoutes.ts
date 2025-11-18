// 库存管理路由

import { Router } from 'express'
import { InventoryController } from '../controllers/inventoryController'
import { authenticateToken } from '../middleware/authMiddleware'
import { 
  requirePermission, 
  requireAllPermissions,
  applyDataPermission 
} from '../middleware/permissionMiddleware'
import { 
  ResourceModule, 
  PermissionAction 
} from '../types/permission'
import {
  validateRequest,
  validateQuery,
  validateUuidParam,
  inventoryQuerySchema,
  createArrivalOrderSchema,
  createTransferOrderSchema,
  inventoryStatsSchema
} from '../validators/inventoryValidators'

const router = Router()

// ================================
// 库存查询路由
// ================================

/**
 * 获取库存列表
 * GET /api/v1/inventory
 */
router.get('/',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.INVENTORY, PermissionAction.READ),
  validateQuery(inventoryQuerySchema),
  InventoryController.getInventoryList
)

/**
 * 获取商品库存信息
 * GET /api/v1/inventory/goods/:goodsId
 */
router.get('/goods/:goodsId',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.READ
  }),
  validateUuidParam('goodsId'),
  InventoryController.getGoodsInventory
)

/**
 * 获取库存统计信息
 * GET /api/v1/inventory/stats
 */
router.get('/stats',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.READ
  }),
  validateQuery(inventoryStatsSchema),
  InventoryController.getInventoryStats
)

// ================================
// 到货入库路由
// ================================

/**
 * 获取到货入库单列表
 * GET /api/v1/inventory/arrivals
 */
router.get('/arrivals',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.INVENTORY, PermissionAction.READ),
  InventoryController.getArrivalOrderList
)

/**
 * 创建到货入库单
 * POST /api/v1/inventory/arrivals
 */
router.post('/arrivals',
  authenticateToken,
  requireAllPermissions([
    `${ResourceModule.INVENTORY}:${PermissionAction.CREATE}`,
    `${ResourceModule.PURCHASE_ORDER}:${PermissionAction.READ}`
  ]),
  validateRequest(createArrivalOrderSchema),
  InventoryController.createArrivalOrder
)

// ================================
// 调拨管理路由
// ================================

/**
 * 创建调拨单
 * POST /api/v1/inventory/transfers
 */
router.post('/transfers',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.CREATE
  }),
  validateRequest(createTransferOrderSchema),
  InventoryController.createTransferOrder
)

/**
 * 确认调拨单（执行库存转移）
 * POST /api/v1/inventory/transfers/:transferOrderId/confirm
 */
router.post('/transfers/:transferOrderId/confirm',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.UPDATE
  }),
  validateUuidParam('transferOrderId'),
  InventoryController.confirmTransferOrder
)

// ================================
// 库存调整路由（预留）
// ================================

/**
 * 库存调整
 * POST /api/v1/inventory/adjustments
 * 注意：此功能需要特殊权限，通常只有管理员可以执行
 */
router.post('/adjustments',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.UPDATE
  }),
  // validateRequest(inventoryAdjustmentSchema),  // 暂时注释，等后续实现
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '库存调整功能正在开发中'
    })
  }
)

// ================================
// 库存盘点路由（预留）
// ================================

/**
 * 创建库存盘点
 * POST /api/v1/inventory/stock-takes
 * 注意：此功能需要特殊权限
 */
router.post('/stock-takes',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.CREATE
  }),
  // validateRequest(createStockTakeSchema),  // 暂时注释，等后续实现
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '库存盘点功能正在开发中'
    })
  }
)

// ================================
// 批量操作路由（预留）
// ================================

/**
 * 批量库存操作
 * POST /api/v1/inventory/batch
 * 支持批量入库、出库等操作
 */
router.post('/batch',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.INVENTORY,
    action: PermissionAction.UPDATE
  }),
  // validateRequest(batchInventoryOperationSchema),  // 暂时注释，等后续实现
  (req, res) => {
    res.status(501).json({
      success: false,
      message: '批量库存操作功能正在开发中'
    })
  }
)

export default router
