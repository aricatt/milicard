import { Router } from 'express';
import { PurchaseBaseController } from '../controllers/purchaseBaseController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * 基地采购路由 - 阿米巴模式
 * 所有路由都需要认证
 */

/**
 * 获取基地采购统计
 * GET /api/v1/bases/{baseId}/purchase-orders/stats
 */
router.get('/:baseId/purchase-orders/stats', authenticateToken, PurchaseBaseController.getBasePurchaseStats);

/**
 * 获取基地的采购订单列表
 * GET /api/v1/bases/{baseId}/purchase-orders
 */
router.get('/:baseId/purchase-orders', authenticateToken, PurchaseBaseController.getBasePurchaseOrderList);

/**
 * 创建采购订单
 * POST /api/v1/bases/{baseId}/purchase-orders
 */
router.post('/:baseId/purchase-orders', authenticateToken, PurchaseBaseController.createPurchaseOrder);

/**
 * 删除采购订单
 * DELETE /api/v1/bases/{baseId}/purchase-orders/:orderId
 */
router.delete('/:baseId/purchase-orders/:orderId', authenticateToken, PurchaseBaseController.deletePurchaseOrder);

/**
 * 导入采购订单
 * POST /api/v1/bases/{baseId}/purchase-orders/import
 */
router.post('/:baseId/purchase-orders/import', authenticateToken, PurchaseBaseController.importPurchaseOrder);

/**
 * 获取基地供应商列表
 * GET /api/v1/bases/{baseId}/suppliers
 */
router.get('/:baseId/suppliers', authenticateToken, PurchaseBaseController.getBaseSuppliers);

/**
 * 创建基地供应商
 * POST /api/v1/bases/{baseId}/suppliers
 */
router.post('/:baseId/suppliers', authenticateToken, PurchaseBaseController.createBaseSupplier);

/**
 * 更新基地供应商
 * PUT /api/v1/bases/{baseId}/suppliers/:supplierId
 */
router.put('/:baseId/suppliers/:supplierId', authenticateToken, PurchaseBaseController.updateBaseSupplier);

/**
 * 删除基地供应商
 * DELETE /api/v1/bases/{baseId}/suppliers/:supplierId
 */
router.delete('/:baseId/suppliers/:supplierId', authenticateToken, PurchaseBaseController.deleteBaseSupplier);

export default router;
