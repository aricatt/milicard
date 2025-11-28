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
import { useBase, useBaseCurrency } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// 销售订单数据类型定义
interface SalesOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  orderDate: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// 销售统计数据类型
interface SalesStats {
  totalOrders: number;
  totalAmount: number;
  uniqueCustomers: number;
  averageAmount: number;
}

// 客户数据类型
interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

/**
 * 销售管理页面
 * 基地中心化的销售管理，显示当前基地的销售订单
 */
const SalesManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { symbol: currencySymbol } = useBaseCurrency();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesOrder[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    totalOrders: 0,
    totalAmount: 0,
    uniqueCustomers: 0,
    averageAmount: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
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
  const columns: ColumnsType<SalesOrder> = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
    },
    {
      title: '联系电话',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      width: 120,
    },
    {
      title: '订单日期',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (value: number) => `${currencySymbol}${Number(value).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, any> = {
          pending: { color: 'orange', text: '待处理', icon: <ClockCircleOutlined /> },
          confirmed: { color: 'blue', text: '已确认', icon: <CheckCircleOutlined /> },
          shipped: { color: 'green', text: '已发货', icon: <CheckCircleOutlined /> },
          delivered: { color: 'green', text: '已送达', icon: <CheckCircleOutlined /> },
          cancelled: { color: 'red', text: '已取消', icon: <WarningOutlined /> },
        };
        const config = statusConfig[status] || statusConfig.pending;
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

  // 获取销售订单数据
  const fetchSalesData = async () => {
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
        ...(customerFilter && { customerName: customerFilter }),
        ...(dateRange && dateRange[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange && dateRange[1] && { endDate: dateRange[1].format('YYYY-MM-DD') }),
      });

      const response = await fetch(`/api/v1/bases/${currentBase.id}/distribution-orders?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSalesData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
        }));
        
        // 获取统计数据
        fetchSalesStats();
      } else {
        throw new Error(result.message || '获取销售数据失败');
      }
    } catch (error) {
      console.error('获取销售数据失败:', error);
      message.error('获取销售数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取销售统计
  const fetchSalesStats = async () => {
    if (!currentBase) return;

    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/sales/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('获取销售统计失败:', error);
    }
  };

  // 获取客户列表
  const fetchCustomers = async () => {
    if (!currentBase) return;

    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/customers`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  // 处理查看
  const handleView = (record: SalesOrder) => {
    message.info(`查看销售订单: ${record.orderNo}`);
  };

  // 处理编辑
  const handleEdit = (record: SalesOrder) => {
    message.info(`编辑销售订单: ${record.orderNo}`);
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchSalesData();
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
      fetchSalesData();
      fetchCustomers();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, customerFilter, dateRange]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>销售管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="销售管理"
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
          新建销售订单
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
              title="销售总额"
              value={stats.totalAmount}
              precision={2}
              prefix={currencySymbol}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="客户总数"
              value={stats.uniqueCustomers}
              suffix="个"
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
              prefix={currencySymbol}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="搜索订单编号"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => handleSearch(searchText)}
              />
              <Button 
                type="primary" 
                icon={<SearchOutlined />}
                onClick={() => handleSearch(searchText)}
              />
            </Space.Compact>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择客户"
              allowClear
              style={{ width: '100%' }}
              value={customerFilter}
              onChange={(value) => {
                setCustomerFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部客户</Option>
              {customers.map(customer => (
                <Option key={customer.id} value={customer.name}>
                  {customer.name}
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
              <Option value="pending">待处理</Option>
              <Option value="confirmed">已确认</Option>
              <Option value="shipped">已发货</Option>
              <Option value="delivered">已送达</Option>
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

      {/* 销售订单表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={salesData}
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
          className={styles.salesTable}
        />
      </Card>
    </PageContainer>
  );
};

export default SalesManagement;
