import { Router } from 'express';
import { AnchorProfitController } from '../controllers/anchorProfitController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取统计数据
router.get('/:baseId/anchor-profits/stats', AnchorProfitController.getStats);

// 获取未关联利润的消耗记录
router.get('/:baseId/anchor-profits/unlinked-consumptions', AnchorProfitController.getUnlinkedConsumptions);

// 获取消耗金额
router.get('/:baseId/anchor-profits/consumption-amount', AnchorProfitController.getConsumptionAmount);

// 获取主播利润列表
router.get('/:baseId/anchor-profits', AnchorProfitController.getAnchorProfits);

// 创建主播利润记录
router.post('/:baseId/anchor-profits', AnchorProfitController.createAnchorProfit);

// 导入主播利润记录
router.post('/:baseId/anchor-profits/import', AnchorProfitController.importAnchorProfit);

// 更新主播利润记录
router.put('/:baseId/anchor-profits/:id', AnchorProfitController.updateAnchorProfit);

// 删除主播利润记录
router.delete('/:baseId/anchor-profits/:id', AnchorProfitController.deleteAnchorProfit);

export default router;
