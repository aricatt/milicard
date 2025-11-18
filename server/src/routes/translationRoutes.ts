import { Router } from 'express'
import {
  getTranslation,
  getTranslations,
  upsertTranslation,
  batchUpsertTranslations,
  getTranslationStats,
  clearTranslationCache
} from '../controllers/translationController'

const router = Router()

// 获取单个翻译
router.get('/:key', getTranslation)

// 批量获取翻译
router.get('/', getTranslations)

// 创建或更新翻译
router.post('/', upsertTranslation)

// 批量创建翻译
router.post('/batch', batchUpsertTranslations)

// 获取翻译统计
router.get('/stats/overview', getTranslationStats)

// 清除缓存
router.delete('/cache', clearTranslationCache)

export default router
