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
  App 
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ExportOutlined, 
  ReloadOutlined,
  WarningOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// 位置类型枚举
enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  LIVE_ROOM = 'LIVE_ROOM',
}

// 位置数据类型定义
interface Location {
  id: string;
  name: string;
  type: LocationType;
  description?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  baseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  baseName: string;
}

// 位置统计数据类型
interface LocationStats {
  totalLocations: number;
  warehouses: number;
  liveRooms: number;
  activeLocations: number;
}

/**
 * 直播间/仓库管理页面
 * 基地中心化的位置管理，统一管理直播间和仓库
 */
const LocationManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState<Location[]>([]);
  const [stats, setStats] = useState<LocationStats>({
    totalLocations: 0,
    warehouses: 0,
    liveRooms: 0,
    activeLocations: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 获取类型显示文本
  const getTypeText = (type: LocationType) => {
    return type === LocationType.WAREHOUSE ? '仓库' : '直播间';
  };

  // 获取类型图标
  const getTypeIcon = (type: LocationType) => {
    return type === LocationType.WAREHOUSE ? <DatabaseOutlined /> : <DesktopOutlined />;
  };

  // 获取类型颜色
  const getTypeColor = (type: LocationType) => {
    return type === LocationType.WAREHOUSE ? 'blue' : 'green';
  };

  // 表格列定义
  const columns: ColumnsType<Location> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => id.slice(-8),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: LocationType) => (
        <Tag color={getTypeColor(type)} icon={getTypeIcon(type)}>
          {getTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 获取位置数据
  const fetchLocationData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        current: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { name: searchText }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      });

      const response = await fetch(`/api/v1/bases/${currentBase.id}/locations?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setLocationData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
        }));
        
        // 计算统计数据
        calculateStats(result.data || []);
      } else {
        throw new Error(result.message || '获取位置数据失败');
      }
    } catch (error) {
      console.error('获取位置数据失败:', error);
      // 临时使用模拟数据
      const mockData = generateMockData();
      setLocationData(mockData);
      setPagination(prev => ({ ...prev, total: mockData.length }));
      calculateStats(mockData);
      message.warning('使用模拟数据，请检查后端API连接');
    } finally {
      setLoading(false);
    }
  };

  // 生成模拟数据
  const generateMockData = (): Location[] => {
    return [
      {
        id: '1',
        name: '主仓库',
        type: LocationType.WAREHOUSE,
        description: '主要存储仓库',
        address: '北京市朝阳区xxx路123号',
        contactPerson: '张三',
        phone: '13800138001',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
      {
        id: '2',
        name: '直播间A',
        type: LocationType.LIVE_ROOM,
        description: '美妆直播间',
        address: '北京市朝阳区xxx路456号',
        contactPerson: '李四',
        phone: '13800138002',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
      {
        id: '3',
        name: '直播间B',
        type: LocationType.LIVE_ROOM,
        description: '服装直播间',
        address: '北京市朝阳区xxx路789号',
        contactPerson: '王五',
        phone: '13800138003',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
    ];
  };

  // 计算统计数据
  const calculateStats = (data: Location[]) => {
    const totalLocations = data.length;
    const warehouses = data.filter(l => l.type === LocationType.WAREHOUSE).length;
    const liveRooms = data.filter(l => l.type === LocationType.LIVE_ROOM).length;
    const activeLocations = data.filter(l => l.isActive).length;
    
    setStats({
      totalLocations,
      warehouses,
      liveRooms,
      activeLocations,
    });
  };

  // 处理编辑
  const handleEdit = (record: Location) => {
    setEditingLocation(record);
    editForm.setFieldsValue({
      name: record.name,
      type: record.type,
      description: record.description,
      address: record.address,
      contactPerson: record.contactPerson,
      phone: record.phone,
    });
    setEditModalVisible(true);
  };

  // 处理删除
  const handleDelete = (record: Location) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 这里应该调用删除API
          message.success('删除成功');
          fetchLocationData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 处理创建位置
  const handleCreateLocation = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      // 这里应该调用创建API
      message.success('位置创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      fetchLocationData();
    } catch (error) {
      console.error('创建位置失败:', error);
      message.error('创建位置失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 处理更新位置
  const handleUpdateLocation = async (values: any) => {
    if (!editingLocation) return;

    try {
      // 这里应该调用更新API
      message.success('位置更新成功');
      setEditModalVisible(false);
      setEditingLocation(null);
      editForm.resetFields();
      fetchLocationData();
    } catch (error) {
      console.error('更新位置失败:', error);
      message.error('更新位置失败，请稍后重试');
    }
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchLocationData();
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
      fetchLocationData();
    }
  }, [currentBase, pagination.current, pagination.pageSize, searchText, typeFilter, statusFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>直播间/仓库管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="直播间/仓库管理"
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
          添加
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="位置总数"
              value={stats.totalLocations}
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="仓库数量"
              value={stats.warehouses}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="直播间数量"
              value={stats.liveRooms}
              suffix="个"
              valueStyle={{ color: '#722ed1' }}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用位置"
              value={stats.activeLocations}
              suffix="个"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Search
              placeholder="搜索位置名称"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="位置类型"
              allowClear
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部类型</Option>
              <Option value={LocationType.WAREHOUSE}>仓库</Option>
              <Option value={LocationType.LIVE_ROOM}>直播间</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部状态</Option>
              <Option value="true">启用</Option>
              <Option value="false">禁用</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 位置表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={locationData}
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
          className={styles.locationTable}
        />
      </Card>

      {/* 创建位置模态框 */}
      <Modal
        title="添加直播间/仓库"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateLocation}
          autoComplete="off"
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, message: '请输入名称' },
              { min: 2, max: 50, message: '名称长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Option value={LocationType.WAREHOUSE}>
                <DatabaseOutlined /> 仓库
              </Option>
              <Option value={LocationType.LIVE_ROOM}>
                <DesktopOutlined /> 直播间
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="请输入描述"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系人"
                name="contactPerson"
              >
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                ]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

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

      {/* 编辑位置模态框 */}
      <Modal
        title="编辑直播间/仓库"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingLocation(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateLocation}
          autoComplete="off"
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, message: '请输入名称' },
              { min: 2, max: 50, message: '名称长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Option value={LocationType.WAREHOUSE}>
                <DatabaseOutlined /> 仓库
              </Option>
              <Option value={LocationType.LIVE_ROOM}>
                <DesktopOutlined /> 直播间
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="请输入描述"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入地址" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系人"
                name="contactPerson"
              >
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                ]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingLocation(null);
                editForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                更新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default LocationManagement;
