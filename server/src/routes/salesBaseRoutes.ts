import { Router } from 'express';
import { SalesBaseController } from '../controllers/salesBaseController';

const router = Router();

/**
 * 获取基地的客户列表
 * GET /api/v1/bases/{baseId}/customers
 */
router.get('/:baseId/customers', SalesBaseController.getBaseCustomerList);

/**
 * 创建客户
 * POST /api/v1/bases/{baseId}/customers
 */
router.post('/:baseId/customers', SalesBaseController.createCustomer);

/**
 * 获取基地的销售订单列表
 * GET /api/v1/bases/{baseId}/distribution-orders
 */
router.get('/:baseId/distribution-orders', SalesBaseController.getBaseDistributionOrderList);

/**
 * 获取基地销售统计
 * GET /api/v1/bases/{baseId}/sales/stats
 */
router.get('/:baseId/sales/stats', SalesBaseController.getBaseSalesStats);

export default router;
