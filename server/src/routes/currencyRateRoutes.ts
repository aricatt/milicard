import { Router } from 'express';
import { CurrencyRateController } from '../controllers/currencyRateController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取所有货币汇率（包含当日实时汇率）- 用于货币汇率页面
router.get('/with-live-rates', CurrencyRateController.getAllWithLiveRates);

// 获取当日实时汇率
router.get('/live-rates', CurrencyRateController.getLiveRates);

// 获取货币汇率列表
router.get('/', CurrencyRateController.getList);

// 获取单个货币汇率
router.get('/:id', CurrencyRateController.getById);

// 创建货币汇率
router.post('/', CurrencyRateController.create);

// 更新货币汇率
router.put('/:id', CurrencyRateController.update);

// 删除货币汇率
router.delete('/:id', CurrencyRateController.delete);

export default router;
