import { Router } from 'express';
import { CurrencyRateController } from '../controllers/currencyRateController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkSystemPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取所有货币汇率（包含当日实时汇率）- 用于全局组件，不应用字段权限过滤
router.get('/with-live-rates', checkSystemPermission('currency_rate', 'read'), CurrencyRateController.getAllWithLiveRates);

// 获取当日实时汇率 - 用于全局组件，不应用字段权限过滤
router.get('/live-rates', checkSystemPermission('currency_rate', 'read'), CurrencyRateController.getLiveRates);

// 获取货币汇率列表
router.get('/', checkSystemPermission('currency_rate', 'read'), injectDataPermission('currencyRate'), filterResponseFields(), CurrencyRateController.getList);

// 获取单个货币汇率
router.get('/:id', checkSystemPermission('currency_rate', 'read'), injectDataPermission('currencyRate'), filterResponseFields(), CurrencyRateController.getById);

// 创建货币汇率
router.post('/', checkSystemPermission('currency_rate', 'create'), CurrencyRateController.create);

// 更新货币汇率
router.put('/:id', checkSystemPermission('currency_rate', 'update'), CurrencyRateController.update);

// 删除货币汇率
router.delete('/:id', checkSystemPermission('currency_rate', 'delete'), CurrencyRateController.delete);

export default router;
