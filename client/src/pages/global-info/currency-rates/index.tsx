import React, { useRef, useState, useEffect } from 'react';
import { 
  Space, 
  Modal,
  Form,
  Input,
  App,
  Button,
  Popconfirm,
  InputNumber,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

interface CurrencyRate {
  id: number;
  currencyCode: string;
  currencyName: string | null;
  fixedRate: number;
  liveRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CurrencyRatesPage: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const { refreshCurrencyRate } = useBase();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});

  // 获取当日实时汇率
  const fetchLiveRates = async () => {
    try {
      const response = await request('/api/v1/currency-rates/live-rates', {
        method: 'GET',
      });
      if (response.success && response.data) {
        setLiveRates(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch live rates:', error);
    }
  };

  useEffect(() => {
    fetchLiveRates();
  }, []);

  const fetchCurrencyRates = async (params: any) => {
    try {
      // 使用管理接口（支持字段权限过滤），而不是全局组件接口
      const response = await request('/api/v1/currency-rates/', {
        method: 'GET',
        params: {
          page: params.current || 1,
          pageSize: params.pageSize || 20,
          search: params.currencyCode || params.currencyName,
          isActive: params.isActive,
        },
      });
      
      return {
        data: response.data || [],
        success: response.success,
        total: response.pagination?.total || 0,
      };
    } catch (error) {
      message.error(intl.formatMessage({ id: 'currencyRates.message.fetchFailed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingRate) {
        await request(`/api/v1/currency-rates/${editingRate.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'currencyRates.message.updateSuccess' }));
      } else {
        await request('/api/v1/currency-rates', {
          method: 'POST',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'currencyRates.message.createSuccess' }));
      }

      setModalVisible(false);
      form.resetFields();
      setEditingRate(null);
      actionRef.current?.reload();
      // 刷新顶部栏的汇率显示
      refreshCurrencyRate();
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'currencyRates.message.operationFailed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/v1/currency-rates/${id}`, {
        method: 'DELETE',
      });
      message.success(intl.formatMessage({ id: 'currencyRates.message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.message || intl.formatMessage({ id: 'currencyRates.message.deleteFailed' }));
    }
  };

  const openEditModal = (record: CurrencyRate) => {
    setEditingRate(record);
    setModalVisible(true);
    // 延迟设置表单值，等待 Modal 渲染完成
    setTimeout(() => {
      form.setFieldsValue({
        currencyCode: record.currencyCode,
        currencyName: record.currencyName,
        fixedRate: record.fixedRate,
        isActive: record.isActive,
      });
    }, 0);
  };

  const openAddModal = () => {
    setEditingRate(null);
    setModalVisible(true);
    // 延迟重置表单，等待 Modal 渲染完成
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }, 0);
  };

  // 使用当前汇率
  const handleUseLiveRate = () => {
    const currencyCode = form.getFieldValue('currencyCode');
    if (currencyCode && liveRates[currencyCode.toUpperCase()]) {
      form.setFieldsValue({ fixedRate: liveRates[currencyCode.toUpperCase()] });
    } else if (editingRate?.liveRate) {
      form.setFieldsValue({ fixedRate: editingRate.liveRate });
    }
  };

  // 获取当前编辑货币的实时汇率
  const getCurrentLiveRate = () => {
    if (editingRate?.liveRate) {
      return editingRate.liveRate;
    }
    const currencyCode = form.getFieldValue('currencyCode');
    if (currencyCode && liveRates[currencyCode.toUpperCase()]) {
      return liveRates[currencyCode.toUpperCase()];
    }
    return null;
  };

  const columns: ProColumns<CurrencyRate>[] = [
    {
      title: intl.formatMessage({ id: 'currencyRates.column.currencyCode' }),
      dataIndex: 'currencyCode',
      width: 120,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'currencyRates.column.currencyName' }),
      dataIndex: 'currencyName',
      width: 150,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'currencyRates.column.fixedRate' }),
      dataIndex: 'fixedRate',
      width: 150,
      search: false,
      render: (_, record) => (
        <span style={{ fontWeight: 500 }}>
          {Number(record.fixedRate).toFixed(6)}
        </span>
      ),
    },
    {
      title: (
        <span>
          {intl.formatMessage({ id: 'currencyRates.column.liveRate' })}
          <Tooltip title={intl.formatMessage({ id: 'currencyRates.liveRateTooltip' })}>
            <InfoCircleOutlined style={{ marginLeft: 4, color: '#999' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'liveRate',
      width: 150,
      search: false,
      render: (_, record) => (
        record.liveRate !== null ? (
          <span style={{ color: '#666' }}>
            {Number(record.liveRate).toFixed(6)}
          </span>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
    },
    {
      title: intl.formatMessage({ id: 'currencyRates.column.status' }),
      dataIndex: 'isActive',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: intl.formatMessage({ id: 'status.enabled' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'status.disabled' }), status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'currencyRates.column.updatedAt' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      width: 160,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {intl.formatMessage({ id: 'button.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'currencyRates.deleteConfirm' })}
            description={intl.formatMessage({ id: 'currencyRates.deleteDescription' })}
            onConfirm={() => handleDelete(record.id)}
            okText={intl.formatMessage({ id: 'button.confirm' })}
            cancelText={intl.formatMessage({ id: 'button.cancel' })}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              {intl.formatMessage({ id: 'button.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: false,
      }}
    >
      <ProTable<CurrencyRate>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchCurrencyRates}
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
          >
            {intl.formatMessage({ id: 'currencyRates.add' })}
          </Button>,
        ]}
      />

      <Modal
        title={editingRate ? intl.formatMessage({ id: 'currencyRates.edit' }) : intl.formatMessage({ id: 'currencyRates.add' })}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingRate(null);
        }}
        confirmLoading={loading}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="currencyCode"
            label={intl.formatMessage({ id: 'currencyRates.form.currencyCode' })}
            rules={[
              { required: true, message: intl.formatMessage({ id: 'currencyRates.form.currencyCodeRequired' }) },
              { pattern: /^[A-Z]{3}$/, message: intl.formatMessage({ id: 'currencyRates.form.currencyCodePattern' }) },
            ]}
            tooltip={intl.formatMessage({ id: 'currencyRates.form.currencyCodeTooltip' })}
          >
            <Input 
              placeholder={intl.formatMessage({ id: 'currencyRates.form.currencyCodePlaceholder' })} 
              disabled={!!editingRate}
              style={{ textTransform: 'uppercase' }}
              maxLength={3}
            />
          </Form.Item>
          <Form.Item
            name="currencyName"
            label={intl.formatMessage({ id: 'currencyRates.form.currencyName' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'currencyRates.form.currencyNamePlaceholder' })} />
          </Form.Item>
          <Form.Item
            label={
              <Space>
                {intl.formatMessage({ id: 'currencyRates.form.fixedRate' })}
                {(editingRate?.liveRate || getCurrentLiveRate()) && (
                  <span style={{ color: '#666', fontWeight: 'normal', fontSize: 12 }}>
                    ({intl.formatMessage({ id: 'currencyRates.column.liveRate' })}: {Number(editingRate?.liveRate || getCurrentLiveRate()).toFixed(6)})
                  </span>
                )}
              </Space>
            }
            required
            tooltip={intl.formatMessage({ id: 'currencyRates.form.fixedRateTooltip' })}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="fixedRate"
                noStyle
                rules={[{ required: true, message: intl.formatMessage({ id: 'currencyRates.form.fixedRateRequired' }) }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.000001}
                  precision={6}
                  style={{ width: 'calc(100% - 120px)' }} 
                  placeholder={intl.formatMessage({ id: 'currencyRates.form.fixedRatePlaceholder' })}
                />
              </Form.Item>
              <Button 
                icon={<SyncOutlined />}
                onClick={handleUseLiveRate}
                disabled={!editingRate?.liveRate && !getCurrentLiveRate()}
              >
                {intl.formatMessage({ id: 'currencyRates.form.useLiveRate' })}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'currencyRates.form.status' })}
            valuePropName="checked"
          >
            <Switch 
              checkedChildren={intl.formatMessage({ id: 'status.enabled' })} 
              unCheckedChildren={intl.formatMessage({ id: 'status.disabled' })} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CurrencyRatesPage;
