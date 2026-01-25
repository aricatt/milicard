import React, { useState, useRef, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProTable, { ProColumns, ActionType } from '@ant-design/pro-table';
import { Card, Select, Space, DatePicker, Button, message, Modal } from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { useBase } from '@/contexts/BaseContext';
import MultiDateCalendar from './components/MultiDateCalendar';
import type { MonthlyGmvAdsStats, HandlerOption } from './types';
import { getAdsRecordList, getHandlerList } from '@/services/adsRecord';

const AdsRecordPage: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const { currentBase } = useBase();
  const baseId = currentBase?.id;

  // 金额格式化函数
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [selectedHandlers, setSelectedHandlers] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    // 默认选中当月已过去的所有天（包括今天）
    const today = dayjs();
    const startOfMonth = today.startOf('month');
    const dates: string[] = [];
    
    let current = startOfMonth;
    while (current.isBefore(today) || current.isSame(today, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    
    return dates;
  });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [handlerOptions, setHandlerOptions] = useState<HandlerOption[]>([]);

  // 动态生成列（只显示选中日期的列）
  const getDynamicColumns = (): ProColumns<MonthlyGmvAdsStats>[] => {
    const columns: ProColumns<MonthlyGmvAdsStats>[] = [];

    // 如果没有选中日期，不显示任何日期列
    if (selectedDates.length === 0) {
      return columns;
    }

    // 获取选中日期对应的天数，并排序
    const selectedDays = selectedDates
      .map(dateStr => dayjs(dateStr).date())
      .sort((a, b) => a - b);

    selectedDays.forEach(day => {
      // GMV列
      columns.push({
        title: `${day}号GMV`,
        dataIndex: `day${day}Gmv`,
        width: 100,
        hideInSearch: true,
        render: (value: any) => {
          const amount = Number(value) || 0;
          return amount > 0 ? (
            <span style={{ color: '#1890ff', fontWeight: 500 }}>
              {formatAmount(amount)}
            </span>
          ) : (
            <span style={{ color: '#999' }}>-</span>
          );
        },
      });

      // ADS列
      columns.push({
        title: `${day}号ADS`,
        dataIndex: `day${day}Ads`,
        width: 100,
        hideInSearch: true,
        render: (value: any) => {
          const amount = Number(value) || 0;
          return amount > 0 ? (
            <span style={{ color: '#52c41a' }}>
              {formatAmount(amount)}
            </span>
          ) : (
            <span style={{ color: '#999' }}>-</span>
          );
        },
      });
    });

    return columns;
  };

  const columns: ProColumns<MonthlyGmvAdsStats>[] = [
    {
      title: intl.formatMessage({ id: 'adsRecord.column.month' }),
      dataIndex: 'month',
      width: 100,
      fixed: 'left',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.handler' }),
      dataIndex: 'handlerName',
      width: 120,
      fixed: 'left',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.totalGmv' }),
      dataIndex: 'totalGmv',
      width: 140,
      fixed: 'left',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 16 }}>
          {formatAmount(record.totalGmv)}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.totalAds' }),
      dataIndex: 'totalAds',
      width: 140,
      fixed: 'left',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 16 }}>
          {formatAmount(record.totalAds)}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.adsRatio' }),
      dataIndex: 'adsRatio',
      width: 100,
      fixed: 'left',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#faad14', fontWeight: 500 }}>
          {record.adsRatio.toFixed(2)}%
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.liveDays' }),
      dataIndex: 'liveDays',
      width: 100,
      fixed: 'left',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#722ed1' }}>
          {record.liveDays} 天
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'adsRecord.column.avgDailyGmv' }),
      dataIndex: 'avgDailyGmv',
      width: 140,
      fixed: 'left',
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#13c2c2', fontWeight: 500 }}>
          {formatAmount(record.avgDailyGmv)}
        </span>
      ),
    },
    ...getDynamicColumns(),
  ];

  // 查询数据
  const fetchData = async (params: any) => {
    if (!baseId) {
      message.error('未找到基地信息');
      return { data: [], success: false, total: 0 };
    }

    try {
      const response = await getAdsRecordList({
        baseId,
        month: selectedMonth,
        handlerIds: selectedHandlers,
        selectedDates,
      });

      return {
        data: response.data || [],
        success: response.success,
        total: response.total || 0,
      };
    } catch (error) {
      message.error('查询失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 加载主播选项
  const loadHandlerOptions = async () => {
    if (!baseId) return;

    try {
      const response = await getHandlerList(baseId);
      if (response.success) {
        setHandlerOptions(response.data || []);
      }
    } catch (error) {
      message.error('加载主播列表失败');
    }
  };

  useEffect(() => {
    loadHandlerOptions();
  }, [baseId]);

  return (
    <PageContainer>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 搜索栏 */}
          <Space size="middle">
            <DatePicker
              picker="month"
              format="YYYY-MM"
              value={dayjs(selectedMonth, 'YYYY-MM')}
              onChange={(date) => {
                if (date) {
                  const newMonth = date.format('YYYY-MM');
                  setSelectedMonth(newMonth);
                  
                  // 自动选中该月已过去的所有天（包括今天）
                  const today = dayjs();
                  const selectedMonthObj = dayjs(newMonth, 'YYYY-MM');
                  const startOfMonth = selectedMonthObj.startOf('month');
                  const endOfMonth = selectedMonthObj.endOf('month');
                  const dates: string[] = [];
                  
                  let current = startOfMonth;
                  // 如果选择的是当前月份，选中到今天；否则选中整月
                  const endDate = selectedMonthObj.isSame(today, 'month') ? today : endOfMonth;
                  
                  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
                    dates.push(current.format('YYYY-MM-DD'));
                    current = current.add(1, 'day');
                  }
                  
                  setSelectedDates(dates);
                  actionRef.current?.reload();
                }
              }}
              placeholder={intl.formatMessage({ id: 'adsRecord.selectMonth' })}
            />

            <Select
              mode="multiple"
              placeholder={intl.formatMessage({ id: 'adsRecord.selectHandlers' })}
              style={{ minWidth: 200 }}
              value={selectedHandlers}
              onChange={(values) => {
                setSelectedHandlers(values);
                actionRef.current?.reload();
              }}
              options={handlerOptions.map(h => ({
                label: h.name,
                value: h.id,
              }))}
              maxTagCount="responsive"
            />

            <Button
              icon={<CalendarOutlined />}
              onClick={() => setCalendarVisible(true)}
            >
              {intl.formatMessage({ id: 'adsRecord.selectDates' })}
              {selectedDates.length > 0 && ` (${selectedDates.length})`}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                // TODO: 打开新增/编辑表单
                message.info('新增功能开发中');
              }}
            >
              {intl.formatMessage({ id: 'adsRecord.add' })}
            </Button>
          </Space>

          {/* 数据表格 */}
          <ProTable<MonthlyGmvAdsStats>
            actionRef={actionRef}
            columns={columns}
            request={fetchData}
            rowKey="id"
            search={false}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            scroll={{ x: 'max-content' }}
            options={{
              reload: true,
              density: true,
              setting: true,
            }}
          />
        </Space>
      </Card>

      {/* 日历多选弹窗 */}
      <Modal
        title={intl.formatMessage({ id: 'adsRecord.selectDates' })}
        open={calendarVisible}
        onCancel={() => setCalendarVisible(false)}
        onOk={() => {
          setCalendarVisible(false);
          actionRef.current?.reload();
        }}
        width={600}
      >
        <MultiDateCalendar
          value={selectedDates}
          onChange={setSelectedDates}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </Modal>
    </PageContainer>
  );
};

export default AdsRecordPage;
