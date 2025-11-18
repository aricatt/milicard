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
