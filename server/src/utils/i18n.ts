import { SupportedLanguage, TranslationKey } from '../types/i18n'

// 默认语言
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh-CN'

// 获取翻译文本
export function getTranslation(
  translationKey: TranslationKey,
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  // 如果有对应语言的翻译，返回翻译
  if (translationKey.translations?.[language]) {
    return translationKey.translations[language]
  }
  
  // 如果没有对应语言的翻译，返回默认文本
  return translationKey.defaultText
}

// 获取所有支持的语言版本
export function getAllTranslations(translationKey: TranslationKey): Record<SupportedLanguage, string> {
  const result = {} as Record<SupportedLanguage, string>
  
  // 支持的所有语言
  const languages: SupportedLanguage[] = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR']
  
  languages.forEach(lang => {
    result[lang] = getTranslation(translationKey, lang)
  })
  
  return result
}

// 从数据库对象中提取多语言字段
export function extractI18nField(
  obj: { name?: string; nameKey?: string; description?: string; descriptionKey?: string },
  field: 'name' | 'description',
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const keyField = field === 'name' ? 'nameKey' : 'descriptionKey'
  const defaultField = field
  
  // 如果有多语言键，尝试获取翻译
  if (obj[keyField]) {
    // 这里可以从翻译文件或数据库中获取翻译
    // 暂时返回默认值
    return obj[defaultField] || obj[keyField] || ''
  }
  
  // 返回默认字段值
  return obj[defaultField] || ''
}

// 语言检测（从请求头获取）
export function detectLanguage(acceptLanguage?: string): SupportedLanguage {
  if (!acceptLanguage) return DEFAULT_LANGUAGE
  
  // 解析 Accept-Language 头
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim())
  
  // 查找支持的语言
  for (const lang of languages) {
    if (lang.startsWith('zh')) return 'zh-CN'
    if (lang.startsWith('en')) return 'en-US'
    if (lang.startsWith('vi')) return 'vi-VN'
    if (lang.startsWith('th')) return 'th-TH'
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('ko')) return 'ko-KR'
    if (lang.startsWith('id')) return 'id-ID'
    if (lang.startsWith('ms')) return 'ms-MY'
  }
  
  return DEFAULT_LANGUAGE
}
