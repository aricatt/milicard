import { Router } from 'express';
import { SalesBaseController } from '../controllers/salesBaseController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取基地销售统计（放在前面避免路由冲突）
 * GET /api/v1/bases/{baseId}/sales/stats
 */
router.get('/:baseId/sales/stats', checkPermission('receivable', 'read'), SalesBaseController.getBaseSalesStats);

/**
 * 获取基地的客户列表
 * GET /api/v1/bases/{baseId}/customers
 */
router.get('/:baseId/customers', checkPermission('customer', 'read'), SalesBaseController.getBaseCustomerList);

/**
 * 创建客户
 * POST /api/v1/bases/{baseId}/customers
 */
router.post('/:baseId/customers', checkPermission('customer', 'create'), SalesBaseController.createCustomer);

/**
 * 获取基地的销售订单列表
 * GET /api/v1/bases/{baseId}/distribution-orders
 */
router.get('/:baseId/distribution-orders', checkPermission('receivable', 'read'), SalesBaseController.getBaseDistributionOrderList);

export default router;
