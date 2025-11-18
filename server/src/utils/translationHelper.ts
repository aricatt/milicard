import { TranslationManager } from '../services/translationService'
import { SupportedLanguage } from '../types/i18n'

const translationManager = new TranslationManager()

// 翻译助手类 - 优化性能的翻译获取
export class TranslationHelper {
  private static cache = new Map<string, Record<string, string>>()
  private static cacheExpiry = new Map<string, number>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  // 批量获取翻译（推荐使用）
  static async getTranslations(
    keys: string[], 
    language: SupportedLanguage = 'zh-CN'
  ): Promise<Record<string, string>> {
    const cacheKey = `${language}:${keys.sort().join(',')}`
    
    // 检查缓存
    if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 从数据库批量获取
    const translations = await translationManager.getTranslations(keys, language)
    
    // 更新缓存
    this.cache.set(cacheKey, translations)
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL)
    
    return translations
  }

  // 为API响应添加翻译字段
  static async enrichWithTranslations<T extends Record<string, any>>(
    data: T | T[],
    translationMap: Record<string, string>, // 字段映射，如 { name: 'nameKey', description: 'descriptionKey' }
    language: SupportedLanguage = 'zh-CN'
  ): Promise<T | T[]> {
    const items = Array.isArray(data) ? data : [data]
    
    // 收集所有需要翻译的键
    const translationKeys = new Set<string>()
    items.forEach(item => {
      Object.values(translationMap).forEach(keyField => {
        if (item[keyField]) {
          translationKeys.add(item[keyField])
        }
      })
    })

    // 批量获取翻译
    const translations = await this.getTranslations(Array.from(translationKeys), language)

    // 为每个项目添加翻译字段
    const enrichedItems = items.map(item => {
      const enriched = { ...item }
      
      Object.entries(translationMap).forEach(([targetField, keyField]) => {
        const translationKey = item[keyField]
        if (translationKey && translations[translationKey]) {
          enriched[`${targetField}Localized`] = translations[translationKey]
        }
      })
      
      return enriched
    })

    return Array.isArray(data) ? enrichedItems : enrichedItems[0]
  }

  // 检查缓存是否有效
  private static isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry ? Date.now() < expiry : false
  }

  // 清除过期缓存
  static clearExpiredCache() {
    const now = Date.now()
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.cache.delete(key)
        this.cacheExpiry.delete(key)
      }
    }
  }
}

// 中间件：为API响应自动添加翻译
export const withTranslations = (translationMap: Record<string, string>) => {
  return async (req: any, res: any, next: any) => {
    const originalJson = res.json
    
    res.json = async function(data: any) {
      if (data && (data.data || data.items)) {
        const language = req.language || 'zh-CN' // 从请求中获取语言
        const targetData = data.data || data.items
        
        const enrichedData = await TranslationHelper.enrichWithTranslations(
          targetData,
          translationMap,
          language
        )
        
        if (data.data) {
          data.data = enrichedData
        } else {
          data.items = enrichedData
        }
      }
      
      return originalJson.call(this, data)
    }
    
    next()
  }
}
