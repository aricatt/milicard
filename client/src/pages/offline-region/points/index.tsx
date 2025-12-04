import React, { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, Drawer, Descriptions, Tabs, Empty, App, Modal, Form, Select, InputNumber, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ShoppingCartOutlined, SettingOutlined } from '@ant-design/icons';
import { request, useAccess, history } from '@umijs/max';
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
      console.error('获取商品列表失败', error);
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
      console.error('刷新可购商品失败', error);
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
        message.success('更新成功');
      } else {
        // 添加
        await request(`/api/v1/bases/${currentBase?.id}/points/${detailPoint?.id}/goods`, {
          method: 'POST',
          data: values,
        });
        message.success('添加成功');
      }
      
      setGoodsModalVisible(false);
      refreshPointGoods();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error?.data?.message || '操作失败');
    }
  };

  // 删除可购商品
  const handleDeletePointGoods = async (id: string) => {
    try {
      await request(`/api/v1/bases/${currentBase?.id}/points/${detailPoint?.id}/goods/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      refreshPointGoods();
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
          {access.canUpdatePoint && (
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
          )}
          {access.canDeletePoint && (
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
          )}
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
              新建点位
            </Button>
          ),
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
          setPointGoods([]);
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
                        新建订单
                      </Button>
                    </div>
                    {orders.length === 0 ? (
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
                    )}
                  </div>
                ),
              },
              {
                key: 'goods',
                label: '可购商品',
                children: loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#666', fontSize: 12 }}>
                        配置该点位可以采购的商品及数量限制。未配置时，下单无法选择商品。
                      </span>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        size="small"
                        onClick={() => handleOpenGoodsModal()}
                      >
                        添加商品
                      </Button>
                    </div>
                    {pointGoods.length === 0 ? (
                      <Empty description="暂未配置可购商品" />
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>商品名称</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>单价/箱</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>单价/盒</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>最大箱数</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>最大盒数</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0' }}>状态</th>
                            <th style={{ padding: 8, border: '1px solid #f0f0f0', width: 100 }}>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pointGoods.map((pg) => {
                            const boxPrice = pg.unitPrice || Number(pg.goods.retailPrice);
                            const packPrice = boxPrice / (pg.goods.packPerBox || 1);
                            return (
                              <tr key={pg.id}>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0' }}>{pg.goods.name}</td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'right' }}>
                                  {boxPrice.toFixed(2)}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'right' }}>
                                  {packPrice.toFixed(2)}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  {pg.maxBoxQuantity ?? '不限'}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  {pg.maxPackQuantity ?? '不限'}
                                </td>
                                <td style={{ padding: 8, border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                  <Tag color={pg.isActive ? 'green' : 'default'}>
                                    {pg.isActive ? '启用' : '停用'}
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
                                      title="确定删除该商品配置吗？"
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
            ]}
          />
        )}
      </Drawer>

      {/* 可购商品编辑弹窗 */}
      <Modal
        title={editingPointGoods ? '编辑可购商品' : '添加可购商品'}
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
            label="选择商品"
            rules={[{ required: true, message: '请选择商品' }]}
          >
            <Select
              showSearch
              placeholder="搜索并选择商品"
              loading={goodsLoading}
              disabled={!!editingPointGoods}
              optionFilterProp="label"
              options={allGoods
                .filter(g => !pointGoods.some(pg => pg.goodsId === g.id) || editingPointGoods?.goodsId === g.id)
                .map(g => ({
                  value: g.id,
                  label: `${g.name} (${Number(g.retailPrice).toFixed(2)}/箱)`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label="专属单价/箱"
            tooltip="留空则使用商品默认价格"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              precision={2}
              placeholder="留空使用默认价格"
                          />
          </Form.Item>

          <Form.Item
            name="maxBoxQuantity"
            label="最大可购箱数"
            tooltip="留空表示不限制"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder="不限制"
            />
          </Form.Item>

          <Form.Item
            name="maxPackQuantity"
            label="最大可购盒数"
            tooltip="留空表示不限制"
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              placeholder="不限制"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PointsPage;
