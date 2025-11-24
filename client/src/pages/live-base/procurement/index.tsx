import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Statistic, 
  Row, 
  Col, 
  Input, 
  Select, 
  DatePicker, 
  Modal,
  Form,
  InputNumber,
  App 
} from 'antd';
import { request } from '@umijs/max';
import PurchaseOrderItems, { type PurchaseOrderItem } from '@/components/PurchaseOrderItems';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExportOutlined, 
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 采购订单数据类型定义
interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierName: string;
  targetLocationId: string;
  baseId: number;
  purchaseDate: string;
  totalAmount: number;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  locationName: string;
  locationType: string;
  baseName: string;
  status?: 'pending' | 'confirmed' | 'received' | 'cancelled';
}

// 采购统计数据类型
interface PurchaseStats {
  totalOrders: number;
  totalAmount: number;
  uniqueSuppliers: number;
  averageAmount: number;
}

// 供应商数据类型
interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
}

/**
 * 采购管理页面
 * 基地中心化的采购管理，显示当前基地的采购订单
 */
const ProcurementManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<PurchaseStats>({
    totalOrders: 0,
    totalAmount: 0,
    uniqueSuppliers: 0,
    averageAmount: 0,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [form] = Form.useForm();

  // 表格列定义
  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
      fixed: 'left',
      render: (text: string) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{text}</span>,
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 150,
    },
    {
      title: '采购日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${Number(value).toFixed(2)}`,
    },
    {
      title: '目标位置',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 120,
    },
    {
      title: '位置类型',
      dataIndex: 'locationType',
      key: 'locationType',
      width: 100,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record: PurchaseOrder) => {
        // 根据创建时间和其他信息推断状态
        const now = new Date();
        const createdAt = new Date(record.createdAt);
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        
        let status, config;
        if (daysDiff < 1) {
          status = 'pending';
          config = { color: 'orange', text: '待确认', icon: <ClockCircleOutlined /> };
        } else if (daysDiff < 7) {
          status = 'confirmed';
          config = { color: 'blue', text: '已确认', icon: <CheckCircleOutlined /> };
        } else {
          status = 'received';
          config = { color: 'green', text: '已收货', icon: <CheckCircleOutlined /> };
        }
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  // 获取采购订单数据
  const fetchPurchaseData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        current: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { orderNo: searchText }),
        ...(supplierFilter && { supplierName: supplierFilter }),
        ...(dateRange && dateRange[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange && dateRange[1] && { endDate: dateRange[1].format('YYYY-MM-DD') }),
      });

      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'GET',
        params: Object.fromEntries(params),
      });
      
      if (result.success) {
        setPurchaseData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
        }));
        
        // 获取统计数据
        fetchPurchaseStats();
      } else {
        throw new Error(result.message || '获取采购数据失败');
      }
    } catch (error) {
      console.error('获取采购数据失败:', error);
      message.error('获取采购数据失败，请稍后重试');
      // 设置空数据
      setPurchaseData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  // 获取采购统计
  const fetchPurchaseStats = async () => {
    if (!currentBase) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders/stats`, {
        method: 'GET',
      });
      
      if (result.success) {
        setStats(result.data || {
          totalOrders: 0,
          totalAmount: 0,
          uniqueSuppliers: 0,
          averageAmount: 0,
        });
      }
    } catch (error) {
      console.error('获取采购统计失败:', error);
      // 设置默认统计数据
      setStats({
        totalOrders: 0,
        totalAmount: 0,
        uniqueSuppliers: 0,
        averageAmount: 0,
      });
    }
  };

  // 获取供应商列表
  const fetchSuppliers = async () => {
    if (!currentBase) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/suppliers`, {
        method: 'GET',
      });
      
      if (result.success) {
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error);
      // 设置空供应商列表
      setSuppliers([]);
    }
  };

  // 处理查看
  const handleView = (record: PurchaseOrder) => {
    message.info(`查看采购订单: ${record.orderNo}`);
    // TODO: 打开查看模态框
  };

  // 处理编辑
  const handleEdit = (record: PurchaseOrder) => {
    message.info(`编辑采购订单: ${record.orderNo}`);
    // TODO: 打开编辑模态框
  };

  // 创建采购订单
  const handleCreateOrder = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    if (!orderItems.length) {
      message.error('请至少添加一个商品');
      return;
    }

    // 验证所有商品都已选择
    const invalidItems = orderItems.filter(item => !item.goodsId);
    if (invalidItems.length > 0) {
      message.error('请为所有商品行选择商品');
      return;
    }

    setCreateLoading(true);
    try {
      // 计算总金额
      const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // 准备API数据
      const orderData = {
        ...values,
        totalAmount,
        baseId: currentBase.id,
        items: orderItems.map(item => ({
          goodsId: item.goodsId,
          boxQuantity: item.boxQuantity,
          packQuantity: item.packQuantity,
          pieceQuantity: item.pieceQuantity,
          totalPieces: item.boxQuantity + item.packQuantity + item.pieceQuantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes
        }))
      };
      
      console.log('创建采购订单数据:', orderData);
      
      // 调用创建采购订单API
      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'POST',
        data: orderData,
      });
      
      if (result.success) {
        message.success('采购订单创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        setOrderItems([]);
        fetchPurchaseData();
      } else {
        throw new Error(result.message || '创建采购订单失败');
      }
    } catch (error) {
      message.error('创建采购订单失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchPurchaseData();
  };

  // 处理重置
  const handleReset = () => {
    setSearchText('');
    setSupplierFilter('');
    setStatusFilter('');
    setDateRange(null);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchPurchaseData();
  };

  // 处理表格变化
  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    fetchPurchaseData();
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (currentBase) {
      fetchPurchaseData();
      fetchSuppliers();
    }
  }, [currentBase]);

  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14', marginBottom: '16px' }} />
            <h3>请先选择基地</h3>
            <p>采购管理需要在特定基地下进行，请先在页面顶部选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="采购管理"
      subTitle={`当前基地: ${currentBase.name}`}
      extra={[
        <Button key="export" icon={<ExportOutlined />}>
          导出
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={fetchPurchaseData}>
          刷新
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建采购订单
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={stats.totalOrders}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总采购金额"
              value={stats.totalAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="供应商数量"
              value={stats.uniqueSuppliers}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均订单金额"
              value={stats.averageAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Search
              placeholder="搜索订单编号"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择供应商"
              value={supplierFilter}
              onChange={setSupplierFilter}
              style={{ width: '100%' }}
              allowClear
            >
              {suppliers.map(supplier => (
                <Option key={supplier.id} value={supplier.name}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="pending">待确认</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="received">已收货</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button onClick={handleSearch} type="primary" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 采购订单表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={purchaseData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* 创建采购订单模态框 */}
      <Modal
        title="创建采购订单"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
          setOrderItems([]);
        }}
        footer={null}
        width={1000}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrder}
          autoComplete="off"
        >
          <Form.Item
            label="供应商"
            name="supplierName"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <Select placeholder="请选择供应商">
              {suppliers.map(supplier => (
                <Option key={supplier.id} value={supplier.name}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="采购日期"
            name="purchaseDate"
            rules={[{ required: true, message: '请选择采购日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="商品明细"
            required
          >
            <PurchaseOrderItems
              value={orderItems}
              onChange={setOrderItems}
            />
          </Form.Item>

          <Form.Item
            label="实付金额"
            name="actualAmount"
            extra="实际支付的金额，可能与订单总金额不同"
            rules={[
              { type: 'number', min: 0, message: '实付金额不能为负数' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入实付金额"
              min={0}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={4}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
                setOrderItems([]);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ProcurementManagement;
