import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, Drawer, Descriptions, Tabs, Empty, App, Modal, Form, Select, InputNumber, Switch, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ShoppingCartOutlined, SettingOutlined } from '@ant-design/icons';
import { request, useAccess, history, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import PointForm from './components/PointForm';
import VisitTab from './components/VisitTab';
import { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';

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

interface PointGoodsItem {
  id: string;
  goodsId: string;
  maxBoxQuantity?: number;
  maxPackQuantity?: number;
  unitPrice?: number;
  isActive: boolean;
  goods: {
    id: string;
    code: string;
    name: string;
    retailPrice: number;
    packPerBox: number;
  };
}

// 商品选项接口
interface GoodsOption {
  id: string;
  code: string;
  name: string;
  retailPrice: number;
  packPerBox: number;
}

const PointsPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const access = useAccess();
  const [formVisible, setFormVisible] = useState(false);
  const [editingPoint, setEditingPoint] = useState<PointItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailPoint, setDetailPoint] = useState<PointItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [pointGoods, setPointGoods] = useState<PointGoodsItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // 可购商品编辑相关状态
  const [goodsModalVisible, setGoodsModalVisible] = useState(false);
  const [editingPointGoods, setEditingPointGoods] = useState<PointGoodsItem | null>(null);
  const [allGoods, setAllGoods] = useState<GoodsOption[]>([]);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [goodsForm] = Form.useForm();

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
      message.error(intl.formatMessage({ id: 'points.message.fetchFailed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  // 查看详情
  const handleViewDetail = async (record: PointItem) => {
    setDetailPoint(record);
    setDetailVisible(true);
    setLoadingDetail(true);

    try {
      // 获取库存、订单和可购商品
      const [inventoryRes, ordersRes, goodsRes] = await Promise.all([
        request(`/api/v1/bases/${currentBase?.id}/points/${record.id}/inventory`),
        request(`/api/v1/bases/${currentBase?.id}/points/${record.id}/orders`),
        request(`/api/v1/bases/${currentBase?.id}/points/${record.id}/goods`),
      ]);

      setInventory(inventoryRes.data || []);
      setOrders(ordersRes.data || []);
      setPointGoods(goodsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch detail', error);
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
      message.success(intl.formatMessage({ id: 'message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'message.deleteFailed' }));
    }
  };

  // 获取所有商品列表（用于添加可购商品）
  const fetchAllGoods = async () => {
    if (!currentBase?.id) return;
    setGoodsLoading(true);
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        params: { pageSize: 500 },
      });
      if (response.success) {
        setAllGoods(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch goods', error);
    } finally {
      setGoodsLoading(false);
    }
  };

  // 刷新点位可购商品列表
  const refreshPointGoods = async () => {
    if (!detailPoint?.id || !currentBase?.id) return;
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/points/${detailPoint.id}/goods`);
      if (response.success) {
        setPointGoods(response.data || []);
      }
    } catch (error) {
      console.error('Failed to refresh point goods', error);
    }
  };

  // 打开添加/编辑可购商品弹窗
  const handleOpenGoodsModal = (item?: PointGoodsItem) => {
    if (!allGoods.length) {
      fetchAllGoods();
    }
    setEditingPointGoods(item || null);
    if (item) {
      goodsForm.setFieldsValue({
        goodsId: item.goodsId,
        unitPrice: item.unitPrice,
        maxBoxQuantity: item.maxBoxQuantity,
        maxPackQuantity: item.maxPackQuantity,
        isActive: item.isActive,
      });
    } else {
      goodsForm.resetFields();
      goodsForm.setFieldsValue({ isActive: true });
    }
    setGoodsModalVisible(true);
  };

  // 保存可购商品
  const handleSavePointGoods = async () => {
    try {
      const values = await goodsForm.validateFields();
      
      if (editingPointGoods) {
        // 更新
        await request(`/api/v1/bases/${currentBase?.id}/points/${detailPoint?.id}/goods/${editingPointGoods.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'message.updateSuccess' }));
      } else {
        // 添加
        await request(`/api/v1/bases/${currentBase?.id}/points/${detailPoint?.id}/goods`, {
          method: 'POST',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'message.createSuccess' }));
      }
      
      setGoodsModalVisible(false);
      refreshPointGoods();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error?.data?.message || intl.formatMessage({ id: 'message.operationFailed' }));
    }
  };

  // 删除可购商品
  const handleDeletePointGoods = async (id: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/points/${detailPoint?.id}/goods/${id}`, {
        method: 'DELETE',
      });
      message.success(intl.formatMessage({ id: 'message.deleteSuccess' }));
      refreshPointGoods();
    } catch (error: any) {
      message.error(error?.data?.message || intl.formatMessage({ id: 'message.deleteFailed' }));
    }
  };

  // 表格列定义
  const columns: ProColumns<PointItem>[] = [
    {
      title: intl.formatMessage({ id: 'form.label.code' }),
      dataIndex: 'code',
      width: 160,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'points.column.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'points.column.address' }),
      dataIndex: 'address',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'points.column.owner' }),
      dataIndex: ['owner', 'name'],
      hideInSearch: true,
      render: (_, record) => record.owner ? (
        <span>{record.owner.name} {record.owner.phone && `(${record.owner.phone})`}</span>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'points.column.dealer' }),
      dataIndex: ['dealer', 'name'],
      hideInSearch: true,
      render: (_, record) => record.dealer ? (
        <span>{record.dealer.name} {record.dealer.phone && `(${record.dealer.phone})`}</span>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'points.column.orderCount' }),
      dataIndex: ['_count', 'pointOrders'],
      hideInSearch: true,
      width: 80,
      align: 'center',
    },
    {
      title: intl.formatMessage({ id: 'form.label.status' }),
      dataIndex: 'isActive',
      width: 80,
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
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
      dataIndex: 'updatedAt',
      valueType: 'dateTime',
      hideInSearch: true,
      width: 160,
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      valueType: 'option',
      width: 150,
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
          {access.canUpdatePoint && (
            <Tooltip title={intl.formatMessage({ id: 'button.edit' })}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingPoint(record);
                  setFormVisible(true);
                }}
              />
            </Tooltip>
          )}
          {access.canDeletePoint && (
            <Popconfirm
              title={intl.formatMessage({ id: 'points.deleteConfirm' })}
              onConfirm={() => handleDelete(record.id)}
              okText={intl.formatMessage({ id: 'button.confirm' })}
              cancelText={intl.formatMessage({ id: 'button.cancel' })}
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

  // 订单状态映射
  const orderStatusMap: Record<string, { text: string; color: string }> = {
    PENDING: { text: intl.formatMessage({ id: 'pointOrders.status.pending' }), color: 'orange' },
    CONFIRMED: { text: intl.formatMessage({ id: 'pointOrders.status.confirmed' }), color: 'blue' },
    SHIPPING: { text: intl.formatMessage({ id: 'pointOrders.status.shipping' }), color: 'cyan' },
    DELIVERED: { text: intl.formatMessage({ id: 'pointOrders.status.delivered' }), color: 'geekblue' },
    COMPLETED: { text: intl.formatMessage({ id: 'pointOrders.status.completed' }), color: 'green' },
    CANCELLED: { text: intl.formatMessage({ id: 'pointOrders.status.cancelled' }), color: 'default' },
  };

  const paymentStatusMap: Record<string, { text: string; color: string }> = {
    UNPAID: { text: intl.formatMessage({ id: 'payables.status.unpaid' }), color: 'red' },
    PARTIAL: { text: intl.formatMessage({ id: 'payables.status.partial' }), color: 'orange' },
    PAID: { text: intl.formatMessage({ id: 'payables.status.paid' }), color: 'green' },
  };

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<PointItem>
        headerTitle={intl.formatMessage({ id: 'list.title.points' })}
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        toolBarRender={() => [
          access.canCreatePoint && (
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPoint(null);
                setFormVisible(true);
              }}
            >
              {intl.formatMessage({ id: 'points.add' })}
            </Button>
          ),
        ]}
        request={fetchPoints}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
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
        title={`${intl.formatMessage({ id: 'points.detail.title' })} - ${detailPoint?.name || ''}`}
        width={720}
        open={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailPoint(null);
          setInventory([]);
          setOrders([]);
          setPointGoods([]);
        }}
      >
        {detailPoint && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: intl.formatMessage({ id: 'points.tab.info' }),
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label={intl.formatMessage({ id: 'form.label.code' })}>{detailPoint.code}</Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'points.column.name' })}>{detailPoint.name}</Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'form.label.address' })} span={2}>{detailPoint.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'form.label.contactPerson' })}>{detailPoint.contactPerson || '-'}</Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'form.label.contactPhone' })}>{detailPoint.contactPhone || '-'}</Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'points.column.owner' })}>
                      {detailPoint.owner ? `${detailPoint.owner.name} (${detailPoint.owner.phone || '-'})` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'points.column.dealer' })}>
                      {detailPoint.dealer ? `${detailPoint.dealer.name} (${detailPoint.dealer.phone || '-'})` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'form.label.status' })}>
                      <Tag color={detailPoint.isActive ? 'green' : 'default'}>
                        {detailPoint.isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={intl.formatMessage({ id: 'table.column.updatedAt' })}>
                      {new Date(detailPoint.updatedAt).toLocaleString()}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'inventory',
                label: intl.formatMessage({ id: 'points.tab.inventory' }),
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>{intl.formatMessage({ id: 'message.loading' })}</div>
                ) : inventory.length === 0 ? (
                  <Empty description={intl.formatMessage({ id: 'points.inventory.empty' })} />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'form.label.code' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'form.label.name' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'unit.box' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'unit.pack' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'unit.piece' })}</th>
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
                label: intl.formatMessage({ id: 'points.tab.orders' }),
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>{intl.formatMessage({ id: 'message.loading' })}</div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 16, textAlign: 'right' }}>
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        onClick={() => {
                          // 跳转到点位订单页面，并带上点位ID
                          history.push(`/offline-region/point-orders?pointId=${detailPoint?.id}`);
                        }}
                      >
                        {intl.formatMessage({ id: 'pointOrders.add' })}
                      </Button>
                    </div>
                    {orders.length === 0 ? (
                      <Empty description={intl.formatMessage({ id: 'points.orders.empty' })} />
                    ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'pointOrders.column.orderNo' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'pointOrders.column.orderDate' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'pointOrders.column.amount' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'pointOrders.column.status' })}</th>
                        <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'pointOrders.column.paymentStatus' })}</th>
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
                    )}
                  </div>
                ),
              },
              {
                key: 'goods',
                label: intl.formatMessage({ id: 'points.tab.goods' }),
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>{intl.formatMessage({ id: 'message.loading' })}</div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666', fontSize: 12 }}>
                        {intl.formatMessage({ id: 'points.goods.hint' })}
                      </span>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        size="small"
                        onClick={() => handleOpenGoodsModal()}
                      >
                        {intl.formatMessage({ id: 'points.goods.add' })}
                      </Button>
                    </div>
                    {pointGoods.length === 0 ? (
                      <Empty description={intl.formatMessage({ id: 'points.goods.emptyConfig' })} />
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'table.column.category' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'form.label.name' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'points.goods.unitPrice' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'unit.pricePerPack' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'points.goods.maxBox' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'points.goods.maxPack' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>{intl.formatMessage({ id: 'form.label.status' })}</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0', width: 100 }}>{intl.formatMessage({ id: 'table.column.operation' })}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pointGoods.map((pg: any) => {
                            // 专属单价：只有用户主动设置时才显示
                            const exclusivePrice = Number(pg.unitPrice) || 0;
                            // 系统默认单价：基地本地设置的零售价
                            const systemPrice = Number(pg.goods.baseRetailPrice) || 0;
                            // 用于计算盒单价的价格：优先专属单价，其次系统价格
                            const effectivePrice = exclusivePrice > 0 ? exclusivePrice : systemPrice;
                            const packPrice = effectivePrice > 0 ? effectivePrice / (pg.goods.packPerBox || 1) : 0;
                            const category = pg.goods.category;
                            return (
                              <tr key={pg.id}>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>
                                  {category ? (
                                    <Tag color="blue">{getCategoryDisplayName(category.code, category.name, intl.locale)}</Tag>
                                  ) : '-'}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>{getLocalizedGoodsName(pg.goods.name, pg.goods.nameI18n, intl.locale)}</td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'right' }}>
                                  {exclusivePrice > 0 ? exclusivePrice.toFixed(2) : '-'}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'right' }}>
                                  {packPrice > 0 ? packPrice.toFixed(2) : '-'}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  {pg.maxBoxQuantity ?? intl.formatMessage({ id: 'points.goods.noLimit' })}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  {pg.maxPackQuantity ?? intl.formatMessage({ id: 'points.goods.noLimit' })}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  <Tag color={pg.isActive ? 'green' : 'default'}>
                                    {pg.isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
                                  </Tag>
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  <Space size="small">
                                    <Button 
                                      type="link" 
                                      size="small" 
                                      icon={<EditOutlined />}
                                      onClick={() => handleOpenGoodsModal(pg)}
                                    />
                                    <Popconfirm
                                      title={intl.formatMessage({ id: 'points.goods.deleteConfirm' })}
                                      onConfirm={() => handleDeletePointGoods(pg.id)}
                                    >
                                      <Button 
                                        type="link" 
                                        size="small" 
                                        danger 
                                        icon={<DeleteOutlined />}
                                      />
                                    </Popconfirm>
                                  </Space>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ),
              },
              {
                key: 'visits',
                label: '到访/回访情况',
                children: <VisitTab pointId={detailPoint.id} pointName={detailPoint.name} />,
              },
            ]}
          />
        )}
      </Drawer>

      {/* 可购商品编辑弹窗 */}
      <Modal
        title={editingPointGoods ? intl.formatMessage({ id: 'points.goods.editTitle' }) : intl.formatMessage({ id: 'points.goods.addTitle' })}
        open={goodsModalVisible}
        onOk={handleSavePointGoods}
        onCancel={() => setGoodsModalVisible(false)}
        destroyOnHidden
      >
        <Form
          form={goodsForm}
          layout="vertical"
        >
          <Form.Item
            name="goodsId"
            label={intl.formatMessage({ id: 'points.goods.select' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'form.validation.required' }) }]}
          >
            <Select
              showSearch
              placeholder={intl.formatMessage({ id: 'form.placeholder.select' })}
              loading={goodsLoading}
              disabled={!!editingPointGoods}
              optionFilterProp="label"
              options={allGoods
                .filter(g => !pointGoods.some(pg => pg.goodsId === g.id) || editingPointGoods?.goodsId === g.id)
                .map(g => ({
                  value: g.id,
                  label: `${g.name} (${Number(g.retailPrice).toFixed(2)}/${intl.formatMessage({ id: 'unit.box' })})`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label={intl.formatMessage({ id: 'points.goods.unitPrice' })}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              precision={2}
              placeholder={intl.formatMessage({ id: 'form.placeholder.input' })}
                          />
          </Form.Item>

          <Form.Item
            name="maxBoxQuantity"
            label={intl.formatMessage({ id: 'points.goods.maxBox' })}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder={intl.formatMessage({ id: 'points.goods.noLimit' })}
            />
          </Form.Item>

          <Form.Item
            name="maxPackQuantity"
            label={intl.formatMessage({ id: 'points.goods.maxPack' })}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder={intl.formatMessage({ id: 'points.goods.noLimit' })}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'form.label.status' })}
            valuePropName="checked"
          >
            <Switch checkedChildren={intl.formatMessage({ id: 'status.enabled' })} unCheckedChildren={intl.formatMessage({ id: 'status.disabled' })} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PointsPage;
