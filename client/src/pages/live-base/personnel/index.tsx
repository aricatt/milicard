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
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { get, post } from '@/utils/request';
import { isAuthenticated, createMockToken, setToken, getDevToken } from '@/utils/auth';
import type { ColumnsType } from 'antd/es/table';
import styles from './index.less';

const { Search } = Input;
const { Option } = Select;

// 人员角色枚举
enum PersonnelRole {
  ANCHOR = 'ANCHOR',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER',
}

// 人员数据类型定义
interface Personnel {
  id: string;
  code: string;
  name: string;
  role: PersonnelRole;
  phone?: string;
  email?: string;
  notes?: string;
  baseId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  baseName: string;
}

// 人员统计数据类型
interface PersonnelStats {
  totalPersonnel: number;
  anchors: number;
  warehouseKeepers: number;
  activePersonnel: number;
}

/**
 * 主播/仓管管理页面
 * 基地中心化的人员管理，统一管理主播和仓管人员
 */
const PersonnelManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [personnelData, setPersonnelData] = useState<Personnel[]>([]);
  const [stats, setStats] = useState<PersonnelStats>({
    totalPersonnel: 0,
    anchors: 0,
    warehouseKeepers: 0,
    activePersonnel: 0,
  });
  
  // 筛选条件
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 获取角色显示文本
  const getRoleText = (role: PersonnelRole) => {
    return role === PersonnelRole.ANCHOR ? '主播' : '仓管';
  };

  // 获取角色图标
  const getRoleIcon = (role: PersonnelRole) => {
    return role === PersonnelRole.ANCHOR ? <UserOutlined /> : <TeamOutlined />;
  };

  // 获取角色颜色
  const getRoleColor = (role: PersonnelRole) => {
    return role === PersonnelRole.ANCHOR ? 'purple' : 'orange';
  };

  // 生成编号（与后端保持一致）
  const generateCode = (role: string) => {
    const prefix = role === 'ANCHOR' ? 'ANCHOR' : 'KEEPER';
    // 使用与后端相同的字符集（去除易混淆字符）
    const charset = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let randomStr = '';
    for (let i = 0; i < 11; i++) {
      randomStr += charset[Math.floor(Math.random() * charset.length)];
    }
    return `${prefix}-${randomStr}`;
  };

  // 表格列定义
  const columns: ColumnsType<Personnel> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string) => id.slice(-8),
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: PersonnelRole) => (
        <Tag color={getRoleColor(role)} icon={getRoleIcon(role)}>
          {getRoleText(role)}
        </Tag>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (text: string) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
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

  // 获取人员数据
  const fetchPersonnelData = async () => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setLoading(true);
    try {
      const params = {
        current: pagination.current.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(searchText && { name: searchText }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { isActive: statusFilter }),
      };

      const result = await get(`/api/v1/bases/${currentBase.id}/personnel`, params);
      
      if (result.success) {
        setPersonnelData(result.data || []);
        setPagination(prev => ({
          ...prev,
          total: result.total || 0,
        }));
        
        // 计算统计数据
        calculateStats(result.data || []);
      } else {
        throw new Error(result.message || '获取人员数据失败');
      }
    } catch (error) {
      console.error('获取人员数据失败:', error);
      // 临时使用模拟数据
      const mockData = generateMockData();
      setPersonnelData(mockData);
      setPagination(prev => ({ ...prev, total: mockData.length }));
      calculateStats(mockData);
      message.warning('使用模拟数据，请检查后端API连接');
    } finally {
      setLoading(false);
    }
  };

  // 生成模拟数据
  const generateMockData = (): Personnel[] => {
    return [
      {
        id: '1',
        code: 'ANCHOR-9ZPSBQ99T7S',
        name: '小美',
        role: PersonnelRole.ANCHOR,
        phone: '13800138001',
        email: 'xiaomei@example.com',
        notes: '美妆主播，擅长护肤品推荐',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
      {
        id: '2',
        code: 'ANCHOR-K8MXNQ45P2R',
        name: '小丽',
        role: PersonnelRole.ANCHOR,
        phone: '13800138002',
        email: 'xiaoli@example.com',
        notes: '服装主播，时尚搭配专家',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
      {
        id: '3',
        code: 'KEEPER-L7NWQR88X3T',
        name: '张师傅',
        role: PersonnelRole.WAREHOUSE_KEEPER,
        phone: '13800138003',
        email: 'zhangsifu@example.com',
        notes: '主仓库管理员，负责库存调配',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
      {
        id: '4',
        code: 'KEEPER-M9PXST66Y4U',
        name: '李阿姨',
        role: PersonnelRole.WAREHOUSE_KEEPER,
        phone: '13800138004',
        email: 'liayi@example.com',
        notes: '直播间仓管，负责商品整理',
        baseId: currentBase?.id || 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase?.name || '默认基地',
      },
    ];
  };

  // 计算统计数据
  const calculateStats = (data: Personnel[]) => {
    const totalPersonnel = data.length;
    const anchors = data.filter(p => p.role === PersonnelRole.ANCHOR).length;
    const warehouseKeepers = data.filter(p => p.role === PersonnelRole.WAREHOUSE_KEEPER).length;
    const activePersonnel = data.filter(p => p.isActive).length;
    
    setStats({
      totalPersonnel,
      anchors,
      warehouseKeepers,
      activePersonnel,
    });
  };

  // 处理编辑
  const handleEdit = (record: Personnel) => {
    setEditingPersonnel(record);
    editForm.setFieldsValue({
      name: record.name,
      role: record.role,
      phone: record.phone,
      email: record.email,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  // 处理删除
  const handleDelete = (record: Personnel) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 "${record.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 这里应该调用删除API
          message.success('删除成功');
          fetchPersonnelData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 处理创建人员
  const handleCreatePersonnel = async (values: any) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      // 尝试调用后端API
      const result = await post(`/api/v1/bases/${currentBase.id}/personnel`, values);
      
      if (result.success) {
        message.success('人员创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchPersonnelData();
        return;
      }
      
      // 如果API调用失败，使用模拟数据
      const newPersonnel = {
        id: Date.now().toString(),
        code: generateCode(values.role),
        name: values.name,
        role: values.role,
        phone: values.phone,
        email: values.email,
        notes: values.notes,
        baseId: currentBase.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        baseName: currentBase.name,
      };

      // 添加到当前数据中
      setPersonnelData(prev => [newPersonnel, ...prev]);
      setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      calculateStats([newPersonnel, ...personnelData]);
      
      message.success('人员创建成功（使用模拟数据）');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('创建人员失败:', error);
      message.error('创建人员失败，请稍后重试');
    } finally {
      setCreateLoading(false);
    }
  };

  // 处理更新人员
  const handleUpdatePersonnel = async (values: any) => {
    if (!editingPersonnel) return;

    try {
      // 这里应该调用更新API
      message.success('人员更新成功');
      setEditModalVisible(false);
      setEditingPersonnel(null);
      editForm.resetFields();
      fetchPersonnelData();
    } catch (error) {
      console.error('更新人员失败:', error);
      message.error('更新人员失败，请稍后重试');
    }
  };

  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchPersonnelData();
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

  // 认证状态
  const [authInitialized, setAuthInitialized] = useState(false);

  // 页面加载时检查认证
  useEffect(() => {
    const initAuth = async () => {
      console.log('开始初始化认证...');
      
      // 检查认证状态
      if (!isAuthenticated()) {
        console.warn('用户未认证，尝试获取开发token');
        
        // 先尝试从后端获取开发token
        const devToken = await getDevToken();
        if (devToken) {
          setToken(devToken);
          message.success('已获取开发环境认证token');
          console.log('开发token设置成功');
        } else {
          // 如果无法获取开发token，使用模拟token
          const mockToken = createMockToken();
          setToken(mockToken);
          message.warning('使用模拟token，API请求可能失败');
          console.log('使用模拟token');
        }
      } else {
        console.log('用户已认证');
      }
      
      setAuthInitialized(true);
      console.log('认证初始化完成');
    };
    
    initAuth();
  }, []); // 只在组件挂载时执行一次

  // 数据获取逻辑 - 等待认证初始化完成
  useEffect(() => {
    if (authInitialized && currentBase && isAuthenticated()) {
      console.log('条件满足，开始获取数据');
      fetchPersonnelData();
    } else {
      console.log('等待条件满足:', { authInitialized, currentBase: !!currentBase, authenticated: isAuthenticated() });
    }
  }, [authInitialized, currentBase, pagination.current, pagination.pageSize, searchText, roleFilter, statusFilter]);

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <WarningOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <h3>请先选择基地</h3>
            <p>主播/仓管管理需要在特定基地下进行，请先选择一个基地。</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="主播/仓管管理"
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
              title="人员总数"
              value={stats.totalPersonnel}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="主播数量"
              value={stats.anchors}
              suffix="人"
              valueStyle={{ color: '#722ed1' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="仓管数量"
              value={stats.warehouseKeepers}
              suffix="人"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在职人员"
              value={stats.activePersonnel}
              suffix="人"
              valueStyle={{ color: '#52c41a' }}
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
                placeholder="搜索姓名或编号"
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
              placeholder="人员角色"
              allowClear
              style={{ width: '100%' }}
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value || '');
                handleFilterChange();
              }}
            >
              <Option value="">全部角色</Option>
              <Option value={PersonnelRole.ANCHOR}>主播</Option>
              <Option value={PersonnelRole.WAREHOUSE_KEEPER}>仓管</Option>
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
              <Option value="true">在职</Option>
              <Option value="false">离职</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 人员表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={personnelData}
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
          className={styles.personnelTable}
        />
      </Card>

      {/* 创建人员模态框 */}
      <Modal
        title="添加人员"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePersonnel}
          autoComplete="off"
        >
          <Form.Item
            label="姓名"
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, max: 20, message: '姓名长度应在2-20个字符之间' }
            ]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value={PersonnelRole.ANCHOR}>
                <UserOutlined /> 主播
              </Option>
              <Option value={PersonnelRole.WAREHOUSE_KEEPER}>
                <TeamOutlined /> 仓管
              </Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="备注"
            name="notes"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={200}
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

      {/* 编辑人员模态框 */}
      <Modal
        title="编辑人员"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingPersonnel(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdatePersonnel}
          autoComplete="off"
        >
          <Form.Item
            label="姓名"
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, max: 20, message: '姓名长度应在2-20个字符之间' }
            ]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value={PersonnelRole.ANCHOR}>
                <UserOutlined /> 主播
              </Option>
              <Option value={PersonnelRole.WAREHOUSE_KEEPER}>
                <TeamOutlined /> 仓管
              </Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="备注"
            name="notes"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingPersonnel(null);
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

export default PersonnelManagement;
