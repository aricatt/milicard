import { Router } from 'express';
import { ArrivalController } from '../controllers/arrivalController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 基地到货管理路由
 * 基础路径: /api/v1/bases/:baseId/arrivals
 */

// 获取到货统计（放在 :recordId 路由之前避免冲突）
router.get('/:baseId/arrivals/stats', checkPermission('arrival_order', 'read'), injectDataPermission('arrivalRecord'), filterResponseFields(), ArrivalController.getArrivalStats);

// 获取基地到货记录列表
// 注意：到货记录包含采购单、商品、品类等关联数据，需要合并相关资源的字段权限
router.get('/:baseId/arrivals', checkPermission('arrival_order', 'read'), injectDataPermission('arrivalRecord', ['purchaseOrder', 'goods', 'category', 'location', 'handler']), filterResponseFields(), ArrivalController.getArrivalRecords);

// 创建到货记录
router.post('/:baseId/arrivals', checkPermission('arrival_order', 'create'), ArrivalController.createArrivalRecord);

// 导入到货记录
router.post('/:baseId/arrivals/import', checkPermission('arrival_order', 'create'), ArrivalController.importArrivalRecord);

// 删除到货记录
router.delete('/:baseId/arrivals/:recordId', checkPermission('arrival_order', 'delete'), ArrivalController.deleteArrivalRecord);

export default router;
