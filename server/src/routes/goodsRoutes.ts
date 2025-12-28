import { Router } from 'express'
import { GoodsController } from '../controllers/goodsController'
import { authenticateToken } from '../middleware/authMiddleware'
import { 
  requirePermission, 
  requireAllPermissions,
  applyDataPermission,
  filterResponseFields
} from '../middleware/permissionMiddleware'
import { ResourceModule, PermissionAction } from '../types/permission'
import { validateRequest, createGoodsSchema, updateGoodsSchema, goodsQuerySchema } from '../validators/goodsValidators'

const router = Router()

/**
 * @route GET /api/v1/goods
 * @desc 获取商品列表
 * @access Private (需要商品查看权限)
 */
router.get('/',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.GOODS, PermissionAction.READ),
  filterResponseFields(),
  validateRequest(goodsQuerySchema, 'query'),
  GoodsController.getGoodsList
)

/**
 * @route GET /api/v1/goods/search
 * @desc 搜索商品（用于选择器）
 * @access Private (需要商品查看权限)
 */
router.get('/search',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.READ
  }),
  applyDataPermission(ResourceModule.GOODS, PermissionAction.READ),
  filterResponseFields(),
  GoodsController.searchGoods
)

/**
 * @route GET /api/v1/goods/:id
 * @desc 获取商品详情
 * @access Private (需要商品查看权限，允许所有者访问)
 */
router.get('/:id',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.READ,
    allowOwner: true
  }),
  applyDataPermission(ResourceModule.GOODS, PermissionAction.READ),
  filterResponseFields(),
  GoodsController.getGoodsById
)

/**
 * @route GET /api/v1/goods/:id/stock
 * @desc 获取商品库存信息
 * @access Private (需要库存查看权限)
 */
router.get('/:id/stock',
  authenticateToken,
  requireAllPermissions([
    `${ResourceModule.GOODS}:${PermissionAction.READ}` as any,
    `${ResourceModule.INVENTORY}:${PermissionAction.READ}` as any
  ]),
  GoodsController.getGoodsStock
)

/**
 * @route POST /api/v1/goods
 * @desc 创建商品
 * @access Private (需要商品创建权限)
 */
router.post('/',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.CREATE
  }),
  validateRequest(createGoodsSchema, 'body'),
  GoodsController.createGoods
)

/**
 * @route PUT /api/v1/goods/:id
 * @desc 更新商品
 * @access Private (需要商品更新权限，允许所有者访问)
 */
router.put('/:id',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.UPDATE,
    allowOwner: true
  }),
  validateRequest(updateGoodsSchema, 'body'),
  GoodsController.updateGoods
)

/**
 * @route DELETE /api/v1/goods/:id
 * @desc 删除商品
 * @access Private (需要商品删除权限)
 */
router.delete('/:id',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.DELETE
  }),
  GoodsController.deleteGoods
)

/**
 * @route POST /api/v1/goods/batch/status
 * @desc 批量更新商品状态
 * @access Private (需要商品更新权限)
 */
router.post('/batch/status',
  authenticateToken,
  requirePermission({
    resource: ResourceModule.GOODS,
    action: PermissionAction.UPDATE
  }),
  GoodsController.batchUpdateStatus
)

export default router
