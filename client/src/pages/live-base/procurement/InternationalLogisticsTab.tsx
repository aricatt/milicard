import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Button,
  Table,
  Space,
  Popconfirm,
  App,
  Spin,
  Empty,
  Typography,
  Divider,
  Row,
  Col,
  Statistic,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';

const { Text } = Typography;

interface InternationalLogisticsRecord {
  id: string;
  purchaseOrderId: string;
  batchNo: string;
  boxNo: string;
  length: number;
  width: number;
  height: number;
  freightRate: number;
  volume: number;       // 体积(方) - 计算值
  freight: number;      // 运费 - 计算值
  createdAt: string;
  updatedAt: string;
}

interface InternationalLogisticsTabProps {
  purchaseOrderId: string;
  baseId: number;
  onDataChange?: () => void;  // 数据变化时的回调（用于刷新列表）
}

const InternationalLogisticsTab: React.FC<InternationalLogisticsTabProps> = ({
  purchaseOrderId,
  baseId,
  onDataChange,
}) => {
  const { message } = App.useApp();
  const intl = useIntl();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<InternationalLogisticsRecord[]>([]);
  
  // 计算值状态
  const [calculatedVolume, setCalculatedVolume] = useState<number>(0);
  const [calculatedFreight, setCalculatedFreight] = useState<number>(0);

  // 获取国际货运记录列表
  const fetchRecords = async () => {
    if (!purchaseOrderId || !baseId) return;
    
    setLoading(true);
    try {
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${purchaseOrderId}/international-logistics`);
      if (res.success) {
        setRecords(res.data || []);
      }
    } catch (error) {
      console.error('获取国际货运记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [purchaseOrderId]);

  // 计算体积（立方米/方）
  const calculateVolume = (length: number, width: number, height: number): number => {
    if (!length || !width || !height) return 0;
    // cm转m: 除以100
    const volumeM3 = (length / 100) * (width / 100) * (height / 100);
    return Math.round(volumeM3 * 10000) / 10000; // 保留4位小数
  };

  // 计算运费
  const calculateFreight = (volume: number, freightRate: number): number => {
    if (!volume || !freightRate) return 0;
    return Math.round(volume * freightRate * 100) / 100; // 保留2位小数
  };

  // 表单值变化时自动计算
  const handleValuesChange = (changedValues: any, allValues: any) => {
    const { length, width, height, freightRate } = allValues;
    const volume = calculateVolume(length || 0, width || 0, height || 0);
    setCalculatedVolume(volume);
    setCalculatedFreight(calculateFreight(volume, freightRate || 0));
  };

  // 录入
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      const res = await request(`/api/v1/bases/${baseId}/purchase-orders/${purchaseOrderId}/international-logistics`, {
        method: 'POST',
        data: values,
      });
      
      if (res.success) {
        message.success(intl.formatMessage({ id: 'internationalLogistics.message.createSuccess' }));
        form.resetFields();
        setCalculatedVolume(0);
        setCalculatedFreight(0);
        fetchRecords();
        onDataChange?.();  // 通知父组件刷新列表
      } else {
        message.error(res.message || intl.formatMessage({ id: 'internationalLogistics.message.createFailed' }));
      }
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error?.message || intl.formatMessage({ id: 'internationalLogistics.message.createFailed' }));
    } finally {
      setSubmitting(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    try {
      const res = await request(`/api/v1/bases/${baseId}/international-logistics/${id}`, {
        method: 'DELETE',
      });
      
      if (res.success) {
        message.success(intl.formatMessage({ id: 'internationalLogistics.message.deleteSuccess' }));
        fetchRecords();
        onDataChange?.();  // 通知父组件刷新列表
      } else {
        message.error(res.message || intl.formatMessage({ id: 'internationalLogistics.message.deleteFailed' }));
      }
    } catch (error: any) {
      message.error(error?.message || intl.formatMessage({ id: 'internationalLogistics.message.deleteFailed' }));
    }
  };

  // 清空表单
  const handleClear = () => {
    form.resetFields();
    setCalculatedVolume(0);
    setCalculatedFreight(0);
  };

  // 表格列定义
  const columns = [
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.batchNo' }),
      dataIndex: 'batchNo',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.boxNo' }),
      dataIndex: 'boxNo',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.dimensions' }),
      key: 'dimensions',
      width: 150,
      render: (_: any, record: InternationalLogisticsRecord) => (
        <span>{record.length} × {record.width} × {record.height} cm</span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.volume' }),
      dataIndex: 'volume',
      width: 100,
      render: (value: number) => `${value} 方`,
    },
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.freightRate' }),
      dataIndex: 'freightRate',
      width: 120,
      render: (value: number) => `${value} 元/方`,
    },
    {
      title: intl.formatMessage({ id: 'internationalLogistics.column.freight' }),
      dataIndex: 'freight',
      width: 100,
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: intl.formatMessage({ id: 'table.column.action' }),
      key: 'action',
      width: 80,
      render: (_: any, record: InternationalLogisticsRecord) => (
        <Popconfirm
          title={intl.formatMessage({ id: 'internationalLogistics.confirm.delete' })}
          onConfirm={() => handleDelete(record.id)}
          okText={intl.formatMessage({ id: 'button.confirm' })}
          cancelText={intl.formatMessage({ id: 'button.cancel' })}
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // 计算汇总
  const totalVolume = records.reduce((sum, r) => sum + r.volume, 0);
  const totalFreight = records.reduce((sum, r) => sum + r.freight, 0);

  return (
    <div>
      {/* 录入表单 */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="batchNo"
              label={intl.formatMessage({ id: 'internationalLogistics.form.batchNo' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.batchNoRequired' }) }]}
            >
              <Input placeholder={intl.formatMessage({ id: 'internationalLogistics.form.batchNoPlaceholder' })} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="boxNo"
              label={intl.formatMessage({ id: 'internationalLogistics.form.boxNo' })}
              rules={[{ required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.boxNoRequired' }) }]}
            >
              <Input placeholder={intl.formatMessage({ id: 'internationalLogistics.form.boxNoPlaceholder' })} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name="length"
              label={intl.formatMessage({ id: 'internationalLogistics.form.length' })}
              rules={[
                { required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.lengthRequired' }) },
                { type: 'number', min: 0.01, message: intl.formatMessage({ id: 'internationalLogistics.form.mustBePositive' }) }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="cm"
                min={0.01}
                precision={2}
                addonAfter="cm"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="width"
              label={intl.formatMessage({ id: 'internationalLogistics.form.width' })}
              rules={[
                { required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.widthRequired' }) },
                { type: 'number', min: 0.01, message: intl.formatMessage({ id: 'internationalLogistics.form.mustBePositive' }) }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="cm"
                min={0.01}
                precision={2}
                addonAfter="cm"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="height"
              label={intl.formatMessage({ id: 'internationalLogistics.form.height' })}
              rules={[
                { required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.heightRequired' }) },
                { type: 'number', min: 0.01, message: intl.formatMessage({ id: 'internationalLogistics.form.mustBePositive' }) }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="cm"
                min={0.01}
                precision={2}
                addonAfter="cm"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="freightRate"
              label={intl.formatMessage({ id: 'internationalLogistics.form.freightRate' })}
              rules={[
                { required: true, message: intl.formatMessage({ id: 'internationalLogistics.form.freightRateRequired' }) },
                { type: 'number', min: 0.01, message: intl.formatMessage({ id: 'internationalLogistics.form.mustBePositive' }) }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={intl.formatMessage({ id: 'internationalLogistics.form.freightRatePlaceholder' })}
                min={0.01}
                precision={2}
                addonAfter="元/方"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 计算结果显示 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 8 }}>
              <Text type="secondary">{intl.formatMessage({ id: 'internationalLogistics.calculated.volume' })}：</Text>
              <Text strong style={{ fontSize: 18, marginLeft: 8 }}>{calculatedVolume.toFixed(4)} 方</Text>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 8 }}>
              <Text type="secondary">{intl.formatMessage({ id: 'internationalLogistics.calculated.freight' })}：</Text>
              <Text strong style={{ fontSize: 18, marginLeft: 8, color: '#1890ff' }}>¥{calculatedFreight.toFixed(2)}</Text>
            </div>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleSubmit}
              loading={submitting}
            >
              {intl.formatMessage({ id: 'internationalLogistics.button.submit' })}
            </Button>
            <Button onClick={handleClear}>
              {intl.formatMessage({ id: 'internationalLogistics.button.clear' })}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Divider />

      {/* 已录入记录列表 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>{intl.formatMessage({ id: 'internationalLogistics.list.title' })}</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : records.length > 0 ? (
        <>
          <Table
            dataSource={records}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 800 }}
          />
          
          {/* 汇总统计 */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Statistic
                title={intl.formatMessage({ id: 'internationalLogistics.summary.totalRecords' })}
                value={records.length}
                suffix={intl.formatMessage({ id: 'internationalLogistics.summary.recordsUnit' })}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={intl.formatMessage({ id: 'internationalLogistics.summary.totalVolume' })}
                value={totalVolume.toFixed(4)}
                suffix="方"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={intl.formatMessage({ id: 'internationalLogistics.summary.totalFreight' })}
                value={totalFreight.toFixed(2)}
                prefix="¥"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </>
      ) : (
        <Empty description={intl.formatMessage({ id: 'internationalLogistics.list.empty' })} />
      )}
    </div>
  );
};

export default InternationalLogisticsTab;
