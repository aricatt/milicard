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
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

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
      title: '采购',
      dataIndex: 'purchaseName',
      key: 'purchaseName',
      width: 300,
      ellipsis: true,
      copyable: true,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '商品',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '应付总金额',
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
      title: '实付',
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
      title: '未支付金额',
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
      title: '付款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 110,
      valueType: 'date',
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        if (record.unpaidAmount <= 0) {
          return <Tag color="success">已付清</Tag>;
        }
        if (record.paidAmount > 0) {
          return <Tag color="warning">部分付款</Tag>;
        }
        return <Tag color="error">未付款</Tag>;
      },
    },
    {
      title: '只看未付清',
      dataIndex: 'unpaidOnly',
      key: 'unpaidOnly',
      hideInTable: true,
      valueType: 'switch',
    },
    {
      title: '操作',
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
            付款
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
              title="应付总金额"
              value={stats.totalPayable}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已付金额"
              value={stats.totalPaid}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="未付金额"
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
        title="添加付款"
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
              <Descriptions.Item label="采购名称">
                {currentPayable.purchaseName}
              </Descriptions.Item>
              <Descriptions.Item label="供应商">
                {currentPayable.supplierName}
              </Descriptions.Item>
              <Descriptions.Item label="应付总金额">
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  ¥ {currentPayable.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                <span style={{ color: '#52c41a' }}>
                  ¥ {currentPayable.paidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="未付金额">
                <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                  ¥ {currentPayable.unpaidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item
                name="paymentAmount"
                label="本次付款金额"
                rules={[
                  { required: true, message: '请输入付款金额' },
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
                  全额付款
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
