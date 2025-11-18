import { Request, Response, NextFunction } from 'express'
import { detectLanguage } from '../utils/i18n'
import { SupportedLanguage } from '../types/i18n'

// 扩展Request类型以包含language属性
declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage
    }
  }
}

// 语言检测中间件
export const languageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 从请求头检测语言
  const acceptLanguage = req.headers['accept-language']
  req.language = detectLanguage(acceptLanguage)
  
  next()
}

// 页面级翻译预加载中间件
export const preloadTranslations = (translationKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 预加载当前页面需要的所有翻译
      const { TranslationHelper } = await import('../utils/translationHelper')
      
      const translations = await TranslationHelper.getTranslations(
        translationKeys,
        req.language
      )
      
      // 将翻译添加到请求对象中，供后续使用
      req.translations = translations
      
      next()
    } catch (error) {
      // 翻译加载失败不应该阻塞请求
      console.error('Failed to preload translations:', error)
      next()
    }
  }
}

// 使用示例：
// app.use('/api/v1/roles', preloadTranslations([
//   'role.super_admin',
//   'role.boss', 
//   'role.finance',
//   'role.warehouse_manager',
//   'role.anchor'
// ]))
