/**
 * 货币配置和工具函数
 */

// 支持的货币代码
export type CurrencyCode = 'CNY' | 'VND' | 'THB' | 'USD';

// 货币配置
export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  nameCN: string;
  // 小数位数
  decimals: number;
  // 千分位分隔符
  thousandsSeparator: string;
  // 小数点符号
  decimalSeparator: string;
}

// 货币配置映射
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    nameCN: '人民币',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  VND: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    nameCN: '越南盾',
    decimals: 0, // 越南盾通常不显示小数
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
  THB: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    nameCN: '泰铢',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nameCN: '美元',
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
};

// 货币选项（用于下拉框）
export const CURRENCY_OPTIONS = Object.values(CURRENCIES).map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.nameCN} (${c.code})`,
}));

/**
 * 获取货币符号
 */
export function getCurrencySymbol(code: string): string {
  return CURRENCIES[code as CurrencyCode]?.symbol || '¥';
}

/**
 * 获取货币配置
 */
export function getCurrencyConfig(code: string): CurrencyConfig {
  return CURRENCIES[code as CurrencyCode] || CURRENCIES.CNY;
}

/**
 * 格式化金额
 * @param amount 金额数值
 * @param currencyCode 货币代码
 * @param showSymbol 是否显示货币符号
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currencyCode: string = 'CNY',
  showSymbol: boolean = true
): string {
  const num = Number(amount) || 0;
  const config = getCurrencyConfig(currencyCode);
  
  // 格式化数字
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
  
  return showSymbol ? `${config.symbol}${formatted}` : formatted;
}

/**
 * 解析金额字符串为数字
 */
export function parseCurrency(value: string, currencyCode: string = 'CNY'): number {
  const config = getCurrencyConfig(currencyCode);
  // 移除货币符号和千分位分隔符
  const cleaned = value
    .replace(config.symbol, '')
    .replace(new RegExp(`\\${config.thousandsSeparator}`, 'g'), '')
    .replace(config.decimalSeparator, '.')
    .trim();
  return parseFloat(cleaned) || 0;
}
