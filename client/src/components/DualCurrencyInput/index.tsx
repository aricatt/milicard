import React, { useState, useEffect, useCallback } from 'react';
import { InputNumber, Space, Typography, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { getCurrencySymbol } from '@/utils/currency';

const { Text } = Typography;

interface DualCurrencyInputProps {
  value?: number;
  onChange?: (value: number | null) => void;
  currencyCode: string;
  exchangeRate: number;
  min?: number;
  precision?: number;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  addonAfter?: React.ReactNode;
  /** 人民币支付模式：true时人民币输入框可编辑，基地货币不可编辑 */
  cnyPaymentMode?: boolean;
  /** 人民币金额变化回调（用于人民币支付模式） */
  onCnyValueChange?: (cnyValue: number | null) => void;
  /** 外部设置的人民币初始值（用于自动填充） */
  initialCnyValue?: number;
}

/**
 * 双货币金额输入组件
 * 左边输入人民币，右边输入当前货币
 * 输入任一边，另一边自动按汇率转换
 * value 和 onChange 操作的是当前货币值（存入数据库的值）
 */
const DualCurrencyInput: React.FC<DualCurrencyInputProps> = ({
  value,
  onChange,
  currencyCode,
  exchangeRate,
  min = 0,
  precision = 2,
  placeholder,
  disabled = false,
  style,
  addonAfter,
  cnyPaymentMode = false,
  onCnyValueChange,
  initialCnyValue,
}) => {
  const intl = useIntl();
  const [cnyValue, setCnyValue] = useState<number | null>(initialCnyValue ?? null);
  const [localValue, setLocalValue] = useState<number | null>(null);
  const [activeInput, setActiveInput] = useState<'cny' | 'local' | null>(null);

  const currencySymbol = getCurrencySymbol(currencyCode);
  const isCNY = currencyCode === 'CNY';

  // 当外部 value 变化时，同步更新两个输入框
  useEffect(() => {
    if (activeInput === null) {
      if (value !== undefined && value !== null) {
        setLocalValue(value);
        if (exchangeRate && exchangeRate !== 0) {
          setCnyValue(Number((value / exchangeRate).toFixed(precision)));
        }
      } else {
        setLocalValue(null);
        setCnyValue(null);
      }
    }
  }, [value, exchangeRate, precision, activeInput]);

  // 当外部设置的人民币初始值变化时，更新输入框
  useEffect(() => {
    if (initialCnyValue !== undefined && initialCnyValue > 0) {
      setCnyValue(initialCnyValue);
      onCnyValueChange?.(initialCnyValue);
      if (exchangeRate) {
        const converted = Number((initialCnyValue * exchangeRate).toFixed(precision));
        setLocalValue(converted);
        onChange?.(converted);
      }
    }
  }, [initialCnyValue]);

  // 人民币输入变化
  const handleCnyChange = useCallback((val: number | null) => {
    setActiveInput('cny');
    setCnyValue(val);
    onCnyValueChange?.(val);
    if (val !== null && exchangeRate) {
      const converted = Number((val * exchangeRate).toFixed(precision));
      setLocalValue(converted);
      onChange?.(converted);
    } else {
      setLocalValue(null);
      onChange?.(null);
    }
    // 延迟重置 activeInput
    setTimeout(() => setActiveInput(null), 100);
  }, [exchangeRate, precision, onChange, onCnyValueChange]);

  // 当前货币输入变化
  const handleLocalChange = useCallback((val: number | null) => {
    setActiveInput('local');
    setLocalValue(val);
    if (val !== null && exchangeRate && exchangeRate !== 0) {
      const converted = Number((val / exchangeRate).toFixed(precision));
      setCnyValue(converted);
    } else {
      setCnyValue(null);
    }
    onChange?.(val);
    // 延迟重置 activeInput
    setTimeout(() => setActiveInput(null), 100);
  }, [exchangeRate, precision, onChange]);

  // 如果是人民币基地，只显示单个输入框
  if (isCNY) {
    return (
      <InputNumber
        value={value}
        onChange={onChange}
        min={min}
        precision={precision}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', ...style }}
        addonAfter={addonAfter || "¥"}
      />
    );
  }

  // 根据 cnyPaymentMode 决定哪个输入框可编辑
  // 人民币支付模式：人民币可编辑，基地货币不可编辑
  // 非人民币支付模式：基地货币可编辑，人民币不可编辑
  const cnyDisabled = disabled || !cnyPaymentMode;
  const localDisabled = disabled || cnyPaymentMode;

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <Tooltip title={intl.formatMessage({ id: 'dualCurrency.cnyInput' })}>
        <InputNumber
          value={cnyValue}
          onChange={handleCnyChange}
          min={min}
          precision={precision}
          placeholder="¥"
          disabled={cnyDisabled}
          style={{ width: '35%' }}
          addonAfter="¥"
        />
      </Tooltip>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 6px',
        backgroundColor: '#fafafa',
        border: '1px solid #d9d9d9',
        borderLeft: 'none',
        borderRight: 'none',
      }}>
        <SwapOutlined style={{ color: '#999' }} />
      </div>
      <Tooltip title={intl.formatMessage({ id: 'dualCurrency.localInput' })}>
        <InputNumber
          value={localValue}
          onChange={handleLocalChange}
          min={min}
          precision={precision}
          placeholder={currencySymbol}
          disabled={localDisabled}
          style={{ width: '55%' }}
          addonAfter={addonAfter || currencySymbol}
        />
      </Tooltip>
    </Space.Compact>
  );
};

export default DualCurrencyInput;
