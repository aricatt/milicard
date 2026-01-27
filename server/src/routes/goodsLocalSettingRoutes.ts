import { Router } from 'express'
import { GoodsLocalSettingController } from '../controllers/goodsLocalSettingController'
import { authenticateToken } from '../middleware/authMiddleware'
import { checkPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware'

const router = Router({ mergeParams: true })

// 所有路由都需要认证
router.use(authenticateToken)

// 基地商品设置路由
router.get('/', checkPermission('goods_local_setting', 'read'), injectDataPermission('goodsLocalSetting', ['goods', 'category']), filterResponseFields(), GoodsLocalSettingController.list)
router.get('/available', checkPermission('goods_local_setting', 'read'), injectDataPermission('goodsLocalSetting', ['goods', 'category']), filterResponseFields(), GoodsLocalSettingController.getAvailableGoods)
router.get('/:id', checkPermission('goods_local_setting', 'read'), injectDataPermission('goodsLocalSetting', ['goods', 'category']), filterResponseFields(), GoodsLocalSettingController.getById)
router.post('/', checkPermission('goods_local_setting', 'create'), GoodsLocalSettingController.create)
router.put('/:id', checkPermission('goods_local_setting', 'update'), GoodsLocalSettingController.update)
router.delete('/:id', checkPermission('goods_local_setting', 'delete'), GoodsLocalSettingController.delete)

export default router
