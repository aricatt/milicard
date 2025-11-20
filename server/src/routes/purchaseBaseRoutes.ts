import { Router } from 'express';
import { PurchaseBaseController } from '../controllers/purchaseBaseController';

const router = Router();

/**
 * 获取基地的采购订单列表
 * GET /api/v1/bases/{baseId}/purchase-orders
 */
router.get('/:baseId/purchase-orders', PurchaseBaseController.getBasePurchaseOrderList);

/**
 * 创建采购订单
 * POST /api/v1/bases/{baseId}/purchase-orders
 */
router.post('/:baseId/purchase-orders', PurchaseBaseController.createPurchaseOrder);

/**
 * 获取基地采购统计
 * GET /api/v1/bases/{baseId}/purchase-orders/stats
 */
router.get('/:baseId/purchase-orders/stats', PurchaseBaseController.getBasePurchaseStats);

/**
 * 获取基地供应商列表
 * GET /api/v1/bases/{baseId}/suppliers
 */
router.get('/:baseId/suppliers', PurchaseBaseController.getBaseSuppliers);

export default router;
