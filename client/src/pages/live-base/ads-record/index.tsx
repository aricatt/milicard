import React, { useState, useRef, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProTable, { ProColumns, ActionType } from '@ant-design/pro-table';
import { Select, Space, DatePicker, Button, message, Modal, Tooltip, Popconfirm, Checkbox } from 'antd';
import { PlusOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, ExportOutlined, ImportOutlined, DownloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { useBase } from '@/contexts/BaseContext';
import MultiDateCalendar from './components/MultiDateCalendar';
import AdsRecordForm from './components/AdsRecordForm';
import ImportModal from '@/components/ImportModal';
import { useAdsRecordExcel } from './useAdsRecordExcel';
import type { MonthlyGmvAdsStats, HandlerOption } from './types';
import { getAdsRecordList, getHandlerList, upsertAdsRecord, deleteAdsRecord } from '@/services/adsRecord';

const AdsRecordPage: React.FC = () => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  const { currentBase, currencyRate } = useBase();
  const baseId = currentBase?.id;

  // 金额格式化函数
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyGmvAdsStats | null>(null);
  const [showInCNY, setShowInCNY] = useState(false);

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useAdsRecordExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    selectedMonth: dayjs(selectedMonth, 'YYYY-MM'),
    selectedHandlers,
    selectedDates,
    onImportSuccess: () => {
      actionRef.current?.reload();
    },
  });

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
        title: `${day} GMV`,
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
        title: `${day} ADS`,
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
          {record.liveDays}
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
    {
      title: intl.formatMessage({ id: 'table.column.action' }),
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        // 只有有 ADS 记录的才能编辑和删除（临时ID的不能操作）
        if (record.id.startsWith('temp-')) {
          return null;
        }
        
        return (
          <Space size="small">
            <Tooltip title={intl.formatMessage({ id: 'button.edit' })}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title={intl.formatMessage({ id: 'message.confirmDelete' })}
              onConfirm={() => handleDelete(record.id)}
              okText={intl.formatMessage({ id: 'button.confirm' })}
              cancelText={intl.formatMessage({ id: 'button.cancel' })}
            >
              <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 查询数据
  const fetchData = async (params: any) => {
    if (!baseId) {
      message.error('未找到基地信息');
      return { data: [], success: false, total: 0 };
    }

    // 如果没有选中任何主播，直接返回空数据
    if (!selectedHandlers || selectedHandlers.length === 0) {
      return { data: [], success: true, total: 0 };
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
        const handlers = response.data || [];
        setHandlerOptions(handlers);
        
        // 默认选中所有主播
        const allHandlerIds = handlers.map(h => h.id);
        setSelectedHandlers(allHandlerIds);
        
        // 延迟刷新表格，确保状态已更新
        setTimeout(() => {
          actionRef.current?.reload();
        }, 100);
      }
    } catch (error) {
      message.error('加载主播列表失败');
    }
  };

  useEffect(() => {
    loadHandlerOptions();
  }, [baseId]);

  const handleAdd = () => {
    setEditingRecord(null);
    setFormVisible(true);
  };

  const handleEdit = (record: MonthlyGmvAdsStats) => {
    setEditingRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!baseId) return;
    
    try {
      await deleteAdsRecord(baseId, id);
      message.success(intl.formatMessage({ id: 'message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'message.deleteFailed' }));
    }
  };

  const handleFormSubmit = async (values: any) => {
    if (!baseId) return;

    try {
      const data = {
        month: selectedMonth,
        handlerId: values.handlerId,
        ...values,
      };

      await upsertAdsRecord(baseId, data);
      message.success(
        editingRecord
          ? intl.formatMessage({ id: 'message.updateSuccess' })
          : intl.formatMessage({ id: 'message.createSuccess' })
      );

      setFormVisible(false);
      setEditingRecord(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(
        editingRecord
          ? intl.formatMessage({ id: 'message.updateFailed' })
          : intl.formatMessage({ id: 'message.createFailed' })
      );
    }
  };

  return (
    <PageContainer header={{ title: false }}>
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
        toolbar={{
          search: (
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
                style={{ minWidth: 400 }}
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
                dropdownRender={(menu) => (
                  <>
                    <div style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            const allIds = handlerOptions.map(h => h.id);
                            setSelectedHandlers(allIds);
                            actionRef.current?.reload();
                          }}
                        >
                          全选
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            const allIds = handlerOptions.map(h => h.id);
                            const unselectedIds = allIds.filter(id => !selectedHandlers.includes(id));
                            setSelectedHandlers(unselectedIds);
                            actionRef.current?.reload();
                          }}
                        >
                          反选
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            setSelectedHandlers([]);
                            actionRef.current?.reload();
                          }}
                        >
                          清空
                        </Button>
                      </Space>
                    </div>
                    {menu}
                  </>
                )}
              />

              <Button
                icon={<CalendarOutlined />}
                onClick={() => setCalendarVisible(true)}
              >
                {intl.formatMessage({ id: 'adsRecord.selectDates' })}
                {selectedDates.length > 0 && ` (${selectedDates.length})`}
              </Button>
            </Space>
          ),
        }}
        toolBarRender={() => [
          currencyRate && currencyRate.fixedRate !== 1 && (
            <Checkbox
              key="showInCNY"
              checked={showInCNY}
              onChange={(e) => setShowInCNY(e.target.checked)}
            >
              {intl.formatMessage({ id: 'products.showInCNY' })}
            </Checkbox>
          ),
          <Button
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            {intl.formatMessage({ id: 'button.downloadTemplate' })}
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            {intl.formatMessage({ id: 'button.import' })}
          </Button>,
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {intl.formatMessage({ id: 'button.export' })}
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            {intl.formatMessage({ id: 'adsRecord.add' })}
          </Button>,
        ]}
      />

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

      {/* 新增/编辑表单 */}
      <AdsRecordForm
        visible={formVisible}
        record={editingRecord}
        month={selectedMonth}
        handlerOptions={handlerOptions}
        onCancel={() => {
          setFormVisible(false);
          setEditingRecord(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* 导入模态框 */}
      <ImportModal
        title={intl.formatMessage({ id: 'adsRecord.title' })}
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        width={700}
        fields={[
          { field: '月份', required: true, description: '格式为YYYY-MM', example: '2025-01' },
          { field: '主播', required: true, description: '需与系统中主播姓名一致', example: '主播姓名' },
          { field: '1号', required: false, description: '1号投流金额', example: '1000' },
          { field: '2号', required: false, description: '2号投流金额', example: '1000' },
          { field: '3号', required: false, description: '3号投流金额', example: '1000' },
          { field: '...', required: false, description: '其他日期投流金额', example: '' },
          { field: '31号', required: false, description: '31号投流金额', example: '1000' },
        ]}
      />
    </PageContainer>
  );
};

export default AdsRecordPage;
