import { Router } from 'express'
import { GlobalGoodsController } from '../controllers/globalGoodsController'
import { authenticateToken } from '../middleware/authMiddleware'
import { injectDataPermission, filterResponseFields, checkSystemPermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 全局商品路由
router.get('/', checkSystemPermission('goods', 'read'), injectDataPermission('goods'), filterResponseFields(), GlobalGoodsController.list)
router.get('/manufacturers', checkSystemPermission('goods', 'read'), GlobalGoodsController.getManufacturers)
router.get('/:id', checkSystemPermission('goods', 'read'), injectDataPermission('goods'), filterResponseFields(), GlobalGoodsController.getById)
router.post('/', checkSystemPermission('goods', 'create'), GlobalGoodsController.create)
router.put('/:id', checkSystemPermission('goods', 'update'), GlobalGoodsController.update)
router.delete('/:id', checkSystemPermission('goods', 'delete'), GlobalGoodsController.delete)

export default router
