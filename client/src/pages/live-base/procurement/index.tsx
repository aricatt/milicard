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
  const [form] = Form.useForm();

  // 表格列定义
  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
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

      const response = await fetch(`/api/v1/bases/${currentBase.id}/purchase-orders?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
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
    } finally {
      setLoading(false);
    }
  };

  // 获取采购统计
  const fetchPurchaseStats = async () => {
    if (!currentBase) return;

    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/purchase-orders/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('获取采购统计失败:', error);
    }
  };

  // 获取供应商列表
  const fetchSuppliers = async () => {
    if (!currentBase) return;

    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/suppliers`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error);
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

  // 处理创建采购订单
  const handleCreateOrder = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          baseId: currentBase.id,
          purchaseDate: values.purchaseDate.format('YYYY-MM-DD'),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('采购订单创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchPurchaseData();
      } else {
        throw new Error(result.message || '创建采购订单失败');
      }
    } catch (error) {
      console.error('创建采购订单失败:', error);
      message.error('创建采购订单失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
    // TODO: 实现导出功能
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchPurchaseData();
  };

  // 表格变化处理
  const handleTableChange = (newPagination: any) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 筛选处理
  const handleFilterChange = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (currentBase) {
      fetchPurchaseData();
      fetchSuppliers();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, supplierFilter, dateRange]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>采购管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="采购管理"
      subTitle={`当前基地：${currentBase.name}`}
      extra={[
        <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
          导出
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新
        </Button>,
        <Button 
          key="add" 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          新建采购订单
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={stats.totalOrders}
              suffix="单"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="采购总额"
              value={stats.totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="合作供应商"
              value={stats.uniqueSuppliers}
              suffix="家"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均订单额"
              value={stats.averageAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="搜索订单编号"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择供应商"
              allowClear
              style={{ width: '100%' }}
              value={supplierFilter}
              onChange={(value) => {
                setSupplierFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部供应商</Option>
              {suppliers.map(supplier => (
                <Option key={supplier.id} value={supplier.name}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="订单状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部状态</Option>
              <Option value="pending">待确认</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="received">已收货</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                handleFilterChange();
              }}
            />
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
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          size="middle"
          className={styles.procurementTable}
        />
      </Card>

      {/* 创建采购订单模态框 */}
      <Modal
        title="新建采购订单"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrder}
          autoComplete="off"
        >
          <Form.Item
            label="订单编号"
            name="orderNo"
            rules={[
              { required: true, message: '请输入订单编号' },
              { min: 3, max: 50, message: '订单编号长度应在3-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入订单编号" />
          </Form.Item>

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
            label="总金额"
            name="totalAmount"
            rules={[
              { required: true, message: '请输入总金额' },
              { type: 'number', min: 0.01, message: '总金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入总金额"
              precision={2}
              min={0.01}
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
              <Button onClick={() => setCreateModalVisible(false)}>
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
