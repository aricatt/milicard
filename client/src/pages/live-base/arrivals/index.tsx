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
  InboxOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 到货记录数据类型定义
interface ArrivalRecord {
  id: string;
  arrivalDate: string;
  purchaseOrderNo: string;
  goodsName: string;
  warehouseName: string;
  handlerName: string;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// 到货统计数据类型
interface ArrivalStats {
  totalArrivals: number;
  todayArrivals: number;
  weekArrivals: number;
  monthArrivals: number;
}

/**
 * 到货管理页面
 * 记录采购商品的到货情况，支持一张采购单分批多次到货
 */
const ArrivalManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [arrivalData, setArrivalData] = useState<ArrivalRecord[]>([]);
  const [stats, setStats] = useState<ArrivalStats>({
    totalArrivals: 0,
    todayArrivals: 0,
    weekArrivals: 0,
    monthArrivals: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [purchaseOrderFilter, setPurchaseOrderFilter] = useState<string>('');
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
  const columns: ColumnsType<ArrivalRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text: string) => text.slice(-8),
    },
    {
      title: '日期',
      dataIndex: 'arrivalDate',
      key: 'arrivalDate',
      width: 120,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
    },
    {
      title: '采购单',
      dataIndex: 'purchaseOrderNo',
      key: 'purchaseOrderNo',
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '商品',
      dataIndex: 'goodsName',
      key: 'goodsName',
      width: 200,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 120,
      render: (text: string) => (
        <Tag color="blue" icon={<InboxOutlined />}>
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
      title: '到货箱',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}箱` : '-',
    },
    {
      title: '到货包',
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}包` : '-',
    },
    {
      title: '到货盒',
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      align: 'right',
      render: (value: number) => value > 0 ? `${value}盒` : '-',
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

  // 获取到货数据
  const fetchArrivalData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      // 模拟数据
      const mockData: ArrivalRecord[] = [
        {
          id: '1',
          arrivalDate: '2024-01-15',
          purchaseOrderNo: 'PO-2024-001',
          goodsName: '苹果手机壳',
          warehouseName: '主仓库',
          handlerName: '张三',
          boxQuantity: 5,
          packQuantity: 0,
          pieceQuantity: 100,
          notes: '质量良好',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          arrivalDate: '2024-01-14',
          purchaseOrderNo: 'PO-2024-002',
          goodsName: '数据线',
          warehouseName: '副仓库',
          handlerName: '李四',
          boxQuantity: 0,
          packQuantity: 10,
          pieceQuantity: 0,
          notes: '包装完好',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T14:20:00Z',
        },
      ];

      setArrivalData(mockData);
      setPagination(prev => ({
        ...prev,
        total: mockData.length,
      }));
      
      // 计算统计数据
      calculateStats(mockData);
    } catch (error) {
      console.error('获取到货数据失败:', error);
      message.error('获取到货数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStats = (data: ArrivalRecord[]) => {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    const weekAgo = now.subtract(7, 'day');
    const monthAgo = now.subtract(30, 'day');
    
    const totalArrivals = data.length;
    const todayArrivals = data.filter(item => 
      dayjs(item.arrivalDate).format('YYYY-MM-DD') === today
    ).length;
    const weekArrivals = data.filter(item => 
      dayjs(item.arrivalDate).isAfter(weekAgo)
    ).length;
    const monthArrivals = data.filter(item => 
      dayjs(item.arrivalDate).isAfter(monthAgo)
    ).length;
    
    setStats({
      totalArrivals,
      todayArrivals,
      weekArrivals,
      monthArrivals,
    });
  };

  // 处理删除
  const handleDelete = (record: ArrivalRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除到货记录 ${record.purchaseOrderNo} 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        message.success('删除成功');
        fetchArrivalData();
      },
    });
  };

  // 处理创建到货记录
  const handleCreateArrival = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      // 这里应该调用后端API
      console.log('创建到货记录:', values);
      
      message.success('到货记录创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchArrivalData();
    } catch (error) {
      console.error('创建到货记录失败:', error);
      message.error('创建到货记录失败，请稍后重试');
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
    fetchArrivalData();
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
      fetchArrivalData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, warehouseFilter, purchaseOrderFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>到货管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="到货"
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
          添加到货记录
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总到货记录"
              value={stats.totalArrivals}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日到货"
              value={stats.todayArrivals}
              suffix="条"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="近7天到货"
              value={stats.weekArrivals}
              suffix="条"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="近30天到货"
              value={stats.monthArrivals}
              suffix="条"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="搜索商品名称或采购单号"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择仓库"
              allowClear
              style={{ width: '100%' }}
              value={warehouseFilter}
              onChange={(value) => setWarehouseFilter(value || '')}
            >
              <Option value="">全部仓库</Option>
              <Option value="主仓库">主仓库</Option>
              <Option value="副仓库">副仓库</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择采购单"
              allowClear
              style={{ width: '100%' }}
              value={purchaseOrderFilter}
              onChange={(value) => setPurchaseOrderFilter(value || '')}
            >
              <Option value="">全部采购单</Option>
              <Option value="PO-2024-001">PO-2024-001</Option>
              <Option value="PO-2024-002">PO-2024-002</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 到货记录表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={arrivalData}
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
          className={styles.arrivalTable}
        />
      </Card>

      {/* 创建到货记录模态框 */}
      <Modal
        title="添加到货记录"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateArrival}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="采购单"
                name="purchaseOrderId"
                rules={[{ required: true, message: '请选择采购单' }]}
              >
                <Select placeholder="请选择采购单">
                  <Option value="1">PO-2024-001 - 苹果手机壳</Option>
                  <Option value="2">PO-2024-002 - 数据线</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="到货日期"
                name="arrivalDate"
                rules={[{ required: true, message: '请选择到货日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="到货仓库"
                name="warehouseId"
                rules={[{ required: true, message: '请选择到货仓库' }]}
              >
                <Select placeholder="请选择到货仓库">
                  <Option value="1">主仓库</Option>
                  <Option value="2">副仓库</Option>
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
                label="到货箱数"
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
                label="到货包数"
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
                label="到货盒数"
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

export default ArrivalManagement;
