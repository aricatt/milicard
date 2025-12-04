import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, InputNumber, Button, Table, Space, Card, Descriptions, App, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import dayjs from 'dayjs';

interface PointOption {
  id: string;
  code: string;
  name: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  owner?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface GoodsOption {
  id: string;
  code: string;
  name: string;
  retailPrice: number; // 箱单价（可能是点位专属价格）
  packPerBox: number;
  piecePerPack: number;
  imageUrl?: string;
  maxBoxQuantity?: number; // 最大可购箱数
  maxPackQuantity?: number; // 最大可购盒数
}

interface OrderItemData {
  key: string;
  goodsId: string;
  goods?: GoodsOption;
  boxQuantity: number;
  packQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderFormProps {
  visible: boolean;
  order?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ visible, order, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<PointOption[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<PointOption | null>(null);
  const [goods, setGoods] = useState<GoodsOption[]>([]);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);
  const [selectedGoodsId, setSelectedGoodsId] = useState<string | null>(null);

  const isEdit = !!order;

  // 获取可选点位
  const fetchPoints = async (keyword?: string) => {
    if (!currentBase?.id) return;
    setPointsLoading(true);
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/point-orders/available-points`, {
        params: { keyword },
      });
      if (response.success) {
        setPoints(response.data || []);
      }
    } catch (error) {
      console.error('获取点位列表失败', error);
    } finally {
      setPointsLoading(false);
    }
  };

  // 获取可选商品（根据选中的点位过滤）
  const fetchGoods = async (keyword?: string, pointId?: string) => {
    if (!currentBase?.id) return;
    setGoodsLoading(true);
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/point-orders/available-goods`, {
        params: { keyword, pointId },
      });
      if (response.success) {
        setGoods(response.data || []);
      }
    } catch (error) {
      console.error('获取商品列表失败', error);
    } finally {
      setGoodsLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    if (visible) {
      fetchPoints();

      if (order) {
        // 编辑模式：填充表单
        const pointId = order.pointId || order.point?.id;
        form.setFieldsValue({
          pointId,
          orderDate: order.orderDate ? dayjs(order.orderDate) : dayjs(),
          shippingAddress: order.shippingAddress,
          shippingPhone: order.shippingPhone,
          customerNotes: order.customerNotes,
        });

        // 设置选中的点位
        if (order.point) {
          setSelectedPoint(order.point);
        }

        // 获取该点位的可购商品
        if (pointId) {
          fetchGoods(undefined, pointId);
        }

        // 设置订单明细
        if (order.items && order.items.length > 0) {
          setOrderItems(
            order.items.map((item: any, index: number) => ({
              key: `item-${index}`,
              goodsId: item.goodsId || item.goods?.id,
              goods: item.goods,
              boxQuantity: item.boxQuantity || 0,
              packQuantity: item.packQuantity || 0,
              unitPrice: Number(item.unitPrice) || 0,
              totalPrice: Number(item.totalPrice) || 0,
            }))
          );
        }
      } else {
        // 新建模式：重置表单
        form.resetFields();
        form.setFieldsValue({
          orderDate: dayjs(),
        });
        setSelectedPoint(null);
        setOrderItems([]);
        setGoods([]); // 清空商品列表，等选择点位后再加载
      }
    }
  }, [visible, order]);

  // 选择点位时更新地址和电话，并重新获取可购商品
  const handlePointChange = (pointId: string) => {
    const point = points.find((p) => p.id === pointId);
    if (point) {
      setSelectedPoint(point);
      form.setFieldsValue({
        shippingAddress: point.address,
        shippingPhone: point.contactPhone,
      });
      // 清空已选商品，重新获取该点位的可购商品
      setOrderItems([]);
      setSelectedGoodsId(null);
      fetchGoods(undefined, pointId);
    }
  };

