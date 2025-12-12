import { Router } from 'express'
import { GlobalGoodsController } from '../controllers/globalGoodsController'
import { authenticateToken } from '../middleware/authMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 全局商品路由
router.get('/', GlobalGoodsController.list)
router.get('/:id', GlobalGoodsController.getById)
router.post('/', GlobalGoodsController.create)
router.put('/:id', GlobalGoodsController.update)
router.delete('/:id', GlobalGoodsController.delete)

export default router
