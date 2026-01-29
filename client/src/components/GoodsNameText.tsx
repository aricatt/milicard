import React, { useMemo } from 'react';
import { getLocale, useIntl } from '@umijs/max';

interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 品类中文名称映射
const CategoryNameMap: Record<string, string> = {
  CARD: '卡牌',
  CARD_BRICK: '卡砖',
  GIFT: '礼物',
  COLOR_PAPER: '色纸',
  FORTUNE_SIGN: '上上签',
  TEAR_CARD: '撕撕乐',
  TOY: '玩具',
  STAMP: '邮票',
  LUCKY_CAT: '招财猫',
};

type GoodsNameTextProps = {
  text?: string | null;
  nameI18n?: NameI18n | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  categoryNameI18n?: NameI18n | null;
  showCategory?: boolean;
};

/**
 * 根据当前语言获取品类显示名称
 * 优先使用多语言翻译，如果没有则回退到默认逻辑
 */
export function getCategoryDisplayName(
  categoryCode?: string | null, 
  categoryName?: string | null, 
  nameI18n?: NameI18n | null,
  locale?: string
): string {
  if (!categoryCode) return '';
  
  const currentLocale = locale || getLocale();
  
  // 优先使用多语言翻译
  const localeKey = currentLocale === 'en-US' ? 'en' : currentLocale === 'th-TH' ? 'th' : currentLocale === 'vi-VN' ? 'vi' : '';
  if (localeKey && nameI18n?.[localeKey]) {
    return nameI18n[localeKey]!;
  }
  
  // 回退到品类名称（中文）
  // 优先使用 categoryName，如果没有则使用映射表，最后才使用 categoryCode
  return categoryName || CategoryNameMap[categoryCode] || categoryCode;
}

/**
 * 根据当前语言获取商品名称
 * 优先显示当前语言的翻译，如果没有则回退到默认名称
 */
export function getLocalizedGoodsName(name: string | null | undefined, nameI18n?: NameI18n | null, locale?: string): string {
  if (!name) return '-';
  
  const currentLocale = locale || getLocale();
  const localeKey = currentLocale === 'en-US' ? 'en' : currentLocale === 'th-TH' ? 'th' : currentLocale === 'vi-VN' ? 'vi' : '';
  
  if (localeKey && nameI18n?.[localeKey]) {
    return nameI18n[localeKey]!;
  }
  
  return name;
}

/**
 * 获取带品类前缀的商品名称
 * 格式: [品类]商品名称
 */
export function getGoodsNameWithCategory(
  name: string | null | undefined,
  nameI18n?: NameI18n | null,
  categoryCode?: string | null,
  categoryName?: string | null,
  categoryNameI18n?: NameI18n | null,
  locale?: string
): string {
  const goodsName = getLocalizedGoodsName(name, nameI18n, locale);
  if (goodsName === '-') return '-';
  
  const categoryDisplay = getCategoryDisplayName(categoryCode, categoryName, categoryNameI18n, locale);
  if (!categoryDisplay) return goodsName;
  
  return `[${categoryDisplay}]${goodsName}`;
}

export default function GoodsNameText({ text, nameI18n, categoryCode, categoryName, categoryNameI18n, showCategory = false }: GoodsNameTextProps) {
  // 使用 useIntl 来订阅语言变化，确保语言切换时组件重新渲染
  const intl = useIntl();
  
  const displayText = useMemo(() => {
    if (showCategory) {
      return getGoodsNameWithCategory(text, nameI18n, categoryCode, categoryName, categoryNameI18n, intl.locale);
    }
    if (!nameI18n) return text || '-';
    return getLocalizedGoodsName(text, nameI18n, intl.locale);
  }, [text, nameI18n, categoryCode, categoryName, categoryNameI18n, showCategory, intl.locale]);
  
  return (
    <span
      style={{
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }}
    >
      {displayText}
    </span>
  );
}
