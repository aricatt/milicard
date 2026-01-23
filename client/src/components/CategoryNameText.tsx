import React, { useMemo } from 'react';
import { getLocale, useIntl } from '@umijs/max';

interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

type CategoryNameTextProps = {
  text?: string | null;
  nameI18n?: NameI18n | null;
};

/**
 * 根据当前语言获取品类名称
 * 优先显示当前语言的翻译，如果没有则回退到默认名称
 */
export function getLocalizedCategoryName(name: string | null | undefined, nameI18n?: NameI18n | null, locale?: string): string {
  if (!name) return '-';
  
  const currentLocale = locale || getLocale();
  const localeKey = currentLocale === 'en-US' ? 'en' : currentLocale === 'th-TH' ? 'th' : currentLocale === 'vi-VN' ? 'vi' : '';
  
  if (localeKey && nameI18n?.[localeKey]) {
    return nameI18n[localeKey]!;
  }
  
  return name;
}

export default function CategoryNameText({ text, nameI18n }: CategoryNameTextProps) {
  // 使用 useIntl 来订阅语言变化，确保语言切换时组件重新渲染
  const intl = useIntl();
  
  const displayText = useMemo(() => {
    if (!nameI18n) return text || '-';
    return getLocalizedCategoryName(text, nameI18n, intl.locale);
  }, [text, nameI18n, intl.locale]);
  
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
