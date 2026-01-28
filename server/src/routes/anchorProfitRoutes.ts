import { Router } from 'express';
import { AnchorProfitController } from '../controllers/anchorProfitController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取统计数据（放在前面避免路由冲突）
router.get('/:baseId/anchor-profits/stats', checkPermission('anchor_profit', 'read'), injectDataPermission('anchorProfit'), filterResponseFields(), AnchorProfitController.getStats);

// 获取未关联利润的消耗记录
router.get('/:baseId/anchor-profits/unlinked-consumptions', checkPermission('anchor_profit', 'read'), injectDataPermission('stockConsumption', ['goods', 'category']), filterResponseFields(), AnchorProfitController.getUnlinkedConsumptions);

// 获取消耗金额
router.get('/:baseId/anchor-profits/consumption-amount', checkPermission('anchor_profit', 'read'), AnchorProfitController.getConsumptionAmount);

// 获取主播利润列表
router.get('/:baseId/anchor-profits', checkPermission('anchor_profit', 'read'), injectDataPermission('anchorProfit'), filterResponseFields(), AnchorProfitController.getAnchorProfits);

// 创建主播利润记录
router.post('/:baseId/anchor-profits', checkPermission('anchor_profit', 'create'), AnchorProfitController.createAnchorProfit);

// 导入主播利润记录
router.post('/:baseId/anchor-profits/import', checkPermission('anchor_profit', 'create'), AnchorProfitController.importAnchorProfit);

// 更新主播利润记录
router.put('/:baseId/anchor-profits/:id', checkPermission('anchor_profit', 'update'), AnchorProfitController.updateAnchorProfit);

// 删除主播利润记录
router.delete('/:baseId/anchor-profits/:id', checkPermission('anchor_profit', 'delete'), AnchorProfitController.deleteAnchorProfit);

export default router;
