import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { 
  Button, 
  Modal, 
  Form, 
  InputNumber, 
  message, 
  Tag, 
  Space, 
  Card, 
  Statistic, 
  Row, 
  Col,
  Descriptions,
} from 'antd';
import { DollarOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import GoodsNameText from '@/components/GoodsNameText';

/**
 * 应付信息接口
 */
interface PayableInfo {
  id: string;
  purchaseName: string;
  supplierName: string;
  goodsName: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paymentDate: string;
  purchaseOrderCode: string;
}

/**
 * 统计信息接口
 */
interface PayableStats {
  totalPayable: number;
  totalPaid: number;
  totalUnpaid: number;
}

/**
 * 应付管理页面
 * 基于采购单数据，管理应付款项
 */
const PayablesPage: React.FC = () => {
  const { currentBase } = useBase();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  
  // 付款弹窗状态
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentPayable, setCurrentPayable] = useState<PayableInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [form] = Form.useForm();
  
  // 统计数据
  const [stats, setStats] = useState<PayableStats>({
    totalPayable: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  /**
   * 获取应付列表
   */
  const fetchPayables = async (params: any) => {
    if (!currentBase) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/payables`, {
        method: 'GET',
        params: {
          current: params.current,
          pageSize: params.pageSize,
          purchaseName: params.purchaseName,
          supplierName: params.supplierName,
          unpaidOnly: params.unpaidOnly,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      });

      if (response.success) {
        // 更新统计数据
        if (response.stats) {
          setStats(response.stats);
        }
        return {
          data: response.data || [],
          success: true,
          total: response.total || 0,
        };
      }
      return { data: [], success: false, total: 0 };
    } catch (error) {
      console.error('获取应付列表失败:', error);
      return { data: [], success: false, total: 0 };
    }
  };

  /**
   * 打开付款弹窗
   */
  const handleOpenPaymentModal = (record: PayableInfo) => {
    setCurrentPayable(record);
    form.resetFields();
    setPaymentModalVisible(true);
  };

  /**
   * 提交付款
   */
  const handlePayment = async () => {
    if (!currentBase || !currentPayable) return;

    try {
      const values = await form.validateFields();
      setPaymentLoading(true);

      const response = await request(
        `/api/v1/bases/${currentBase.id}/payables/${currentPayable.id}/payment`,
        {
          method: 'POST',
          data: {
            paymentAmount: values.paymentAmount,
          },
        }
      );

      if (response.success) {
        message.success('付款成功');
        setPaymentModalVisible(false);
        actionRef.current?.reload();
      } else {
        message.error(response.message || '付款失败');
      }
    } catch (error: any) {
      message.error(error.message || '付款失败');
    } finally {
      setPaymentLoading(false);
    }
  };

  /**
   * 表格列定义
   */
  const columns: ProColumns<PayableInfo>[] = [
    {
      title: intl.formatMessage({ id: 'payables.column.purchaseName' }),
      dataIndex: 'purchaseName',
      key: 'purchaseName',
      width: 300,
      ellipsis: true,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'payables.column.supplier' }),
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 120,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'payables.column.goods' }),
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 200,
      hideInSearch: true,
      render: (_, record) => <GoodsNameText text={record.goodsName} />,
    },
    {
      title: intl.formatMessage({ id: 'payables.column.totalAmount' }),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      hideInSearch: true,
      align: 'right',
      render: (_, record) => (
        <span style={{ fontWeight: 'bold' }}>
          {record.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'payables.column.paidAmount' }),
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 130,
      hideInSearch: true,
      align: 'right',
      render: (_, record) => (
        <span style={{ color: '#52c41a' }}>
          {record.paidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'payables.column.unpaidAmount' }),
      dataIndex: 'unpaidAmount',
      key: 'unpaidAmount',
      width: 130,
      hideInSearch: true,
      align: 'right',
      render: (_, record) => {
        if (record.unpaidAmount <= 0) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>已付清</Tag>;
        }
        return (
          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {record.unpaidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'payables.column.paymentDate' }),
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 110,
      valueType: 'date',
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      key: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        if (record.unpaidAmount <= 0) {
          return <Tag color="success">{intl.formatMessage({ id: 'payables.status.paid' })}</Tag>;
        }
        if (record.paidAmount > 0) {
          return <Tag color="warning">{intl.formatMessage({ id: 'payables.status.partial' })}</Tag>;
        }
        return <Tag color="error">{intl.formatMessage({ id: 'payables.status.unpaid' })}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'payables.filter.unpaidOnly' }),
      dataIndex: 'unpaidOnly',
      key: 'unpaidOnly',
      hideInTable: true,
      valueType: 'switch',
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        if (record.unpaidAmount <= 0) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <Button
            type="link"
            icon={<DollarOutlined />}
            onClick={() => handleOpenPaymentModal(record)}
          >
            {intl.formatMessage({ id: 'payables.action.pay' })}
          </Button>
        );
      },
    },
  ];

  return (
    <PageContainer header={{ title: false }}>
      {/* 统计卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title={intl.formatMessage({ id: 'payables.stats.totalPayable' })}
              value={stats.totalPayable}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={intl.formatMessage({ id: 'payables.stats.totalPaid' })}
              value={stats.totalPaid}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={intl.formatMessage({ id: 'payables.stats.totalUnpaid' })}
              value={stats.totalUnpaid}
              precision={2}
              valueStyle={{ color: stats.totalUnpaid > 0 ? '#ff4d4f' : '#52c41a' }}
              suffix={
                stats.totalUnpaid > 0 ? (
                  <ExclamationCircleOutlined style={{ fontSize: 16, marginLeft: 4 }} />
                ) : (
                  <CheckCircleOutlined style={{ fontSize: 16, marginLeft: 4 }} />
                )
              }
            />
          </Col>
        </Row>
      </Card>

      {/* 应付列表 */}
      <ProTable<PayableInfo>
        actionRef={actionRef}
        columns={columns}
        request={fetchPayables}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        dateFormatter="string"
        toolBarRender={() => []}
      />

      {/* 付款弹窗 */}
      <Modal
        title={intl.formatMessage({ id: 'payables.modal.addPayment' })}
        open={paymentModalVisible}
        onOk={handlePayment}
        onCancel={() => setPaymentModalVisible(false)}
        confirmLoading={paymentLoading}
        width={500}
        destroyOnHidden
      >
        {currentPayable && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.purchaseName' })}>
                {currentPayable.purchaseName}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.supplier' })}>
                {currentPayable.supplierName}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.totalAmount' })}>
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  ¥ {currentPayable.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.paidAmount' })}>
                <span style={{ color: '#52c41a' }}>
                  ¥ {currentPayable.paidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.unpaidAmount' })}>
                <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                  ¥ {currentPayable.unpaidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item
                name="paymentAmount"
                label={intl.formatMessage({ id: 'payables.form.paymentAmount' })}
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'payables.form.amountRequired' }) },
                  { type: 'number', min: 0.01, message: '付款金额必须大于0' },
                  {
                    type: 'number',
                    max: currentPayable.unpaidAmount,
                    message: `付款金额不能超过未付金额 ${currentPayable.unpaidAmount.toFixed(2)}`,
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={`最多可付 ${currentPayable.unpaidAmount.toFixed(2)}`}
                  precision={2}
                  min={0.01}
                  max={currentPayable.unpaidAmount}
                  addonBefore="¥"
                />
              </Form.Item>
              
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="link"
                  onClick={() => form.setFieldsValue({ paymentAmount: currentPayable.unpaidAmount })}
                >
                  {intl.formatMessage({ id: 'payables.action.payFull' })}
                </Button>
              </div>
            </Form>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default PayablesPage;
