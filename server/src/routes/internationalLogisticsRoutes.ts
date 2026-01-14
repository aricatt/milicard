import { Router } from 'express';
import { InternationalLogisticsController } from '../controllers/internationalLogisticsController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 获取采购单的国际货运记录列表
// GET /api/v1/bases/:baseId/purchase-orders/:purchaseOrderId/international-logistics
router.get(
  '/:baseId/purchase-orders/:purchaseOrderId/international-logistics',
  authenticateToken,
  checkPermission('purchase_order', 'read'),
  injectDataPermission('internationalLogistics'),
  filterResponseFields(),
  InternationalLogisticsController.getByPurchaseOrderId
);

// 创建国际货运记录
// POST /api/v1/bases/:baseId/purchase-orders/:purchaseOrderId/international-logistics
router.post(
  '/:baseId/purchase-orders/:purchaseOrderId/international-logistics',
  authenticateToken,
  checkPermission('purchase_order', 'create'),
  InternationalLogisticsController.create
);

// 获取单个国际货运记录
// GET /api/v1/bases/:baseId/international-logistics/:id
router.get(
  '/:baseId/international-logistics/:id',
  authenticateToken,
  checkPermission('purchase_order', 'read'),
  injectDataPermission('internationalLogistics'),
  filterResponseFields(),
  InternationalLogisticsController.getById
);

// 更新国际货运记录
// PUT /api/v1/bases/:baseId/international-logistics/:id
router.put(
  '/:baseId/international-logistics/:id',
  authenticateToken,
  checkPermission('purchase_order', 'update'),
  InternationalLogisticsController.update
);

// 删除国际货运记录
// DELETE /api/v1/bases/:baseId/international-logistics/:id
router.delete(
  '/:baseId/international-logistics/:id',
  authenticateToken,
  checkPermission('purchase_order', 'delete'),
  InternationalLogisticsController.delete
);

export default router;
