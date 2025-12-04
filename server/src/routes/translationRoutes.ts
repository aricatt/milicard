import { Router } from 'express'
import {
  getTranslation,
  getTranslations,
  upsertTranslation,
  batchUpsertTranslations,
  getTranslationStats,
  clearTranslationCache
} from '../controllers/translationController'
import { authenticateToken } from '../middleware/authMiddleware'
import { checkSystemPermission } from '../middleware/permissionMiddleware'

const router = Router()

// 获取翻译统计（放在前面避免路由冲突）
router.get('/stats/overview', authenticateToken, checkSystemPermission('translation', 'read'), getTranslationStats)

// 获取单个翻译（公开访问，用于前端国际化）
router.get('/:key', getTranslation)

// 批量获取翻译（公开访问，用于前端国际化）
router.get('/', getTranslations)

// 创建或更新翻译（需要权限）
router.post('/', authenticateToken, checkSystemPermission('translation', 'update'), upsertTranslation)

// 批量创建翻译（需要权限）
router.post('/batch', authenticateToken, checkSystemPermission('translation', 'update'), batchUpsertTranslations)

// 清除缓存（需要权限）
router.delete('/cache', authenticateToken, checkSystemPermission('translation', 'delete'), clearTranslationCache)

export default router
