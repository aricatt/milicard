import React, { useState } from 'react';
import { Calendar, Badge } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './MultiDateCalendar.less';

interface MultiDateCalendarProps {
  value?: string[];
  onChange?: (dates: string[]) => void;
  month?: string; // 格式: "2026-01"
  onMonthChange?: (month: string) => void;
}

const MultiDateCalendar: React.FC<MultiDateCalendarProps> = ({
  value = [],
  onChange,
  month,
  onMonthChange,
}) => {
  const [selectedDates, setSelectedDates] = useState<string[]>(value);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(
    month ? dayjs(month, 'YYYY-MM') : dayjs()
  );

  const handleSelect = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const monthStr = date.format('YYYY-MM');
    
    // 只允许选择当前月份的日期
    if (monthStr !== currentMonth.format('YYYY-MM')) {
      return;
    }

    let newSelectedDates: string[];
    const exists = selectedDates.includes(dateStr);

    if (exists) {
      // 取消选择
      newSelectedDates = selectedDates.filter(d => d !== dateStr);
    } else {
      // 添加选择
      newSelectedDates = [...selectedDates, dateStr];
    }

    setSelectedDates(newSelectedDates);
    onChange?.(newSelectedDates);
  };

  const handlePanelChange = (date: Dayjs) => {
    const newMonth = date.format('YYYY-MM');
    setCurrentMonth(date);
    onMonthChange?.(newMonth);
    
    // 清空选中日期（切换月份时）
    setSelectedDates([]);
    onChange?.([]);
  };

  const dateCellRender = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const isSelected = selectedDates.includes(dateStr);
    const isCurrentMonth = date.format('YYYY-MM') === currentMonth.format('YYYY-MM');

    if (!isCurrentMonth) {
      return null;
    }

    return (
      <div className={`date-cell ${isSelected ? 'selected' : ''}`}>
        {isSelected && <Badge status="processing" />}
      </div>
    );
  };

  const headerRender = () => {
    return (
      <div className="calendar-header">
        <div className="month-display">
          {currentMonth.format('YYYY年MM月')}
        </div>
        <div className="selected-count">
          已选择 {selectedDates.length} 天
        </div>
      </div>
    );
  };

  return (
    <div className="multi-date-calendar">
      {headerRender()}
      <Calendar
        value={currentMonth}
        onSelect={handleSelect}
        onPanelChange={handlePanelChange}
        fullscreen={false}
        cellRender={dateCellRender}
      />
    </div>
  );
};

export default MultiDateCalendar;
