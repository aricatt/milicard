import { Router } from 'express';
import { AnchorGmvAdsController } from '../controllers/anchorGmvAdsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/anchor-gmv-ads/:baseId/stats
 * @desc 获取月度GMV-ADS统计数据
 * @query month - 月份 (YYYY-MM)
 * @query handlerIds - 主播ID列表（逗号分隔）
 * @query selectedDates - 选中的日期列表（逗号分隔）
 */
router.get('/:baseId/stats', AnchorGmvAdsController.getMonthlyStats);

/**
 * @route GET /api/anchor-gmv-ads/:baseId/handlers
 * @desc 获取主播列表（用于下拉选择）
 */
router.get('/:baseId/handlers', AnchorGmvAdsController.getHandlerOptions);

/**
 * @route POST /api/anchor-gmv-ads/:baseId
 * @desc 创建或更新ADS记录
 * @body { month, handlerId, handlerName?, day1Ads?, day2Ads?, ..., day31Ads? }
 */
router.post('/:baseId', AnchorGmvAdsController.upsertAdsRecord);

/**
 * @route DELETE /api/anchor-gmv-ads/:baseId/:id
 * @desc 删除ADS记录
 */
router.delete('/:baseId/:id', AnchorGmvAdsController.deleteAdsRecord);

export default router;
