import { Router } from 'express'
import { categoryController } from '../controllers/categoryController'
import { authenticateToken } from '../middleware/authMiddleware'
import { checkSystemPermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 获取所有品类（下拉选择用）
router.get('/all', checkSystemPermission('category', 'read'), categoryController.getAll.bind(categoryController))

// 品类列表（分页）
router.get('/', checkSystemPermission('category', 'read'), categoryController.list.bind(categoryController))

// 获取单个品类
router.get('/:id', checkSystemPermission('category', 'read'), categoryController.getById.bind(categoryController))

// 创建品类
router.post('/', checkSystemPermission('category', 'create'), categoryController.create.bind(categoryController))

// 更新品类
router.put('/:id', checkSystemPermission('category', 'update'), categoryController.update.bind(categoryController))

// 删除品类
router.delete('/:id', checkSystemPermission('category', 'delete'), categoryController.delete.bind(categoryController))

export default router
