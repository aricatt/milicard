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
  SwapOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 调货记录数据类型定义
interface TransferRecord {
  id: string;
  transferDate: string;
  goodsName: string;
  fromLocationName: string;
  toLocationName: string;
  handlerName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// 调货统计数据类型
interface TransferStats {
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  todayTransfers: number;
}

/**
 * 调货管理页面
 * 记录货物在不同仓库/直播间之间的转移情况
 */
const TransferManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [transferData, setTransferData] = useState<TransferRecord[]>([]);
  const [stats, setStats] = useState<TransferStats>({
    totalTransfers: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    todayTransfers: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
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

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange';
      case 'COMPLETED': return 'green';
      case 'CANCELLED': return 'red';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '待处理';
      case 'COMPLETED': return '已完成';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };

  // 表格列定义
  const columns: ColumnsType<TransferRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text: string) => text.slice(-8),
    },
    {
      title: '日期',
      dataIndex: 'transferDate',
      key: 'transferDate',
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
      title: '调出位置',
      dataIndex: 'fromLocationName',
      key: 'fromLocationName',
      width: 120,
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      ),
    },
    {
      title: '',
      key: 'arrow',
      width: 40,
      align: 'center',
      render: () => <ArrowRightOutlined style={{ color: '#999' }} />,
    },
    {
      title: '调入位置',
      dataIndex: 'toLocationName',
      key: 'toLocationName',
      width: 120,
      render: (text: string) => (
        <Tag color="green">{text}</Tag>
      ),
    },
    {
      title: '经手人',
      dataIndex: 'handlerName',
      key: 'handlerName',
      width: 100,
    },
    {
      title: '调货箱',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}箱` : '-',
    },
    {
      title: '调货包',
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}包` : '-',
    },
    {
      title: '调货盒',
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}盒` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={<CheckCircleOutlined />}>
          {getStatusText(status)}
        </Tag>
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
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  // 获取调货数据
  const fetchTransferData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      // 模拟数据
      const mockData: TransferRecord[] = [
        {
          id: '1',
          transferDate: '2024-01-15',
          goodsName: '苹果手机壳',
          fromLocationName: '主仓库',
          toLocationName: '直播间A',
          handlerName: '张三',
          boxQuantity: 2,
          packQuantity: 0,
          pieceQuantity: 50,
          status: 'COMPLETED',
          notes: '直播需要',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          transferDate: '2024-01-14',
          goodsName: '数据线',
          fromLocationName: '副仓库',
          toLocationName: '直播间B',
          handlerName: '李四',
          boxQuantity: 0,
          packQuantity: 5,
          pieceQuantity: 0,
          status: 'PENDING',
          notes: '待处理',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T14:20:00Z',
        },
      ];

      setTransferData(mockData);
      setPagination(prev => ({
        ...prev,
        total: mockData.length,
      }));
      
      // 计算统计数据
      calculateStats(mockData);
    } catch (error) {
      console.error('获取调货数据失败:', error);
      message.error('获取调货数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (data: TransferRecord[]) => {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    
    const totalTransfers = data.length;
    const pendingTransfers = data.filter(item => item.status === 'PENDING').length;
    const completedTransfers = data.filter(item => item.status === 'COMPLETED').length;
    const todayTransfers = data.filter(item => 
      dayjs(item.transferDate).format('YYYY-MM-DD') === today
    ).length;
    
    setStats({
      totalTransfers,
      pendingTransfers,
      completedTransfers,
      todayTransfers,
    });
  };

  // 处理删除
  const handleDelete = (record: TransferRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除调货记录 ${record.goodsName} 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        message.success('删除成功');
        fetchTransferData();
      },
    });
  };

  // 处理创建调货记录
  const handleCreateTransfer = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      // 这里应该调用后端API
      console.log('创建调货记录:', values);
      
      message.success('调货记录创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchTransferData();
    } catch (error) {
      console.error('创建调货记录失败:', error);
      message.error('创建调货记录失败，请稍后重试');
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
    fetchTransferData();
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
      fetchTransferData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, statusFilter, locationFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>调货管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="调货"
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
          添加调货记录
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总调货记录"
              value={stats.totalTransfers}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pendingTransfers}
              suffix="条"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completedTransfers}
              suffix="条"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日调货"
              value={stats.todayTransfers}
              suffix="条"
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
              placeholder="搜索商品名称"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="调货状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || '')}
            >
              <Option value="">全部状态</Option>
              <Option value="PENDING">待处理</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
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

      {/* 调货记录表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={transferData}
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
          className={styles.transferTable}
        />
      </Card>

      {/* 创建调货记录模态框 */}
      <Modal
        title="添加调货记录"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTransfer}
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
                label="调货日期"
                name="transferDate"
                rules={[{ required: true, message: '请选择调货日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="调出位置"
                name="fromLocationId"
                rules={[{ required: true, message: '请选择调出位置' }]}
              >
                <Select placeholder="请选择调出位置">
                  <Option value="1">主仓库</Option>
                  <Option value="2">副仓库</Option>
                  <Option value="3">直播间A</Option>
                  <Option value="4">直播间B</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="调入位置"
                name="toLocationId"
                rules={[{ required: true, message: '请选择调入位置' }]}
              >
                <Select placeholder="请选择调入位置">
                  <Option value="1">主仓库</Option>
                  <Option value="2">副仓库</Option>
                  <Option value="3">直播间A</Option>
                  <Option value="4">直播间B</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

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

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="调货箱数"
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
                label="调货包数"
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
                label="调货盒数"
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

export default TransferManagement;
