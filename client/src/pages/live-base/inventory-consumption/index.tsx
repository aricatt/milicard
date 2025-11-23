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
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Tabs,
  App 
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExportOutlined, 
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// 库存数据类型定义
interface InventoryRecord {
  id: string;
  goodsName: string;
  locationName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  totalValue: number;
  lastUpdated: string;
}

// 消耗记录数据类型定义
interface ConsumptionRecord {
  id: string;
  consumptionDate: string;
  goodsName: string;
  locationName: string;
  handlerName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  reason: string;
  notes: string;
  createdAt: string;
}

// 统计数据类型
interface Stats {
  totalInventoryValue: number;
  totalConsumptions: number;
  todayConsumptions: number;
  lowStockItems: number;
}

/**
 * 库存和消耗管理页面
 * 显示库存状态和记录销售消耗情况
 */
const InventoryConsumptionManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryRecord[]>([]);
  const [consumptionData, setConsumptionData] = useState<ConsumptionRecord[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInventoryValue: 0,
    totalConsumptions: 0,
    todayConsumptions: 0,
    lowStockItems: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // 库存表格列定义
  const inventoryColumns: ColumnsType<InventoryRecord> = [
    {
      title: '商品名称',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 200,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '位置',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 120,
      render: (text: string) => (
        <Tag color="blue" icon={<DatabaseOutlined />}>
          {text}
        </Tag>
      ),
    },
    {
      title: '库存箱',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: value < 5 ? '#ff4d4f' : '#000' }}>
          {value > 0 ? `${value}箱` : '-'}
        </span>
      ),
    },
    {
      title: '库存包',
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: value < 10 ? '#ff4d4f' : '#000' }}>
          {value > 0 ? `${value}包` : '-'}
        </span>
      ),
    },
    {
      title: '库存盒',
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: value < 20 ? '#ff4d4f' : '#000' }}>
          {value > 0 ? `${value}盒` : '-'}
        </span>
      ),
    },
    {
      title: '总价值',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 120,
      align: 'right',
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 消耗记录表格列定义
  const consumptionColumns: ColumnsType<ConsumptionRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text: string) => text.slice(-8),
    },
    {
      title: '日期',
      dataIndex: 'consumptionDate',
      key: 'consumptionDate',
      width: 120,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '商品',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 200,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '位置',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 120,
      render: (text: string) => (
        <Tag color="green" icon={<ShoppingOutlined />}>
          {text}
        </Tag>
      ),
    },
    {
      title: '经手人',
      dataIndex: 'handlerName',
      key: 'handlerName',
      width: 100,
    },
    {
      title: '消耗箱',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}箱` : '-',
    },
    {
      title: '消耗包',
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}包` : '-',
    },
    {
      title: '消耗盒',
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}盒` : '-',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 100,
      render: (text: string) => (
        <Tag color="orange">{text}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteConsumption(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  // 获取库存数据
  const fetchInventoryData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      // 模拟库存数据
      const mockInventoryData: InventoryRecord[] = [
        {
          id: '1',
          goodsName: '苹果手机壳',
          locationName: '主仓库',
          boxQuantity: 8,
          packQuantity: 15,
          pieceQuantity: 120,
          totalValue: 2400.00,
          lastUpdated: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          goodsName: '数据线',
          locationName: '直播间A',
          boxQuantity: 2,
          packQuantity: 5,
          pieceQuantity: 30,
          totalValue: 450.00,
          lastUpdated: '2024-01-14T14:20:00Z',
        },
      ];

      // 模拟消耗数据
      const mockConsumptionData: ConsumptionRecord[] = [
        {
          id: '1',
          consumptionDate: '2024-01-15',
          goodsName: '苹果手机壳',
          locationName: '直播间A',
          handlerName: '张三',
          boxQuantity: 0,
          packQuantity: 2,
          pieceQuantity: 0,
          reason: '销售',
          notes: '直播销售',
          createdAt: '2024-01-15T16:30:00Z',
        },
        {
          id: '2',
          consumptionDate: '2024-01-14',
          goodsName: '数据线',
          locationName: '直播间B',
          handlerName: '李四',
          boxQuantity: 0,
          packQuantity: 0,
          pieceQuantity: 10,
          reason: '销售',
          notes: '线上销售',
          createdAt: '2024-01-14T18:20:00Z',
        },
      ];

      setInventoryData(mockInventoryData);
      setConsumptionData(mockConsumptionData);
      setPagination(prev => ({
        ...prev,
        total: mockConsumptionData.length,
      }));
      
      // 计算统计数据
      calculateStats(mockInventoryData, mockConsumptionData);
    } catch (error) {
      console.error('获取库存数据失败:', error);
      message.error('获取库存数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (inventoryData: InventoryRecord[], consumptionData: ConsumptionRecord[]) => {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    
    const totalInventoryValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
    const totalConsumptions = consumptionData.length;
    const todayConsumptions = consumptionData.filter(item => 
      dayjs(item.consumptionDate).format('YYYY-MM-DD') === today
    ).length;
    const lowStockItems = inventoryData.filter(item => 
      item.boxQuantity < 5 || item.packQuantity < 10 || item.pieceQuantity < 20
    ).length;
    
    setStats({
      totalInventoryValue,
      totalConsumptions,
      todayConsumptions,
      lowStockItems,
    });
  };

  // 处理删除消耗记录
  const handleDeleteConsumption = (record: ConsumptionRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除消耗记录 ${record.goodsName} 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        message.success('删除成功');
        fetchInventoryData();
      },
    });
  };

  // 处理创建消耗记录
  const handleCreateConsumption = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      // 这里应该调用后端API
      console.log('创建消耗记录:', values);
      
      message.success('消耗记录创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchInventoryData();
    } catch (error) {
      console.error('创建消耗记录失败:', error);
      message.error('创建消耗记录失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
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

  // 页面加载时获取数据
  useEffect(() => {
    if (currentBase) {
      fetchInventoryData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, locationFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>库存和消耗管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="库存和消耗"
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
          添加消耗记录
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats.totalInventoryValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="消耗记录"
              value={stats.totalConsumptions}
              suffix="条"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日消耗"
              value={stats.todayConsumptions}
              suffix="条"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存商品"
              value={stats.lowStockItems}
              suffix="种"
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
                placeholder="搜索商品名称"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={() => handleSearch(searchText)}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => handleSearch(searchText)}
              >
                搜索
              </Button>
            </Space.Compact>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择位置"
              allowClear
              style={{ width: '100%' }}
              value={locationFilter}
              onChange={(value) => setLocationFilter(value || '')}
            >
              <Option value="">全部位置</Option>
              <Option value="主仓库">主仓库</Option>
              <Option value="副仓库">副仓库</Option>
              <Option value="直播间A">直播间A</Option>
              <Option value="直播间B">直播间B</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 库存和消耗标签页 */}
      <Card>
        <Tabs 
          defaultActiveKey="inventory" 
          size="large"
          items={[
            {
              key: 'inventory',
              label: '库存状态',
              children: (
            <Table
              columns={inventoryColumns}
              dataSource={inventoryData}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 1000 }}
              size="middle"
              className={styles.inventoryTable}
            />
              )
            },
            {
              key: 'consumption',
              label: '消耗记录',
              children: (
            <Table
              columns={consumptionColumns}
              dataSource={consumptionData}
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
              scroll={{ x: 1200 }}
              size="middle"
              className={styles.consumptionTable}
            />
              )
            }
          ]}
        />
      </Card>

      {/* 创建消耗记录模态框 */}
      <Modal
        title="添加消耗记录"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateConsumption}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="商品"
                name="goodsId"
                rules={[{ required: true, message: '请选择商品' }]}
              >
                <Select placeholder="请选择商品">
                  <Option value="1">苹果手机壳</Option>
                  <Option value="2">数据线</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="消耗日期"
                name="consumptionDate"
                rules={[{ required: true, message: '请选择消耗日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="消耗位置"
                name="locationId"
                rules={[{ required: true, message: '请选择消耗位置' }]}
              >
                <Select placeholder="请选择消耗位置">
                  <Option value="1">主仓库</Option>
                  <Option value="2">副仓库</Option>
                  <Option value="3">直播间A</Option>
                  <Option value="4">直播间B</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="经手人"
                name="handlerId"
                rules={[{ required: true, message: '请选择经手人' }]}
              >
                <Select placeholder="请选择经手人">
                  <Option value="1">张三</Option>
                  <Option value="2">李四</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="消耗箱数"
                name="boxQuantity"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入箱数"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="消耗包数"
                name="packQuantity"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入包数"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="消耗盒数"
                name="pieceQuantity"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入盒数"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="消耗原因"
                name="reason"
                rules={[{ required: true, message: '请选择消耗原因' }]}
              >
                <Select placeholder="请选择消耗原因">
                  <Option value="销售">销售</Option>
                  <Option value="损耗">损耗</Option>
                  <Option value="退货">退货</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

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

export default InventoryConsumptionManagement;
