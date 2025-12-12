import { Router } from 'express'
import { GoodsLocalSettingController } from '../controllers/goodsLocalSettingController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router({ mergeParams: true })

// 所有路由都需要认证
router.use(authenticateToken)

// 基地商品设置路由
router.get('/', GoodsLocalSettingController.list)
router.get('/available', GoodsLocalSettingController.getAvailableGoods)
router.get('/:id', GoodsLocalSettingController.getById)
router.post('/', GoodsLocalSettingController.create)
router.put('/:id', GoodsLocalSettingController.update)
router.delete('/:id', GoodsLocalSettingController.delete)

export default router
