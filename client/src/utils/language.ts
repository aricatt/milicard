/**
 * 语言配置和工具函数
 */

// 支持的语言代码
export type LanguageCode = 'zh-CN' | 'zh-TW' | 'vi' | 'th' | 'en';

// 语言配置
export interface LanguageConfig {
  code: LanguageCode;
  name: string;        // 本地名称
  nameEN: string;      // 英文名称
  nameCN: string;      // 中文名称
  // 日期格式
  dateFormat: string;
  // 时间格式
  timeFormat: string;
  // 日期时间格式
  dateTimeFormat: string;
}

// 语言配置映射
export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    nameEN: 'Simplified Chinese',
    nameCN: '简体中文',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
  },
  'zh-TW': {
    code: 'zh-TW',
    name: '繁體中文',
    nameEN: 'Traditional Chinese',
    nameCN: '繁体中文',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',
  },
  'vi': {
    code: 'vi',
    name: 'Tiếng Việt',
    nameEN: 'Vietnamese',
    nameCN: '越南语',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
  },
  'th': {
    code: 'th',
    name: 'ภาษาไทย',
    nameEN: 'Thai',
    nameCN: '泰语',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'DD/MM/YYYY HH:mm:ss',
  },
  'en': {
    code: 'en',
    name: 'English',
    nameEN: 'English',
    nameCN: '英语',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'MM/DD/YYYY HH:mm:ss',
  },
};

// 语言选项（用于下拉框）
export const LANGUAGE_OPTIONS = Object.values(LANGUAGES).map((l) => ({
  value: l.code,
  label: `${l.name} (${l.nameEN})`,
}));

/**
 * 获取语言配置
 */
export function getLanguageConfig(code: string): LanguageConfig {
  return LANGUAGES[code as LanguageCode] || LANGUAGES['zh-CN'];
}

/**
 * 获取语言名称
 */
export function getLanguageName(code: string, inChinese: boolean = true): string {
  const config = getLanguageConfig(code);
  return inChinese ? config.nameCN : config.name;
}

/**
 * 获取日期格式
 */
export function getDateFormat(code: string): string {
  return getLanguageConfig(code).dateFormat;
}

/**
 * 获取日期时间格式
 */
export function getDateTimeFormat(code: string): string {
  return getLanguageConfig(code).dateTimeFormat;
}
