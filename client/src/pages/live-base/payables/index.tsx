import React, { useState, useRef, useEffect } from 'react';
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
  Checkbox,
  Alert,
  Tooltip,
} from 'antd';
import { DollarOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import GoodsNameText, { getLocalizedGoodsName } from '@/components/GoodsNameText';
import DualCurrencyInput from '@/components/DualCurrencyInput';
import { getCurrencySymbol } from '@/utils/currency';

/**
 * 应付信息接口
 */
interface PayableInfo {
  id: string;
  purchaseName: string;
  supplierName: string;
  goodsName: string;
  goodsNameI18n?: { en?: string; th?: string; vi?: string; [key: string]: string | undefined } | null;
  categoryCode?: string;
  categoryName?: string;
  categoryNameI18n?: { en?: string; th?: string; vi?: string; [key: string]: string | undefined } | null;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  cnyPaymentAmount?: number;  // 人民币支付金额
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
  const { currentBase, currencyRate } = useBase();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  
  // 付款弹窗状态
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentPayable, setCurrentPayable] = useState<PayableInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [form] = Form.useForm();
  
  // 人民币支付模式
  const [cnyPaymentMode, setCnyPaymentMode] = useState(false);
  // 人民币实际金额（用于人民币支付模式）
  const [cnyActualAmount, setCnyActualAmount] = useState<number | null>(null);
  // 表单使用的汇率（可编辑）
  const [formExchangeRate, setFormExchangeRate] = useState<number>(1);
  
  // 统计数据
  const [stats, setStats] = useState<PayableStats>({
    totalPayable: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  // 以人民币显示金额
  const [showInCNY, setShowInCNY] = useState(false);
  
  // 获取当前汇率和货币代码
  const currentExchangeRate = currencyRate?.fixedRate || 1;
  const currentCurrencyCode = currentBase?.currency || 'CNY';
  const isCNY = currentCurrencyCode === 'CNY';
  
  // 当基地汇率变化时，更新表单汇率
  useEffect(() => {
    if (currencyRate?.fixedRate) {
      setFormExchangeRate(currencyRate.fixedRate);
    }
  }, [currencyRate?.fixedRate]);

  // 金额格式化函数，支持以人民币显示
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    if (showInCNY && currentExchangeRate > 0) {
      const cnyAmount = amount / currentExchangeRate;
      return `¥${cnyAmount.toFixed(2)}`;
    }
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  };

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
    // 如果采购单之前使用过人民币支付，默认勾选人民币支付
    const hasCnyPayment = (record.cnyPaymentAmount || 0) > 0;
    setCnyPaymentMode(hasCnyPayment);
    setCnyActualAmount(null);
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

      // 构建请求数据
      const requestData: any = {
        paymentAmount: values.paymentAmount,
      };

      // 如果是人民币支付模式，添加人民币金额
      if (cnyPaymentMode && cnyActualAmount && cnyActualAmount > 0) {
        requestData.cnyPaymentAmount = cnyActualAmount;
      }

      const response = await request(
        `/api/v1/bases/${currentBase.id}/payables/${currentPayable.id}/payment`,
        {
          method: 'POST',
          data: requestData,
        }
      );

      if (response.success) {
        message.success('付款成功');
        setPaymentModalVisible(false);
        setCnyPaymentMode(false);
        setCnyActualAmount(null);
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
      width: 320,
      hideInSearch: true,
      render: (_, record) => {
        // 与采购页面保持一致：采购日期 + [品类] + 商品名称（换行显示）
        const date = record.paymentDate || '';
        if (!date) return '-';
        return (
          <div style={{ lineHeight: 1.4 }}>
            <div style={{ color: '#666', fontSize: '12px' }}>{date}</div>
            <GoodsNameText 
              text={record.goodsName} 
              nameI18n={record.goodsNameI18n}
              categoryCode={record.categoryCode}
              categoryName={record.categoryName}
              categoryNameI18n={record.categoryNameI18n}
              showCategory={true}
            />
          </div>
        );
      },
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
      render: (_, record) => (
        <GoodsNameText 
          text={record.goodsName} 
          nameI18n={record.goodsNameI18n}
          categoryCode={record.categoryCode}
          categoryName={record.categoryName}
          categoryNameI18n={record.categoryNameI18n}
          showCategory={true}
        />
      ),
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
          {formatAmount(record.totalAmount)}
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
          {formatAmount(record.paidAmount)}
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
            {formatAmount(record.unpaidAmount)}
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
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        dateFormatter="string"
        toolBarRender={() => [
          currentCurrencyCode !== 'CNY' && (
            <Checkbox
              key="showInCNY"
              checked={showInCNY}
              onChange={(e) => setShowInCNY(e.target.checked)}
            >
              {intl.formatMessage({ id: 'products.showInCNY' })}
            </Checkbox>
          ),
        ]}
      />

      {/* 付款弹窗 */}
      <Modal
        title={intl.formatMessage({ id: 'payables.modal.addPayment' })}
        open={paymentModalVisible}
        onOk={handlePayment}
        onCancel={() => {
          setPaymentModalVisible(false);
          setCnyPaymentMode(false);
          setCnyActualAmount(null);
        }}
        confirmLoading={paymentLoading}
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {currentPayable && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 汇率设置和人民币支付选项（非人民币基地显示） */}
              {!isCNY && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 8 }}
                  message={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <span>{intl.formatMessage({ id: 'dualCurrency.exchangeRateLabel' })}</span>
                        <InputNumber
                          value={formExchangeRate}
                          onChange={(val) => setFormExchangeRate(val || 1)}
                          min={0.000001}
                          precision={6}
                          style={{ width: 150 }}
                        />
                        <span>{getCurrencySymbol(currentCurrencyCode)}</span>
                        <Tooltip title={intl.formatMessage({ id: 'dualCurrency.exchangeRateTip' })}>
                          <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        </Tooltip>
                      </Space>
                      <Checkbox
                        checked={cnyPaymentMode}
                        onChange={(e) => {
                          setCnyPaymentMode(e.target.checked);
                          if (!e.target.checked) {
                            setCnyActualAmount(null);
                          }
                        }}
                      >
                        {intl.formatMessage({ id: 'procurement.form.cnyPaymentMode' })}
                      </Checkbox>
                      {/* 如果采购单之前使用过人民币支付，显示提醒 */}
                      {(currentPayable.cnyPaymentAmount || 0) > 0 && (
                        <div style={{ color: '#faad14', fontSize: 12 }}>
                          {intl.formatMessage({ id: 'payables.form.cnyPaymentHistory' }, { amount: (currentPayable.cnyPaymentAmount || 0).toFixed(2) })}
                        </div>
                      )}
                    </Space>
                  }
                />
              )}

              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.purchaseName' })}>
                  <div style={{ lineHeight: 1.4 }}>
                    <div style={{ color: '#666', fontSize: '12px' }}>{currentPayable.paymentDate}</div>
                    <GoodsNameText 
                      text={currentPayable.goodsName} 
                      nameI18n={currentPayable.goodsNameI18n}
                      categoryCode={currentPayable.categoryCode}
                      categoryName={currentPayable.categoryName}
                      categoryNameI18n={currentPayable.categoryNameI18n}
                      showCategory={true}
                    />
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.supplier' })}>
                  {currentPayable.supplierName}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.totalAmount' })}>
                  <Space split={<span style={{ color: '#999' }}>|</span>}>
                    <span style={{ color: '#eb2f96' }}>
                      ¥ {(currentExchangeRate > 0 ? currentPayable.totalAmount / currentExchangeRate : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                    {!isCNY && (
                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        {getCurrencySymbol(currentCurrencyCode)} {currentPayable.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.paidAmount' })}>
                  <Space split={<span style={{ color: '#999' }}>|</span>}>
                    <span style={{ color: '#52c41a' }}>
                      ¥ {(currentExchangeRate > 0 ? currentPayable.paidAmount / currentExchangeRate : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                    {!isCNY && (
                      <span style={{ color: '#52c41a' }}>
                        {getCurrencySymbol(currentCurrencyCode)} {currentPayable.paidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.unpaidAmount' })}>
                  <Space split={<span style={{ color: '#999' }}>|</span>}>
                    <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                      ¥ {(currentExchangeRate > 0 ? currentPayable.unpaidAmount / currentExchangeRate : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                    {!isCNY && (
                      <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                        {getCurrencySymbol(currentCurrencyCode)} {currentPayable.unpaidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </Space>
                </Descriptions.Item>
                {(currentPayable.cnyPaymentAmount || 0) > 0 && (
                  <Descriptions.Item label={intl.formatMessage({ id: 'payables.column.cnyPaymentAmount' })}>
                    <span style={{ fontWeight: 'bold', color: '#eb2f96' }}>
                      ¥ {(currentPayable.cnyPaymentAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>

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
                extra={cnyPaymentMode 
                  ? intl.formatMessage({ id: 'procurement.form.cnyPaymentHint' })
                  : undefined
                }
              >
                {isCNY ? (
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder={`最多可付 ${currentPayable.unpaidAmount.toFixed(2)}`}
                    precision={2}
                    min={0.01}
                    max={currentPayable.unpaidAmount}
                    addonAfter="¥"
                  />
                ) : (
                  <DualCurrencyInput
                    currencyCode={currentCurrencyCode}
                    exchangeRate={formExchangeRate}
                    placeholder={`最多可付 ${currentPayable.unpaidAmount.toFixed(2)}`}
                    precision={2}
                    min={0.01}
                    cnyPaymentMode={cnyPaymentMode}
                    onCnyValueChange={setCnyActualAmount}
                  />
                )}
              </Form.Item>
              
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="link"
                  onClick={() => form.setFieldsValue({ paymentAmount: currentPayable.unpaidAmount })}
                >
                  {intl.formatMessage({ id: 'payables.action.payFull' })}
                </Button>
              </div>
            </Space>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PayablesPage;