  // 添加商品
  const handleAddGoods = () => {
    if (!selectedGoodsId) {
      message.warning('请先选择商品');
      return;
    }

    // 检查是否已添加
    if (orderItems.some((item) => item.goodsId === selectedGoodsId)) {
      message.warning('该商品已添加');
      return;
    }

    const selectedGoods = goods.find((g) => g.id === selectedGoodsId);
    if (!selectedGoods) return;

    // retailPrice 是箱单价，需要转换为盒单价
    const boxPrice = Number(selectedGoods.retailPrice) || 0;
    const packPerBox = selectedGoods.packPerBox || 1;
    const packPrice = boxPrice / packPerBox; // 盒单价

    const newItem: OrderItemData = {
      key: `item-${Date.now()}`,
      goodsId: selectedGoodsId,
      goods: selectedGoods,
      boxQuantity: 0,
      packQuantity: 1,
      unitPrice: packPrice, // 使用盒单价
      totalPrice: packPrice, // 初始1盒的价格
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedGoodsId(null);
  };

  // 删除商品
  const handleRemoveGoods = (key: string) => {
    setOrderItems(orderItems.filter((item) => item.key !== key));
  };

  // 更新商品数量或单价
  const handleItemChange = (key: string, field: string, value: number) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value };
          // 重新计算总价
          const packPerBox = item.goods?.packPerBox || 1;
          const totalPacks = updated.boxQuantity * packPerBox + updated.packQuantity;
          updated.totalPrice = totalPacks * updated.unitPrice;
          return updated;
        }
        return item;
      })
    );
  };

  // 计算订单总金额
  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (orderItems.length === 0) {
        message.error('请至少添加一个商品');
        return;
      }

      // 验证商品数量
      for (const item of orderItems) {
        if (item.boxQuantity === 0 && item.packQuantity === 0) {
          message.error(`商品 ${item.goods?.name} 的数量不能为0`);
          return;
        }
      }

      setLoading(true);

      const data = {
        pointId: values.pointId,
        orderDate: values.orderDate.format('YYYY-MM-DD'),
        shippingAddress: values.shippingAddress,
        shippingPhone: values.shippingPhone,
        customerNotes: values.customerNotes,
        items: orderItems.map((item) => ({
          goodsId: item.goodsId,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          unitPrice: item.unitPrice,
        })),
      };

      if (isEdit) {
        await request(`/api/v1/bases/${currentBase?.id}/point-orders/${order.id}`, {
          method: 'PUT',
          data,
        });
        message.success('订单更新成功');
      } else {
        await request(`/api/v1/bases/${currentBase?.id}/point-orders`, {
          method: 'POST',
          data,
        });
        message.success('订单创建成功');
      }

      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 商品明细列
  const itemColumns = [
    {
      title: '商品名称',
      dataIndex: ['goods', 'name'],
      ellipsis: true,
    },
    {
      title: '箱数',
      dataIndex: 'boxQuantity',
      width: 100,
      render: (_: any, record: OrderItemData) => (
        <InputNumber
          min={0}
          value={record.boxQuantity}
          onChange={(val) => handleItemChange(record.key, 'boxQuantity', val || 0)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '盒数',
      dataIndex: 'packQuantity',
      width: 100,
      render: (_: any, record: OrderItemData) => (
        <InputNumber
          min={0}
          value={record.packQuantity}
          onChange={(val) => handleItemChange(record.key, 'packQuantity', val || 0)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '单价/盒',
      dataIndex: 'unitPrice',
      width: 120,
      render: (_: any, record: OrderItemData) => (
        <InputNumber
          min={0}
          step={0.01}
          precision={2}
          value={record.unitPrice}
          onChange={(val) => handleItemChange(record.key, 'unitPrice', val || 0)}
          size="small"
          style={{ width: '100%' }}
                  />
      ),
    },
    {
      title: '小计',
      dataIndex: 'totalPrice',
      width: 100,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: '#cf1322' }}>{val.toFixed(2)}</span>
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, record: OrderItemData) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveGoods(record.key)}
        />
      ),
    },
  ];

  return (
    <Modal
      title={isEdit ? '编辑订单' : '新建订单'}
      open={visible}
      onCancel={onClose}
      width={900}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          {isEdit ? '保存' : '提交订单'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            name="pointId"
            label="选择点位"
            rules={[{ required: true, message: '请选择点位' }]}
          >
            <Select
              showSearch
              placeholder="搜索并选择点位"
              loading={pointsLoading}
              filterOption={false}
              onSearch={fetchPoints}
              onChange={handlePointChange}
              optionLabelProp="label"
            >
              {points.map((point) => (
                <Select.Option key={point.id} value={point.id} label={point.name}>
                  <div>
                    <div>{point.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {point.code} | {point.address || '无地址'}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedPoint && (
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="点位编号">{selectedPoint.code}</Descriptions.Item>
              <Descriptions.Item label="老板">
                {selectedPoint.owner?.name || '-'}
                {selectedPoint.owner?.phone && ` (${selectedPoint.owner.phone})`}
              </Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>
                {selectedPoint.address || '-'}
              </Descriptions.Item>
            </Descriptions>
          )}

          <Form.Item
            name="orderDate"
            label="订单日期"
            rules={[{ required: true, message: '请选择订单日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="shippingAddress" label="收货地址">
            <Input placeholder="收货地址" />
          </Form.Item>

          <Form.Item name="shippingPhone" label="收货电话">
            <Input placeholder="收货电话" />
          </Form.Item>

          <Form.Item name="customerNotes" label="备注">
            <Input.TextArea rows={2} placeholder="订单备注" />
          </Form.Item>
        </Card>

        <Card
          title="商品明细"
          size="small"
          extra={
            <Space>
              <Select
                showSearch
                placeholder={selectedPoint ? "搜索商品" : "请先选择点位"}
                disabled={!selectedPoint}
                style={{ width: 280 }}
                loading={goodsLoading}
                filterOption={false}
                onSearch={(keyword) => fetchGoods(keyword, selectedPoint?.id)}
                value={selectedGoodsId}
                onChange={setSelectedGoodsId}
                optionLabelProp="label"
                notFoundContent={goods.length === 0 ? "该点位暂无可购商品" : "未找到商品"}
              >
                {goods.map((g) => {
                  // 计算盒单价显示
                  const boxPrice = Number(g.retailPrice) || 0;
                  const packPerBox = g.packPerBox || 1;
                  const packPrice = boxPrice / packPerBox;
                  return (
                    <Select.Option key={g.id} value={g.id} label={g.name}>
                      <div>
                        <div>{g.name}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {packPrice.toFixed(2)}/盒 ({boxPrice.toFixed(2)}/箱)
                          {g.maxBoxQuantity && ` 限${g.maxBoxQuantity}箱`}
                        </div>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddGoods}>
                添加
              </Button>
            </Space>
          }
        >
          {orderItems.length > 0 ? (
            <Table
              rowKey="key"
              columns={itemColumns}
              dataSource={orderItems}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4} align="right">
                    <strong>订单总额</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong style={{ color: '#cf1322', fontSize: 16 }}>
                      {totalAmount.toFixed(2)}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              )}
            />
          ) : (
            <Empty description="请添加商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </Form>
    </Modal>
  );
};

export default OrderForm;
