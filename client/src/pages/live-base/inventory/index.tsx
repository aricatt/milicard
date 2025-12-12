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
  App 
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExportOutlined, 
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { useIntl } from '@umijs/max';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 库存数据类型定义
interface InventoryItem {
  id: string;
  goodsId: string;
  locationId: string;
  baseId: number;
  stockQuantity: number;
  averageCost: number;
  totalValue: number;
  updatedAt: string;
  goods: {
    id: string;
    code: string;
    name: string;
    description: string;
    boxQuantity: number;
    packPerBox: number;
    piecePerPack: number;
  };
  location: {
    id: string;
    name: string;
    type: string;
    description: string;
  };
  base: {
    id: number;
    code: string;
    name: string;
  };
}

// 库存统计数据类型
interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  uniqueGoods: number;
  uniqueLocations: number;
  totalValue: number;
}

/**
 * 库存管理页面
 * 基地中心化的库存管理，显示当前基地的库存数据
 */
const InventoryManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalQuantity: 0,
    uniqueGoods: 0,
    uniqueLocations: 0,
    totalValue: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 表格列定义
  const columns: ColumnsType<InventoryItem> = [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: ['goods', 'code'],
      key: 'goodsCode',
      width: 120,
      fixed: 'left',
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: ['goods', 'name'],
      key: 'goodsName',
      width: 200,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'table.column.description' }),
      dataIndex: ['goods', 'description'],
      key: 'goodsDescription',
      width: 150,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'inventory.column.stockQty' }),
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 100,
      align: 'right',
      render: (value: number) => (
        <span style={{ 
          color: value <= 10 ? '#ff4d4f' : 
                 value <= 50 ? '#faad14' : '#52c41a' 
        }}>
          {value}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'inventory.column.avgCost' }),
      dataIndex: 'averageCost',
      key: 'averageCost',
      width: 100,
      align: 'right',
      render: (value: number) => `${Number(value).toFixed(2)}`,
    },
    {
      title: intl.formatMessage({ id: 'inventory.column.totalValue' }),
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 120,
      align: 'right',
      render: (value: number) => `${Number(value).toFixed(2)}`,
    },
    {
      title: intl.formatMessage({ id: 'inventory.column.location' }),
      dataIndex: ['location', 'name'],
      key: 'locationName',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'inventory.column.locationType' }),
      dataIndex: ['location', 'type'],
      key: 'locationType',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      key: 'status',
      width: 100,
      render: (_, record: InventoryItem) => {
        const quantity = record.stockQuantity;
        let status, config;
        if (quantity === 0) {
          status = 'out';
          config = { color: 'red', text: intl.formatMessage({ id: 'inventory.status.outOfStock' }), icon: <WarningOutlined /> };
        } else if (quantity <= 10) {
          status = 'low';
          config = { color: 'orange', text: intl.formatMessage({ id: 'inventory.status.lowStock' }), icon: <WarningOutlined /> };
        } else {
          status = 'normal';
          config = { color: 'green', text: intl.formatMessage({ id: 'inventory.status.normal' }), icon: <CheckCircleOutlined /> };
        }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            {intl.formatMessage({ id: 'button.edit' })}
          </Button>
          <Button type="link" size="small" onClick={() => handleViewHistory(record)}>
            {intl.formatMessage({ id: 'inventory.viewHistory' })}
          </Button>
        </Space>
      ),
    },
  ];

  // 获取库存数据
  const fetchInventoryData = async () => {
    if (!currentBase) {
      message.warning(intl.formatMessage({ id: 'message.selectBaseFirst' }));
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { search: searchText }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/v1/bases/${currentBase.id}/inventory?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setInventoryData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
        }));
        
        // 获取统计数据
        fetchInventoryStats();
      } else {
        throw new Error(result.message || '获取库存数据失败');
      }
    } catch (error) {
      console.error('获取库存数据失败:', error);
      message.error('获取库存数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取库存统计
  const fetchInventoryStats = async () => {
    if (!currentBase) return;

    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/inventory/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setStats(result.data || {});
      }
    } catch (error) {
      console.error('获取库存统计失败:', error);
    }
  };

  // 处理编辑
  const handleEdit = (record: InventoryItem) => {
    message.info(`编辑商品: ${record.goods.name}`);
    // TODO: 打开编辑模态框
  };

  // 查看历史记录
  const handleViewHistory = (record: InventoryItem) => {
    message.info(`查看历史: ${record.goods.name}`);
    // TODO: 打开历史记录模态框
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
    // TODO: 实现导出功能
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchInventoryData();
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
      fetchInventoryData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, categoryFilter, statusFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>{intl.formatMessage({ id: 'message.selectBaseFirst' })}</h3>
            <p>{intl.formatMessage({ id: 'message.selectBaseHint' })}</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{ title: false }}
      extra={[
        <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
          {intl.formatMessage({ id: 'button.export' })}
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh}>
          {intl.formatMessage({ id: 'button.refresh' })}
        </Button>,
        <Button key="add" type="primary" icon={<PlusOutlined />}>
          {intl.formatMessage({ id: 'inventory.stockIn' })}
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'inventory.stats.uniqueGoods' })}
              value={stats.uniqueGoods}
              suffix={intl.formatMessage({ id: 'unit.item' })}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'inventory.stats.totalValue' })}
              value={stats.totalValue}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'inventory.stats.totalQty' })}
              value={stats.totalQuantity}
              suffix={intl.formatMessage({ id: 'unit.item' })}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'inventory.stats.locations' })}
              value={stats.uniqueLocations}
              suffix={intl.formatMessage({ id: 'unit.item' })}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder={intl.formatMessage({ id: 'inventory.search.placeholder' })}
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
              placeholder={intl.formatMessage({ id: 'inventory.filter.category' })}
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">{intl.formatMessage({ id: 'filter.allCategories' })}</Option>
              <Option value="card">{intl.formatMessage({ id: 'products.category.card' })}</Option>
              <Option value="cardBrick">{intl.formatMessage({ id: 'products.category.cardBrick' })}</Option>
              <Option value="gift">{intl.formatMessage({ id: 'products.category.gift' })}</Option>
              <Option value="toy">{intl.formatMessage({ id: 'products.category.toy' })}</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder={intl.formatMessage({ id: 'inventory.filter.status' })}
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">{intl.formatMessage({ id: 'filter.allStatus' })}</Option>
              <Option value="normal">{intl.formatMessage({ id: 'inventory.status.normal' })}</Option>
              <Option value="low">{intl.formatMessage({ id: 'inventory.status.lowStock' })}</Option>
              <Option value="out">{intl.formatMessage({ id: 'inventory.status.outOfStock' })}</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 库存表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={inventoryData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              intl.formatMessage({ id: 'table.pagination.total' }, { start: range[0], end: range[1], total }),
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
          size="middle"
          className={styles.inventoryTable}
        />
      </Card>
    </PageContainer>
  );
};

export default InventoryManagement;
