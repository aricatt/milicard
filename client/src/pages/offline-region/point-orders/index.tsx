import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, Drawer, Descriptions, Card, Statistic, Row, Col, App, Divider, Table, Modal, Form, Input, InputNumber, Select, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ShoppingCartOutlined, CarOutlined, CheckCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { request, useAccess, history, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import OrderForm from './components/OrderForm';
import GoodsNameText from '@/components/GoodsNameText';

// 订单状态
const ORDER_STATUS = {
  PENDING: { text: '待确认', color: 'orange' },
  CONFIRMED: { text: '已确认', color: 'blue' },
  SHIPPING: { text: '配送中', color: 'cyan' },
  DELIVERED: { text: '已送达', color: 'green' },
  COMPLETED: { text: '已完成', color: 'default' },
  CANCELLED: { text: '已取消', color: 'red' },
};

// 付款状态
const PAYMENT_STATUS = {
  UNPAID: { text: '未付款', color: 'red' },
  PARTIAL: { text: '部分付款', color: 'orange' },
  PAID: { text: '已付款', color: 'green' },
};

interface OrderItem {
  id: string;
  code: string;
  orderDate: string;
  totalAmount: number;
  status: keyof typeof ORDER_STATUS;
  paymentStatus: keyof typeof PAYMENT_STATUS;
  paidAmount: number;
  shippingAddress?: string;
  shippingPhone?: string;
  trackingNumber?: string;
  deliveryPerson?: string;
  deliveryPhone?: string;
  customerNotes?: string;
  staffNotes?: string;
  paymentNotes?: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt: string;
  point: {
    id: string;
    code: string;
    name: string;
    address?: string;
    owner?: {
      id: string;
      name: string;
      phone?: string;
    };
  };
  creator: {
    id: string;
    username: string;
    name: string;
  };
  confirmer?: {
    id: string;
    username: string;
    name: string;
  };
  items: {
    id: string;
    boxQuantity: number;
    packQuantity: number;
    unitPrice: number;
    totalPrice: number;
    goods: {
      id: string;
      code: string;
      name: string;
      retailPrice: number;
      packPerBox: number;
    };
  }[];
  _count?: {
    items: number;
  };
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  completedOrders: number;
  totalAmount: number;
  unpaidAmount: number;
}

// 收款方式
const PAYMENT_METHODS = [
  { value: '现金', label: '现金' },
  { value: '微信', label: '微信' },
  { value: '支付宝', label: '支付宝' },
  { value: '银行转账', label: '银行转账' },
];

const PointOrdersPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const access = useAccess();
  const [formVisible, setFormVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  
  // 发货弹窗
  const [shipModalVisible, setShipModalVisible] = useState(false);
  const [shipForm] = Form.useForm();
  const [warehouses, setWarehouses] = useState<{ id: number; name: string; type: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [orderInventory, setOrderInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  // 收款弹窗
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentForm] = Form.useForm();

  // 获取统计数据
  const fetchStats = async () => {
    if (!currentBase?.id) return;
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/point-orders/stats`);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  };

  // 获取订单列表
  const fetchOrders = async (params: any) => {
    if (!currentBase?.id) {
      return { data: [], success: true, total: 0 };
    }

    try {
      // 获取统计数据
      fetchStats();

      const response = await request(`/api/v1/bases/${currentBase.id}/point-orders`, {
        params: {
          page: params.current,
          pageSize: params.pageSize,
          keyword: params.keyword,
          pointId: params.pointId,
          status: params.status,
          paymentStatus: params.paymentStatus,
          startDate: params.orderDate?.[0],
          endDate: params.orderDate?.[1],
        },
      });

      return {
        data: response.data || [],
        success: response.success,
        total: response.total || 0,
      };
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pointOrders.message.fetchFailed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  // 查看详情
  const handleViewDetail = async (record: OrderItem) => {
    try {
      const response = await request(`/api/v1/bases/${currentBase?.id}/point-orders/${record.id}`);
      if (response.success) {
        setDetailOrder(response.data);
        setDetailVisible(true);
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'pointOrders.message.detailFailed' }));
    }
  };

  // 删除订单
  const handleDelete = async (id: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${id}`, {
        method: 'DELETE',
      });
      message.success(intl.formatMessage({ id: 'message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'message.deleteFailed' }));
    }
  };

  // 更新订单状态
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${id}`, {
        method: 'PUT',
        data: { status },
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.statusUpdateSuccess' }));
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.statusUpdateFailed' }));
    }
  };

  // 获取仓库列表，返回默认仓库ID
  const fetchWarehouses = async (): Promise<number | null> => {
    if (!currentBase?.id) return null;
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/locations`, {
        params: { pageSize: 100, type: 'MAIN_WAREHOUSE,WAREHOUSE' },
      });
      if (response.success) {
        // 过滤出仓库类型
        const warehouseList = (response.data || []).filter(
          (loc: any) => loc.type === 'MAIN_WAREHOUSE' || loc.type === 'WAREHOUSE'
        );
        setWarehouses(warehouseList);
        // 默认选择总仓库
        const mainWarehouse = warehouseList.find((w: any) => w.type === 'MAIN_WAREHOUSE');
        let defaultWarehouseId: number | null = null;
        if (mainWarehouse) {
          defaultWarehouseId = mainWarehouse.id;
        } else if (warehouseList.length > 0) {
          defaultWarehouseId = warehouseList[0].id;
        }
        if (defaultWarehouseId) {
          setSelectedWarehouse(defaultWarehouseId);
          shipForm.setFieldValue('locationId', defaultWarehouseId);
        }
        return defaultWarehouseId;
      }
    } catch (error) {
      console.error('获取仓库列表失败', error);
    }
    return null;
  };

  // 获取订单商品库存信息
  const fetchOrderInventory = async (locationId: number) => {
    if (!currentBase?.id || !detailOrder?.id) return;
    setLoadingInventory(true);
    try {
      const response = await request(
        `/api/v1/bases/${currentBase.id}/point-orders/${detailOrder.id}/inventory`,
        { params: { locationId } }
      );
      if (response.success) {
        setOrderInventory(response.data || []);
      }
    } catch (error) {
      console.error('获取库存信息失败', error);
    } finally {
      setLoadingInventory(false);
    }
  };

  // 仓库选择变化
  const handleWarehouseChange = (locationId: number) => {
    setSelectedWarehouse(locationId);
    fetchOrderInventory(locationId);
  };

  // 打开发货弹窗
  const handleOpenShipModal = async () => {
    shipForm.resetFields();
    setOrderInventory([]);
    setShipModalVisible(true);
    // 获取仓库列表并获取默认仓库的库存
    const defaultWarehouseId = await fetchWarehouses();
    if (defaultWarehouseId) {
      fetchOrderInventory(defaultWarehouseId);
    }
  };

  // 发货
  const handleShip = async () => {
    if (!detailOrder) return;
    try {
      const values = await shipForm.validateFields();
      
      // 检查是否选择了仓库
      if (!values.locationId) {
        message.error(intl.formatMessage({ id: 'pointOrders.message.selectWarehouse' }));
        return;
      }
      
      // 检查库存是否充足
      const insufficientItems = orderInventory.filter(item => !item.sufficient);
      if (insufficientItems.length > 0) {
        message.error(`${intl.formatMessage({ id: 'pointOrders.message.insufficientStock' })}: ${insufficientItems.map(i => i.goodsName).join(', ')}`);
        return;
      }
      
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/ship`, {
        method: 'POST',
        data: values,
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.shipSuccess' }));
      setShipModalVisible(false);
      setDetailVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.shipFailed' }));
    }
  };

  // 确认送达
  const handleDeliver = async () => {
    if (!detailOrder) return;
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/deliver`, {
        method: 'POST',
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.deliverSuccess' }));
      setDetailVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.deliverFailed' }));
    }
  };

  // 打开收款弹窗
  const handleOpenPaymentModal = () => {
    if (!detailOrder) return;
    const unpaid = Number(detailOrder.totalAmount) - Number(detailOrder.paidAmount);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({ amount: unpaid > 0 ? unpaid : 0 });
    setPaymentModalVisible(true);
  };

  // 确认收款
  const handleConfirmPayment = async () => {
    if (!detailOrder) return;
    try {
      const values = await paymentForm.validateFields();
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/payment`, {
        method: 'POST',
        data: values,
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.paymentSuccess' }));
      setPaymentModalVisible(false);
      // 刷新详情
      const response = await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}`);
      if (response.success) {
        setDetailOrder(response.data);
      }
      actionRef.current?.reload();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.paymentFailed' }));
    }
  };

  // 完成订单（官方人员）
  const handleComplete = async () => {
    if (!detailOrder) return;
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/complete`, {
        method: 'POST',
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.completeSuccess' }));
      setDetailVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.completeFailed' }));
    }
  };

  // 确认订单（官方人员，使用新API）
  const handleConfirm = async () => {
    if (!detailOrder) return;
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/confirm`, {
        method: 'POST',
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.confirmSuccess' }));
      setDetailVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.confirmFailed' }));
    }
  };

  // 确认收货（点位老板）
  const handleReceive = async () => {
    if (!detailOrder) return;
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${detailOrder.id}/receive`, {
        method: 'POST',
      });
      message.success(intl.formatMessage({ id: 'pointOrders.message.receiveSuccess' }));
      setDetailVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.receiveFailed' }));
    }
  };

  // 表格列定义
  const columns: ProColumns<OrderItem>[] = [
    {
      title: intl.formatMessage({ id: 'pointOrders.column.orderNo' }),
      dataIndex: 'code',
      width: 150,
      copyable: true,
      fixed: 'left',
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.point' }),
      dataIndex: ['point', 'name'],
      ellipsis: true,
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.point.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.point.code}</div>
        </div>
      ),
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.orderDate' }),
      dataIndex: 'orderDate',
      valueType: 'date',
      width: 110,
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.itemCount' }),
      dataIndex: ['_count', 'items'],
      hideInSearch: true,
      width: 80,
      align: 'center',
      render: (_, record) => record.items?.length || record._count?.items || 0,
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.amount' }),
      dataIndex: 'totalAmount',
      hideInSearch: true,
      width: 110,
      align: 'right',
      render: (val) => Number(val).toFixed(2),
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.status' }),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(ORDER_STATUS).map(([key, val]) => [key, { text: val.text }])
      ),
      render: (_, record) => {
        const status = ORDER_STATUS[record.status] || { text: record.status, color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.paymentStatus' }),
      dataIndex: 'paymentStatus',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(PAYMENT_STATUS).map(([key, val]) => [key, { text: val.text }])
      ),
      render: (_, record) => {
        const status = PAYMENT_STATUS[record.paymentStatus] || { text: record.paymentStatus, color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.creator' }),
      dataIndex: ['creator', 'name'],
      hideInSearch: true,
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 160,
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.orderDate' }),
      key: 'orderDateRange',
      dataIndex: 'orderDate',
      valueType: 'dateRange',
      hideInTable: true,
      search: {
        transform: (value) => ({
          startDate: value[0],
          endDate: value[1],
        }),
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title={intl.formatMessage({ id: 'button.detail' })}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.status === 'PENDING' && access.canUpdatePointOrder && (
            <Tooltip title={intl.formatMessage({ id: 'button.edit' })}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingOrder(record);
                  setFormVisible(true);
                }}
              />
            </Tooltip>
          )}
          {record.status === 'PENDING' && access.canConfirmPointOrder && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pointOrders.confirm.title' })}
              onConfirm={async () => {
                try {
                  await request(`/api/v1/bases/${currentBase?.id}/point-orders/${record.id}/confirm`, {
                    method: 'POST',
                  });
                  message.success(intl.formatMessage({ id: 'pointOrders.message.confirmSuccess' }));
                  actionRef.current?.reload();
                } catch (error: any) {
                  message.error(error?.data?.message || intl.formatMessage({ id: 'pointOrders.message.confirmFailed' }));
                }
              }}
            >
              <Tooltip title={intl.formatMessage({ id: 'button.confirm' })}>
                <Button type="link" size="small" icon={<CheckCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          {['PENDING', 'CANCELLED'].includes(record.status) && access.canDeletePointOrder && (
            <Popconfirm
              title={intl.formatMessage({ id: 'pointOrders.delete.title' })}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 订单明细列
  const itemColumns = [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: ['goods', 'code'],
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: ['goods', 'name'],
      render: (text: string) => <GoodsNameText text={text} />,
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.boxQty' }),
      dataIndex: 'boxQuantity',
      width: 80,
      align: 'center' as const,
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.packQty' }),
      dataIndex: 'packQuantity',
      width: 80,
      align: 'center' as const,
    },
    {
      title: intl.formatMessage({ id: 'unit.pricePerPack' }),
      dataIndex: 'unitPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: intl.formatMessage({ id: 'pointOrders.column.subtotal' }),
      dataIndex: 'totalPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => Number(val).toFixed(2),
    },
  ];

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'pointOrders.title' }),
        subTitle: intl.formatMessage({ id: 'pointOrders.subTitle' }),
      }}
    >
      {/* 统计卡片 */}
      {stats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.total' })} value={stats.totalOrders} />
            </Col>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.pending' })} value={stats.pendingOrders} valueStyle={{ color: '#fa8c16' }} />
            </Col>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.confirmed' })} value={stats.confirmedOrders} valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.shipping' })} value={stats.shippedOrders} valueStyle={{ color: '#13c2c2' }} />
            </Col>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.totalAmount' })} value={stats.totalAmount} precision={2} />
            </Col>
            <Col span={4}>
              <Statistic title={intl.formatMessage({ id: 'pointOrders.stats.unpaid' })} value={stats.unpaidAmount} precision={2} valueStyle={{ color: '#cf1322' }} />
            </Col>
          </Row>
        </Card>
      )}

      <ProTable<OrderItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchOrders}
        search={{
          labelWidth: 'auto',
        }}
        scroll={{ x: 1400 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          access.canCreatePointOrder && (
            <Button
              key="create"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingOrder(null);
                setFormVisible(true);
              }}
            >
              {intl.formatMessage({ id: 'pointOrders.add' })}
            </Button>
          ),
        ]}
      />

      {/* 订单表单弹窗 */}
      <OrderForm
        visible={formVisible}
        order={editingOrder}
        onClose={() => {
          setFormVisible(false);
          setEditingOrder(null);
        }}
        onSuccess={() => {
          setFormVisible(false);
          setEditingOrder(null);
          actionRef.current?.reload();
        }}
      />

      {/* 订单详情抽屉 */}
      <Drawer
        title={`${intl.formatMessage({ id: 'pointOrders.detail.title' })} - ${detailOrder?.code || ''}`}
        width={700}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailOrder(null);
        }}
      >
        {detailOrder && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.orderNo' })}>{detailOrder.code}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.orderDate' })}>{detailOrder.orderDate}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.pointName' })}>{detailOrder.point.name}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.pointCode' })}>{detailOrder.point.code}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.status' })}>
                <Tag color={ORDER_STATUS[detailOrder.status]?.color}>
                  {ORDER_STATUS[detailOrder.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.paymentStatus' })}>
                <Tag color={PAYMENT_STATUS[detailOrder.paymentStatus]?.color}>
                  {PAYMENT_STATUS[detailOrder.paymentStatus]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.amount' })}>
                <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
                  {Number(detailOrder.totalAmount).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.paidAmount' })}>
                <span style={{ color: Number(detailOrder.paidAmount) >= Number(detailOrder.totalAmount) ? '#52c41a' : '#fa8c16' }}>
                  {Number(detailOrder.paidAmount).toFixed(2)}
                </span>
                {Number(detailOrder.paidAmount) < Number(detailOrder.totalAmount) && (
                  <span style={{ color: '#999', marginLeft: 8 }}>
                    ({intl.formatMessage({ id: 'pointOrders.detail.unpaid' })}: {(Number(detailOrder.totalAmount) - Number(detailOrder.paidAmount)).toFixed(2)})
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.shippingAddress' })} span={2}>
                {detailOrder.shippingAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.shippingPhone' })}>
                {detailOrder.shippingPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.column.creator' })}>{detailOrder.creator.name}</Descriptions.Item>
            </Descriptions>

            {/* 物流信息 */}
            {(detailOrder.status === 'SHIPPING' || detailOrder.status === 'DELIVERED' || detailOrder.status === 'COMPLETED') && (
              <>
                <Divider orientation="left">{intl.formatMessage({ id: 'pointOrders.detail.logistics' })}</Divider>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.deliveryPerson' })}>{detailOrder.deliveryPerson || '-'}</Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.deliveryPhone' })}>{detailOrder.deliveryPhone || '-'}</Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.trackingNumber' })} span={2}>{detailOrder.trackingNumber || '-'}</Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.shippedAt' })}>{detailOrder.shippedAt ? new Date(detailOrder.shippedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.deliveredAt' })}>{detailOrder.deliveredAt ? new Date(detailOrder.deliveredAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {/* 付款记录 */}
            {detailOrder.paymentNotes && (
              <>
                <Divider orientation="left">{intl.formatMessage({ id: 'pointOrders.detail.paymentRecord' })}</Divider>
                <div style={{ background: '#fafafa', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                  {detailOrder.paymentNotes}
                </div>
              </>
            )}

            {/* 备注信息 */}
            {(detailOrder.customerNotes || detailOrder.staffNotes) && (
              <>
                <Divider orientation="left">{intl.formatMessage({ id: 'table.column.notes' })}</Divider>
                <Descriptions column={1} bordered size="small">
                  {detailOrder.customerNotes && (
                    <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.customerNotes' })}>{detailOrder.customerNotes}</Descriptions.Item>
                  )}
                  {detailOrder.staffNotes && (
                    <Descriptions.Item label={intl.formatMessage({ id: 'pointOrders.detail.staffNotes' })}>{detailOrder.staffNotes}</Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            <Divider orientation="left">{intl.formatMessage({ id: 'pointOrders.detail.items' })}</Divider>
            <Table
              rowKey="id"
              columns={itemColumns}
              dataSource={detailOrder.items}
              pagination={false}
              size="small"
              summary={(data) => {
                const total = data.reduce((sum, item) => sum + Number(item.totalPrice), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <strong>{intl.formatMessage({ id: 'pointOrders.detail.total' })}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ color: '#cf1322' }}>{total.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />

            {/* 操作按钮 */}
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                {/* 待确认状态：编辑（点位老板+官方）、确认（官方） */}
                {detailOrder.status === 'PENDING' && (
                  <>
                    {access.canUpdatePointOrder && (
                      <Button
                        onClick={() => {
                          setDetailVisible(false);
                          setEditingOrder(detailOrder);
                          setFormVisible(true);
                        }}
                      >
                        {intl.formatMessage({ id: 'pointOrders.action.editOrder' })}
                      </Button>
                    )}
                    {access.canConfirmPointOrder && (
                      <Popconfirm
                        title={intl.formatMessage({ id: 'pointOrders.confirm.title' })}
                        onConfirm={handleConfirm}
                      >
                        <Button type="primary">
                          {intl.formatMessage({ id: 'pointOrders.action.confirmOrder' })}
                        </Button>
                      </Popconfirm>
                    )}
                  </>
                )}

                {/* 已确认状态：发货（官方） */}
                {detailOrder.status === 'CONFIRMED' && access.canShipPointOrder && (
                  <Button
                    type="primary"
                    icon={<CarOutlined />}
                    onClick={handleOpenShipModal}
                  >
                    {intl.formatMessage({ id: 'pointOrders.action.ship' })}
                  </Button>
                )}

                {/* 配送中/已送达状态：确认送达/收货（合并按钮，根据权限显示不同文案） */}
                {['SHIPPING', 'DELIVERED'].includes(detailOrder.status) && access.canDeliverOrReceivePointOrder && (
                  <Popconfirm
                    title={access.canReceivePointOrder ? intl.formatMessage({ id: 'pointOrders.receive.title' }) : intl.formatMessage({ id: 'pointOrders.deliver.title' })}
                    onConfirm={access.canReceivePointOrder ? handleReceive : handleDeliver}
                  >
                    <Button type="primary" icon={<CheckCircleOutlined />}>
                      {access.canReceivePointOrder ? intl.formatMessage({ id: 'pointOrders.action.receive' }) : intl.formatMessage({ id: 'pointOrders.action.deliver' })}
                    </Button>
                  </Popconfirm>
                )}

                {/* 已确认及之后状态：收款（官方，未全额付款时显示） */}
                {['CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(detailOrder.status) && 
                  access.canPaymentPointOrder &&
                  Number(detailOrder.paidAmount) < Number(detailOrder.totalAmount) && (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={handleOpenPaymentModal}
                  >
                    {intl.formatMessage({ id: 'pointOrders.action.payment' })}
                  </Button>
                )}

                {/* 已送达状态：完成订单（官方） */}
                {detailOrder.status === 'DELIVERED' && access.canCompletePointOrder && (
                  <Popconfirm
                    title={intl.formatMessage({ id: 'pointOrders.complete.title' })}
                    onConfirm={handleComplete}
                  >
                    <Button>{intl.formatMessage({ id: 'pointOrders.action.complete' })}</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </>
        )}
      </Drawer>

      {/* 发货弹窗 */}
      <Modal
        title={intl.formatMessage({ id: 'pointOrders.ship.title' })}
        open={shipModalVisible}
        onOk={handleShip}
        onCancel={() => setShipModalVisible(false)}
        okText={intl.formatMessage({ id: 'pointOrders.ship.confirm' })}
        width={700}
      >
        <Form form={shipForm} layout="vertical">
          <Form.Item
            name="locationId"
            label={intl.formatMessage({ id: 'pointOrders.ship.warehouse' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pointOrders.ship.warehouseRequired' }) }]}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'pointOrders.ship.warehousePlaceholder' })}
              onChange={handleWarehouseChange}
            >
              {warehouses.map(w => (
                <Select.Option key={w.id} value={w.id}>
                  {w.name} {w.type === 'MAIN_WAREHOUSE' ? `(${intl.formatMessage({ id: 'locations.type.mainWarehouse' })})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* 商品库存信息 */}
          {selectedWarehouse && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{intl.formatMessage({ id: 'pointOrders.ship.stockStatus' })}</div>
              <Table
                size="small"
                loading={loadingInventory}
                dataSource={orderInventory}
                rowKey="goodsId"
                pagination={false}
                columns={[
                  {
                    title: intl.formatMessage({ id: 'products.column.name' }),
                    dataIndex: 'goodsName',
                    width: 150,
                    render: (text: string) => <GoodsNameText text={text} />,
                  },
                  { 
                    title: intl.formatMessage({ id: 'pointOrders.ship.required' }), 
                    key: 'required',
                    width: 100,
                    render: (_, record) => `${record.requiredBox}${intl.formatMessage({ id: 'unit.box' })}${record.requiredPack}${intl.formatMessage({ id: 'unit.pack' })}`
                  },
                  { 
                    title: intl.formatMessage({ id: 'pointOrders.ship.available' }), 
                    key: 'available',
                    width: 100,
                    render: (_, record) => `${record.availableBox}${intl.formatMessage({ id: 'unit.box' })}${record.availablePack}${intl.formatMessage({ id: 'unit.pack' })}`
                  },
                  { 
                    title: intl.formatMessage({ id: 'status.label' }), 
                    key: 'status',
                    width: 80,
                    render: (_, record) => (
                      <Tag color={record.sufficient ? 'green' : 'red'}>
                        {record.sufficient ? intl.formatMessage({ id: 'pointOrders.ship.sufficient' }) : intl.formatMessage({ id: 'pointOrders.ship.insufficient' })}
                      </Tag>
                    )
                  },
                ]}
              />
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deliveryPerson"
                label={intl.formatMessage({ id: 'pointOrders.ship.deliveryPerson' })}
              >
                <Input placeholder={intl.formatMessage({ id: 'pointOrders.ship.deliveryPersonPlaceholder' })} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deliveryPhone"
                label={intl.formatMessage({ id: 'pointOrders.ship.deliveryPhone' })}
              >
                <Input placeholder={intl.formatMessage({ id: 'pointOrders.ship.deliveryPhonePlaceholder' })} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="trackingNumber"
            label={intl.formatMessage({ id: 'pointOrders.ship.trackingNumber' })}
          >
            <Input placeholder={intl.formatMessage({ id: 'pointOrders.ship.trackingNumberPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 收款弹窗 */}
      <Modal
        title={intl.formatMessage({ id: 'pointOrders.payment.title' })}
        open={paymentModalVisible}
        onOk={handleConfirmPayment}
        onCancel={() => setPaymentModalVisible(false)}
        okText={intl.formatMessage({ id: 'pointOrders.payment.confirm' })}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            name="amount"
            label={intl.formatMessage({ id: 'pointOrders.payment.amount' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'pointOrders.payment.amountRequired' }) }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              placeholder={intl.formatMessage({ id: 'pointOrders.payment.amountPlaceholder' })}
            />
          </Form.Item>
          <Form.Item
            name="paymentMethod"
            label={intl.formatMessage({ id: 'pointOrders.payment.method' })}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'pointOrders.payment.methodPlaceholder' })}
              options={[
                { value: intl.formatMessage({ id: 'pointOrders.payment.cash' }), label: intl.formatMessage({ id: 'pointOrders.payment.cash' }) },
                { value: intl.formatMessage({ id: 'pointOrders.payment.wechat' }), label: intl.formatMessage({ id: 'pointOrders.payment.wechat' }) },
                { value: intl.formatMessage({ id: 'pointOrders.payment.alipay' }), label: intl.formatMessage({ id: 'pointOrders.payment.alipay' }) },
                { value: intl.formatMessage({ id: 'pointOrders.payment.bank' }), label: intl.formatMessage({ id: 'pointOrders.payment.bank' }) },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label={intl.formatMessage({ id: 'table.column.notes' })}
          >
            <Input.TextArea rows={2} placeholder={intl.formatMessage({ id: 'pointOrders.payment.notesPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PointOrdersPage;
