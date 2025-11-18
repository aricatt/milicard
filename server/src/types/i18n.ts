// 多语言支持类型定义

export type SupportedLanguage = 'zh-CN' | 'en-US' | 'vi-VN' | 'th-TH' | 'ja-JP' | 'ko-KR' | 'id-ID' | 'ms-MY'

export interface TranslationKey {
  key: string
  defaultText: string
  translations?: Record<SupportedLanguage, string>
}

// 系统角色的多语言定义
export const SYSTEM_ROLES_I18N = {
  SUPER_ADMIN: {
    key: 'role.super_admin',
    defaultText: '超级管理员',
    translations: {
      'zh-CN': '超级管理员',
      'en-US': 'Super Administrator',
      'ja-JP': 'スーパー管理者',
      'ko-KR': '슈퍼 관리자'
    }
  },
  BOSS: {
    key: 'role.boss',
    defaultText: '老板',
    translations: {
      'zh-CN': '老板',
      'en-US': 'Boss',
      'ja-JP': 'ボス',
      'ko-KR': '사장'
    }
  },
  FINANCE: {
    key: 'role.finance',
    defaultText: '财务',
    translations: {
      'zh-CN': '财务',
      'en-US': 'Finance',
      'ja-JP': '財務',
      'ko-KR': '재무'
    }
  },
  WAREHOUSE_MANAGER: {
    key: 'role.warehouse_manager',
    defaultText: '仓管',
    translations: {
      'zh-CN': '仓管',
      'en-US': 'Warehouse Manager',
      'ja-JP': '倉庫管理者',
      'ko-KR': '창고 관리자'
    }
  },
  ANCHOR: {
    key: 'role.anchor',
    defaultText: '主播',
    translations: {
      'zh-CN': '主播',
      'en-US': 'Anchor',
      'ja-JP': 'アンカー',
      'ko-KR': '앵커'
    }
  }
} as const

// 权限模块的多语言定义
export const PERMISSION_MODULES_I18N = {
  INVENTORY: {
    key: 'module.inventory',
    defaultText: '库存管理',
    translations: {
      'zh-CN': '库存管理',
      'en-US': 'Inventory Management',
      'ja-JP': '在庫管理',
      'ko-KR': '재고 관리'
    }
  },
  SALES: {
    key: 'module.sales',
    defaultText: '销售管理',
    translations: {
      'zh-CN': '销售管理',
      'en-US': 'Sales Management',
      'ja-JP': '販売管理',
      'ko-KR': '판매 관리'
    }
  },
  FINANCE: {
    key: 'module.finance',
    defaultText: '财务管理',
    translations: {
      'zh-CN': '财务管理',
      'en-US': 'Finance Management',
      'ja-JP': '財務管理',
      'ko-KR': '재무 관리'
    }
  }
} as const
