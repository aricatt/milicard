import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, Drawer, Descriptions, Card, Statistic, Row, Col, App, Divider, Table } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { request, useAccess, history } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import OrderForm from './components/OrderForm';

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
  customerNotes?: string;
  staffNotes?: string;
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

const PointOrdersPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const access = useAccess();
  const [formVisible, setFormVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);

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
      message.error('获取订单列表失败');
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
      message.error('获取订单详情失败');
    }
  };

  // 删除订单
  const handleDelete = async (id: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || '删除失败');
    }
  };

  // 更新订单状态
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/point-orders/${id}`, {
        method: 'PUT',
        data: { status },
      });
      message.success('状态更新成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || '状态更新失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<OrderItem>[] = [
    {
      title: '订单编号',
      dataIndex: 'code',
      width: 150,
      copyable: true,
      fixed: 'left',
    },
    {
      title: '点位',
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
      title: '订单日期',
      dataIndex: 'orderDate',
      valueType: 'date',
      width: 110,
    },
    {
      title: '商品数',
      dataIndex: ['_count', 'items'],
      hideInSearch: true,
      width: 80,
      align: 'center',
      render: (_, record) => record.items?.length || record._count?.items || 0,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      hideInSearch: true,
      width: 110,
      align: 'right',
      render: (val) => Number(val).toFixed(2),
    },
    {
      title: '订单状态',
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
      title: '付款状态',
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
      title: '下单人',
      dataIndex: ['creator', 'name'],
      hideInSearch: true,
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 160,
    },
    {
      title: '订单日期',
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
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'PENDING' && access.canUpdatePointOrder && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingOrder(record);
                  setFormVisible(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要确认此订单吗？"
                onConfirm={() => handleUpdateStatus(record.id, 'CONFIRMED')}
              >
                <Button type="link" size="small">
                  确认
                </Button>
              </Popconfirm>
            </>
          )}
          {['PENDING', 'CANCELLED'].includes(record.status) && access.canDeletePointOrder && (
            <Popconfirm
              title="确定要删除此订单吗？"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 订单明细列
  const itemColumns = [
    {
      title: '商品编号',
      dataIndex: ['goods', 'code'],
      width: 120,
    },
    {
      title: '商品名称',
      dataIndex: ['goods', 'name'],
      ellipsis: true,
    },
    {
      title: '箱数',
      dataIndex: 'boxQuantity',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '盒数',
      dataIndex: 'packQuantity',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '单价/盒',
      dataIndex: 'unitPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => Number(val).toFixed(2),
    },
    {
      title: '小计',
      dataIndex: 'totalPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => Number(val).toFixed(2),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '点位订单',
        subTitle: '管理线下点位的订单',
      }}
    >
      {/* 统计卡片 */}
      {stats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title="总订单数" value={stats.totalOrders} />
            </Col>
            <Col span={4}>
              <Statistic title="待确认" value={stats.pendingOrders} valueStyle={{ color: '#fa8c16' }} />
            </Col>
            <Col span={4}>
              <Statistic title="已确认" value={stats.confirmedOrders} valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col span={4}>
              <Statistic title="配送中" value={stats.shippedOrders} valueStyle={{ color: '#13c2c2' }} />
            </Col>
            <Col span={4}>
              <Statistic title="订单总额" value={stats.totalAmount} precision={2} />
            </Col>
            <Col span={4}>
              <Statistic title="待收款" value={stats.unpaidAmount} precision={2} valueStyle={{ color: '#cf1322' }} />
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
              新建订单
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
        title={`订单详情 - ${detailOrder?.code || ''}`}
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
              <Descriptions.Item label="订单编号">{detailOrder.code}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{detailOrder.orderDate}</Descriptions.Item>
              <Descriptions.Item label="点位名称">{detailOrder.point.name}</Descriptions.Item>
              <Descriptions.Item label="点位编号">{detailOrder.point.code}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={ORDER_STATUS[detailOrder.status]?.color}>
                  {ORDER_STATUS[detailOrder.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="付款状态">
                <Tag color={PAYMENT_STATUS[detailOrder.paymentStatus]?.color}>
                  {PAYMENT_STATUS[detailOrder.paymentStatus]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#cf1322', fontWeight: 'bold' }}>
                  {Number(detailOrder.totalAmount).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                {Number(detailOrder.paidAmount).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="收货地址" span={2}>
                {detailOrder.shippingAddress || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="收货电话">
                {detailOrder.shippingPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下单人">{detailOrder.creator.name}</Descriptions.Item>
              <Descriptions.Item label="客户备注" span={2}>
                {detailOrder.customerNotes || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="客服备注" span={2}>
                {detailOrder.staffNotes || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">商品明细</Divider>
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
                      <strong>合计</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ color: '#cf1322' }}>{total.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />

            {/* 操作按钮 */}
            {detailOrder.status === 'PENDING' && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                  <Button
                    onClick={() => {
                      setDetailVisible(false);
                      setEditingOrder(detailOrder);
                      setFormVisible(true);
                    }}
                  >
                    编辑订单
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      handleUpdateStatus(detailOrder.id, 'CONFIRMED');
                      setDetailVisible(false);
                    }}
                  >
                    确认订单
                  </Button>
                </Space>
              </div>
            )}
          </>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default PointOrdersPage;
