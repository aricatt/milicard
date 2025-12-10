import { Router } from 'express';
import { PurchaseBaseController } from '../controllers/purchaseBaseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

/**
 * 基地采购路由 - 阿米巴模式
 * 所有路由都需要认证和权限检查
 */

/**
 * 获取基地采购统计
 * GET /api/v1/bases/{baseId}/purchase-orders/stats
 */
router.get('/:baseId/purchase-orders/stats', authenticateToken, checkPermission('purchase_order', 'read'), PurchaseBaseController.getBasePurchaseStats);

/**
 * 获取基地的采购订单列表
 * GET /api/v1/bases/{baseId}/purchase-orders
 */
router.get('/:baseId/purchase-orders', authenticateToken, checkPermission('purchase_order', 'read'), PurchaseBaseController.getBasePurchaseOrderList);

/**
 * 创建采购订单
 * POST /api/v1/bases/{baseId}/purchase-orders
 */
router.post('/:baseId/purchase-orders', authenticateToken, checkPermission('purchase_order', 'create'), PurchaseBaseController.createPurchaseOrder);

/**
 * 删除采购订单
 * DELETE /api/v1/bases/{baseId}/purchase-orders/:orderId
 */
router.delete('/:baseId/purchase-orders/:orderId', authenticateToken, checkPermission('purchase_order', 'delete'), PurchaseBaseController.deletePurchaseOrder);

/**
 * 导入采购订单
 * POST /api/v1/bases/{baseId}/purchase-orders/import
 */
router.post('/:baseId/purchase-orders/import', authenticateToken, checkPermission('purchase_order', 'create'), PurchaseBaseController.importPurchaseOrder);

/**
 * 获取基地供应商列表
 * GET /api/v1/bases/{baseId}/suppliers
 */
router.get('/:baseId/suppliers', authenticateToken, checkPermission('supplier', 'read'), PurchaseBaseController.getBaseSuppliers);

/**
 * 创建基地供应商
 * POST /api/v1/bases/{baseId}/suppliers
 */
router.post('/:baseId/suppliers', authenticateToken, checkPermission('supplier', 'create'), PurchaseBaseController.createBaseSupplier);

/**
 * 更新基地供应商
 * PUT /api/v1/bases/{baseId}/suppliers/:supplierId
 */
router.put('/:baseId/suppliers/:supplierId', authenticateToken, checkPermission('supplier', 'update'), PurchaseBaseController.updateBaseSupplier);

/**
 * 删除基地供应商
 * DELETE /api/v1/bases/{baseId}/suppliers/:supplierId
 */
router.delete('/:baseId/suppliers/:supplierId', authenticateToken, checkPermission('supplier', 'delete'), PurchaseBaseController.deleteBaseSupplier);

/**
 * 获取采购订单物流信息（所有物流记录）
 * GET /api/v1/bases/{baseId}/purchase-orders/:orderId/logistics
 */
router.get('/:baseId/purchase-orders/:orderId/logistics', authenticateToken, checkPermission('purchase_order', 'read'), PurchaseBaseController.getPurchaseOrderLogistics);

/**
 * 添加物流单号
 * POST /api/v1/bases/{baseId}/purchase-orders/:orderId/logistics
 */
router.post('/:baseId/purchase-orders/:orderId/logistics', authenticateToken, checkPermission('purchase_order', 'update'), PurchaseBaseController.addLogisticsRecord);

/**
 * 删除物流记录
 * DELETE /api/v1/bases/{baseId}/purchase-orders/:orderId/logistics/:logisticsId
 */
router.delete('/:baseId/purchase-orders/:orderId/logistics/:logisticsId', authenticateToken, checkPermission('purchase_order', 'update'), PurchaseBaseController.deleteLogisticsRecord);

/**
 * 刷新单个物流记录
 * POST /api/v1/bases/{baseId}/purchase-orders/:orderId/logistics/:logisticsId/refresh
 */
router.post('/:baseId/purchase-orders/:orderId/logistics/:logisticsId/refresh', authenticateToken, checkPermission('purchase_order', 'update'), PurchaseBaseController.refreshLogisticsRecord);

/**
 * 更新采购订单
 * PUT /api/v1/bases/{baseId}/purchase-orders/:orderId
 */
router.put('/:baseId/purchase-orders/:orderId', authenticateToken, checkPermission('purchase_order', 'update'), PurchaseBaseController.updatePurchaseOrder);

export default router;
