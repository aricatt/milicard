import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './MultiDateCalendar.less';

interface MultiDateCalendarProps {
  value?: string[];
  onChange?: (dates: string[]) => void;
  month?: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<'select' | 'deselect'>('select');
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChangeRef.current?.(selectedDates);
  }, [selectedDates]);

  const handleDateToggle = (dateStr: string, shouldSelect: boolean) => {
    setSelectedDates(prev => {
      const exists = prev.includes(dateStr);
      if (shouldSelect && !exists) {
        return [...prev, dateStr];
      } else if (!shouldSelect && exists) {
        return prev.filter(d => d !== dateStr);
      }
      return prev;
    });
  };

  const handleMouseDown = (dateStr: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const exists = selectedDates.includes(dateStr);
    dragModeRef.current = exists ? 'deselect' : 'select';
    handleDateToggle(dateStr, !exists);
  };

  const handleMouseEnter = (dateStr: string) => {
    if (!isDragging) return;
    const shouldSelect = dragModeRef.current === 'select';
    handleDateToggle(dateStr, shouldSelect);
  };

  const handlePrevMonth = () => {
    const newMonth = currentMonth.subtract(1, 'month');
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth.format('YYYY-MM'));
  };

  const handleNextMonth = () => {
    const newMonth = currentMonth.add(1, 'month');
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth.format('YYYY-MM'));
  };

  const handleSelectAll = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const allDates: string[] = [];
    
    let current = startOfMonth;
    while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
      allDates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    
    setSelectedDates(allDates);
  };

  const handleInvertSelection = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const allDates: string[] = [];
    
    let current = startOfMonth;
    while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');
      if (!selectedDates.includes(dateStr)) {
        allDates.push(dateStr);
      }
      current = current.add(1, 'day');
    }
    
    setSelectedDates(allDates);
  };

  const renderCalendar = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const weeks: Dayjs[][] = [];
    let currentWeek: Dayjs[] = [];
    let current = startDate;

    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      currentWeek.push(current);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current = current.add(1, 'day');
    }

    return (
      <div className="calendar-body">
        <div className="calendar-weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-dates">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map(date => {
                const dateStr = date.format('YYYY-MM-DD');
                const isSelected = selectedDates.includes(dateStr);
                const isCurrentMonth = date.month() === currentMonth.month();
                const isToday = date.isSame(dayjs(), 'day');

                return (
                  <div
                    key={dateStr}
                    className={`calendar-date ${
                      isSelected ? 'selected' : ''
                    } ${
                      !isCurrentMonth ? 'other-month' : ''
                    } ${
                      isToday ? 'today' : ''
                    }`}
                    onMouseDown={(e) => isCurrentMonth && handleMouseDown(dateStr, e)}
                    onMouseEnter={() => isCurrentMonth && handleMouseEnter(dateStr)}
                  >
                    <span className="date-number">{date.date()}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="multi-date-calendar">
      <div className="calendar-header">
        <div className="month-nav">
          <Button
            type="text"
            size="small"
            icon={<LeftOutlined />}
            onClick={handlePrevMonth}
          />
          <span className="month-display">
            {currentMonth.format('YYYY年MM月')}
          </span>
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={handleNextMonth}
          />
        </div>
        <div className="header-actions">
          <Button
            size="small"
            onClick={handleSelectAll}
          >
            全选
          </Button>
          <Button
            size="small"
            onClick={handleInvertSelection}
          >
            反选
          </Button>
          <span className="selected-count">
            已选择 {selectedDates.length} 天
          </span>
        </div>
      </div>
      {renderCalendar()}
    </div>
  );
};

export default MultiDateCalendar;
