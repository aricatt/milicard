import { Request, Response } from 'express'
import { TranslationManager } from '../services/translationService'
import { SupportedLanguage } from '../types/i18n'
import { detectLanguage } from '../utils/i18n'

const translationManager = new TranslationManager()

// 获取翻译
export const getTranslation = async (req: Request, res: Response) => {
  try {
    const { key } = req.params
    const language = detectLanguage(req.headers['accept-language']) as SupportedLanguage
    
    const translation = await translationManager.getTranslation(key, language)
    
    res.json({
      success: true,
      data: {
        key,
        language,
        value: translation
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get translation',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 批量获取翻译
export const getTranslations = async (req: Request, res: Response) => {
  try {
    const { keys, language } = req.query
    const lang = (language as SupportedLanguage) || detectLanguage(req.headers['accept-language']) as SupportedLanguage
    const keyArray = Array.isArray(keys) ? keys as string[] : (keys as string)?.split(',') || []
    
    const translations = await translationManager.getTranslations(keyArray, lang)
    
    res.json({
      success: true,
      data: {
        language: lang,
        translations
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get translations',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 创建或更新翻译
export const upsertTranslation = async (req: Request, res: Response) => {
  try {
    const { key, language, value, namespace, description, isSystem } = req.body
    const userId = req.user?.id // 假设有用户认证中间件
    
    const translation = await translationManager.upsertTranslation(
      key,
      language,
      value,
      {
        namespace,
        description,
        isSystem,
        createdBy: userId
      }
    )
    
    res.json({
      success: true,
      data: translation
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upsert translation',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 批量创建翻译
export const batchUpsertTranslations = async (req: Request, res: Response) => {
  try {
    const { translations, isSystem, isAiGenerated } = req.body
    const userId = req.user?.id
    
    const results = await translationManager.batchUpsertTranslations(
      translations,
      {
        isSystem,
        isAiGenerated,
        createdBy: userId
      }
    )
    
    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to batch upsert translations',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 获取翻译统计
export const getTranslationStats = async (req: Request, res: Response) => {
  try {
    const stats = await translationManager.getTranslationStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get translation stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// 清除翻译缓存
export const clearTranslationCache = async (req: Request, res: Response) => {
  try {
    const { language } = req.query
    
    translationManager.clearCache(language as SupportedLanguage)
    
    res.json({
      success: true,
      message: 'Translation cache cleared'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear translation cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
