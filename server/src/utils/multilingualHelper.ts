import { SupportedLanguage } from '../types/i18n'
import { MultilingualText } from '../types/multilingualData'

// 多语言数据处理工具
export class MultilingualHelper {
  
  // 创建多语言文本对象
  static createMultilingualText(
    zhText: string,
    translations?: Partial<Record<SupportedLanguage, string>>
  ): MultilingualText {
    return {
      zh_CN: zhText,
      en_US: translations?.en_US || zhText,
      vi_VN: translations?.vi_VN || zhText,
      th_TH: translations?.th_TH || zhText
    }
  }

  // 从多语言对象获取指定语言的文本
  static getText(
    multilingualText: MultilingualText | any,
    language: SupportedLanguage = 'zh_CN'
  ): string {
    if (!multilingualText || typeof multilingualText !== 'object') {
      return String(multilingualText || '')
    }

    // 尝试获取指定语言的文本
    const text = multilingualText[language.replace('-', '_')]
    if (text) return text

    // 回退到中文
    const fallbackText = multilingualText.zh_CN
    if (fallbackText) return fallbackText

    // 最后回退到第一个可用的文本
    const firstAvailable = Object.values(multilingualText).find(t => t && typeof t === 'string')
    return String(firstAvailable || '')
  }

  // 更新多语言文本的某个语言版本
  static updateText(
    multilingualText: MultilingualText,
    language: SupportedLanguage,
    newText: string
  ): MultilingualText {
    return {
      ...multilingualText,
      [language.replace('-', '_')]: newText
    }
  }

  // 检查多语言文本是否完整（所有语言都有翻译）
  static isComplete(multilingualText: MultilingualText): boolean {
    const languages: SupportedLanguage[] = ['zh_CN', 'en_US', 'vi_VN', 'th_TH']
    return languages.every(lang => {
      const key = lang.replace('-', '_') as keyof MultilingualText
      return multilingualText[key] && multilingualText[key].trim().length > 0
    })
  }

  // 获取缺失的语言列表
  static getMissingLanguages(multilingualText: MultilingualText): SupportedLanguage[] {
    const languages: SupportedLanguage[] = ['zh_CN', 'en_US', 'vi_VN', 'th_TH']
    return languages.filter(lang => {
      const key = lang.replace('-', '_') as keyof MultilingualText
      return !multilingualText[key] || multilingualText[key].trim().length === 0
    })
  }

  // 为API响应处理多语言字段
  static processApiResponse<T extends Record<string, any>>(
    data: T | T[],
    multilingualFields: string[],
    language: SupportedLanguage = 'zh_CN'
  ): T | T[] {
    const processItem = (item: T): T => {
      const processed = { ...item }
      
      multilingualFields.forEach(field => {
        if (item[field]) {
          // 添加本地化字段
          processed[`${field}Localized`] = this.getText(item[field], language)
          
          // 保留原始多语言对象（可选）
          // processed[field] = item[field]
        }
      })
      
      return processed
    }

    return Array.isArray(data) 
      ? data.map(processItem)
      : processItem(data)
  }

  // 验证多语言文本格式
  static validateMultilingualText(text: any): text is MultilingualText {
    if (!text || typeof text !== 'object') return false
    
    // 至少要有中文
    if (!text.zh_CN || typeof text.zh_CN !== 'string') return false
    
    // 其他语言可选，但如果存在必须是字符串
    const optionalLangs = ['en_US', 'vi_VN', 'th_TH']
    return optionalLangs.every(lang => 
      !text[lang] || typeof text[lang] === 'string'
    )
  }
}

// 支持的多语言字段键名（用于 nameI18n JSON 字段搜索）
// 注意：这里使用的是 JSON 字段内的键名格式（下划线分隔）
export const SUPPORTED_I18N_KEYS = ['en', 'th', 'vi', 'zh_TW'] as const

