import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, Drawer, Descriptions, Tabs, Empty, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import PointForm from './components/PointForm';

interface PointItem {
  id: string;
  code: string;
  name: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    name: string;
    phone?: string;
  };
  dealer?: {
    id: string;
    username: string;
    name: string;
    phone?: string;
  };
  base?: {
    id: number;
    code: string;
    name: string;
  };
  _count?: {
    pointOrders: number;
    pointInventory: number;
  };
}

interface InventoryItem {
  id: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  goods: {
    id: string;
    code: string;
    name: string;
    retailPrice: number;
  };
}

interface OrderItem {
  id: string;
  code: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

const PointsPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const [formVisible, setFormVisible] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PointItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailPoint, setDetailPoint] = useState<PointItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 获取点位列表
  const fetchPoints = async (params: any) => {
    if (!currentBase?.id) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/points`, {
        params: {
          page: params.current,
          pageSize: params.pageSize,
          keyword: params.keyword,
          isActive: params.isActive,
        },
      });

      return {
        data: response.data || [],
        success: response.success,
        total: response.total || 0,
      };
    } catch (error) {
      message.error('获取点位列表失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 查看详情
  const handleViewDetail = async (record: PointItem) => {
    setDetailPoint(record);
    setDetailVisible(true);
    setLoadingDetail(true);

    try {
      // 获取库存和订单
      const [inventoryRes, ordersRes] = await Promise.all([
        request(`/api/v1/bases/${currentBase?.id}/points/${record.id}/inventory`),
        request(`/api/v1/bases/${currentBase?.id}/points/${record.id}/orders`),
      ]);

      setInventory(inventoryRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error('获取详情失败', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 删除点位
  const handleDelete = async (id: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/points/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || '删除失败');
    }
  };

  // 表格列定义
  const columns: ProColumns<PointItem>[] = [
    {
      title: '编号',
      dataIndex: 'code',
      width: 160,
      copyable: true,
    },
    {
      title: '店铺名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '老板',
      dataIndex: ['owner', 'name'],
      hideInSearch: true,
      render: (_, record) => record.owner ? (
        <span>{record.owner.name} {record.owner.phone && `(${record.owner.phone})`}</span>
      ) : '-',
    },
    {
      title: '经销商',
      dataIndex: ['dealer', 'name'],
      hideInSearch: true,
      render: (_, record) => record.dealer ? (
        <span>{record.dealer.name} {record.dealer.phone && `(${record.dealer.phone})`}</span>
      ) : '-',
    },
    {
      title: '订单数',
      dataIndex: ['_count', 'pointOrders'],
      hideInSearch: true,
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '停用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 160,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingPoint(record);
              setFormVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该点位吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 订单状态映射
  const orderStatusMap: Record<string, { text: string; color: string }> = {
    PENDING: { text: '待处理', color: 'orange' },
    CONFIRMED: { text: '已确认', color: 'blue' },
    SHIPPING: { text: '配送中', color: 'cyan' },
    DELIVERED: { text: '已送达', color: 'geekblue' },
    COMPLETED: { text: '已完成', color: 'green' },
    CANCELLED: { text: '已取消', color: 'default' },
  };

  const paymentStatusMap: Record<string, { text: string; color: string }> = {
    UNPAID: { text: '未付款', color: 'red' },
    PARTIAL: { text: '部分付款', color: 'orange' },
    PAID: { text: '已付款', color: 'green' },
  };

  return (
    <PageContainer>
      <ProTable<PointItem>
        headerTitle="点位列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPoint(null);
              setFormVisible(true);
            }}
          >
            新建点位
          </Button>,
        ]}
        request={fetchPoints}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
      />

      {/* 新建/编辑表单 */}
      <PointForm
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setEditingPoint(null);
        }}
        onSuccess={() => {
          setFormVisible(false);
          setEditingPoint(null);
          actionRef.current?.reload();
        }}
        editingPoint={editingPoint}
        baseId={currentBase?.id}
      />

      {/* 详情抽屉 */}
      <Drawer
        title={`点位详情 - ${detailPoint?.name || ''}`}
        width={720}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailPoint(null);
          setInventory([]);
          setOrders([]);
        }}
      >
        {detailPoint && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="编号">{detailPoint.code}</Descriptions.Item>
                    <Descriptions.Item label="店铺名称">{detailPoint.name}</Descriptions.Item>
                    <Descriptions.Item label="地址" span={2}>{detailPoint.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系人">{detailPoint.contactPerson || '-'}</Descriptions.Item>
                    <Descriptions.Item label="联系电话">{detailPoint.contactPhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="老板">
                      {detailPoint.owner ? `${detailPoint.owner.name} (${detailPoint.owner.phone || '-'})` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="经销商">
                      {detailPoint.dealer ? `${detailPoint.dealer.name} (${detailPoint.dealer.phone || '-'})` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={detailPoint.isActive ? 'green' : 'default'}>
                        {detailPoint.isActive ? '启用' : '停用'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {new Date(detailPoint.updatedAt).toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'inventory',
                label: '库存信息',
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
                ) : inventory.length === 0 ? (
                  <Empty description="暂无库存数据" />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>商品编号</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>商品名称</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>箱</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>盒</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>个</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id}>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>{item.goods.code}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>{item.goods.name}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>{item.boxQuantity}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>{item.packQuantity}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>{item.pieceQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ),
              },
              {
                key: 'orders',
                label: '历史订单',
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
                ) : orders.length === 0 ? (
                  <Empty description="暂无订单数据" />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>订单编号</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>下单日期</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>金额</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>订单状态</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>付款状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>{order.code}</td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>
                            {new Date(order.orderDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'right' }}>
                            {Number(order.totalAmount).toLocaleString()}
                          </td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <Tag color={orderStatusMap[order.status]?.color || 'default'}>
                              {orderStatusMap[order.status]?.text || order.status}
                            </Tag>
                          </td>
                          <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <Tag color={paymentStatusMap[order.paymentStatus]?.color || 'default'}>
                              {paymentStatusMap[order.paymentStatus]?.text || order.paymentStatus}
                            </Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default PointsPage;