/**
 * 生成多语言名称搜索条件（支持大小写不敏感）
 * 
 * 策略：同时搜索多个大小写变体，实现全面的大小写不敏感搜索
 * 这样可以在不修改数据存储的情况下，匹配各种大小写组合
 * 
 * 生成的搜索变体：
 * 1. 原始词（用户输入的）
 * 2. 全小写
 * 3. 首字母大写
 * 4. 全大写
 * 
 * 示例：用户输入 "kayou"
 * - 搜索 "kayou"（原始）
 * - 搜索 "kayou"（小写）
 * - 搜索 "Kayou"（首字母大写）
 * - 搜索 "KAYOU"（全大写）
 * 
 * 可以匹配到数据库中的：
 * - "kayou" ✓
 * - "Kayou" ✓
 * - "KAYOU" ✓
 * - "KaYoU" ✓（包含 "kayou" 子串）
 * 
 * @param search 搜索关键词
 * @param fieldName JSON 字段名，默认为 'nameI18n'
 * @returns Prisma OR 条件数组
 */
export function buildI18nSearchConditions(search: string, fieldName: string = 'nameI18n'): any[] {
  const conditions: any[] = []
  
  // 生成不同的大小写变体
  const searchVariants = new Set<string>([
    search,                                                    // 原始词
    search.toLowerCase(),                                      // 全小写
    search.charAt(0).toUpperCase() + search.slice(1).toLowerCase(), // 首字母大写
    search.toUpperCase(),                                      // 全大写
  ])
  
  // 为每个语言键和每个搜索变体生成条件
  SUPPORTED_I18N_KEYS.forEach(key => {
    searchVariants.forEach(variant => {
      conditions.push({
        [fieldName]: {
          path: [key],
          string_contains: variant,
        }
      })
    })
  })
  
  return conditions
}

/**
 * 生成包含主名称和多语言名称的完整搜索条件
 * @param search 搜索关键词
 * @param includeCode 是否包含编号搜索
 * @returns Prisma OR 条件数组
 */
export function buildGoodsSearchConditions(search: string, includeCode: boolean = true): any[] {
  const conditions: any[] = [
    { name: { contains: search, mode: 'insensitive' } },
    ...buildI18nSearchConditions(search),
  ]
  
  if (includeCode) {
    conditions.unshift({ code: { contains: search, mode: 'insensitive' } })
  }
  
  return conditions
}

/**
 * 生成关联商品的多语言搜索条件（用于关联查询，支持大小写不敏感）
 * 
 * 策略：同时搜索多个大小写变体，实现全面的大小写不敏感搜索
 * 
 * @param search 搜索关键词
 * @param relationField 关联字段名，默认为 'goods'
 * @returns Prisma OR 条件数组
 */
export function buildRelatedGoodsSearchConditions(search: string, relationField: string = 'goods'): any[] {
  const conditions: any[] = []
  
  // 主名称搜索（已支持大小写不敏感）
  conditions.push({ [relationField]: { name: { contains: search, mode: 'insensitive' } } })
  
  // 生成不同的大小写变体
  const searchVariants = new Set<string>([
    search,                                                    // 原始词
    search.toLowerCase(),                                      // 全小写
    search.charAt(0).toUpperCase() + search.slice(1).toLowerCase(), // 首字母大写
    search.toUpperCase(),                                      // 全大写
  ])
  
  // 多语言字段搜索
  SUPPORTED_I18N_KEYS.forEach(key => {
    searchVariants.forEach(variant => {
      conditions.push({
        [relationField]: {
          nameI18n: {
            path: [key],
            string_contains: variant,
          }
        }
      })
    })
  })
  
  return conditions
}

// Express中间件：自动处理多语言响应
export const withMultilingualResponse = (multilingualFields: string[]) => {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json
    
    res.json = function(data: any) {
      if (data && (data.data || data.items)) {
        const language = req.language || 'zh_CN'
        const targetData = data.data || data.items
        
        const processedData = MultilingualHelper.processApiResponse(
          targetData,
          multilingualFields,
          language
        )
        
        if (data.data) {
          data.data = processedData
        } else {
          data.items = processedData
        }
      }
      
      return originalJson.call(this, data)
    }
    
    next()
  }
}
