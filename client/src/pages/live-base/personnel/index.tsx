import React, { useRef, useState } from 'react';
import { 
  Card, 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  Select,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';

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
 * 主播/仓管管理页面 - ProTable 版本
 * 基地中心化的人员管理，统一管理主播和仓管人员
 */
const PersonnelManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<PersonnelStats>({
    totalPersonnel: 0,
    anchors: 0,
    warehouseKeepers: 0,
    activePersonnel: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取人员数据
   */
  const fetchPersonnelData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 20, name, role, isActive } = params;
      
      // 构建查询参数
      const queryParams = new URLSearchParams({
        current: String(current),
        pageSize: String(pageSize),
      });
      
      if (name) queryParams.append('name', name);
      if (role) queryParams.append('role', role);
      if (isActive !== undefined) queryParams.append('isActive', String(isActive));

      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/personnel?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      } else {
        message.error(result.message || '获取人员数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取人员数据失败:', error);
      message.error('获取人员数据失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Personnel[]) => {
    const newStats: PersonnelStats = {
      totalPersonnel: data.length,
      anchors: data.filter(p => p.role === PersonnelRole.ANCHOR).length,
      warehouseKeepers: data.filter(p => p.role === PersonnelRole.WAREHOUSE_KEEPER).length,
      activePersonnel: data.filter(p => p.isActive).length,
    };
    setStats(newStats);
  };

  /**
   * 创建人员
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`/api/v1/bases/${currentBase.id}/personnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建人员失败:', error);
      message.error('创建人员失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新人员
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingPersonnel) {
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/personnel/${editingPersonnel.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(values),
        }
      );

      const result = await response.json();

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingPersonnel(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新人员失败:', error);
      message.error('更新人员失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除人员
   */
  const handleDelete = async (record: Personnel) => {
    if (!currentBase) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/bases/${currentBase.id}/personnel/${record.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除人员失败:', error);
      message.error('删除人员失败');
    }
  };

  /**
   * 打开编辑模态框
   */
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

  /**
   * 列定义
   */
  const columns: ProColumns<Personnel>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
      hideInTable: false,
      render: (id: any) => String(id).slice(-8),
    },
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      hideInSearch: true,
      render: (text: string) => <code>{text}</code>,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      valueType: 'select',
      valueEnum: {
        ANCHOR: { text: '主播', status: 'Processing' },
        WAREHOUSE_KEEPER: { text: '仓管', status: 'Default' },
      },
      render: (_, record) => (
        <Tag 
          color={record.role === PersonnelRole.ANCHOR ? 'purple' : 'orange'}
          icon={record.role === PersonnelRole.ANCHOR ? <UserOutlined /> : <TeamOutlined />}
        >
          {record.role === PersonnelRole.ANCHOR ? '主播' : '仓管'}
        </Tag>
      ),
      hideInSearch: false,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      hideInSearch: true,
      render: (text: string) => text || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: '在职', status: 'Success' },
        false: { text: '离职', status: 'Error' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? '在职' : '离职'}
        </Tag>
      ),
      hideInSearch: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
      render: (_, record) => {
        if (!record.createdAt) return '-';
        try {
          const date = new Date(record.createdAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      valueType: 'dateTime',
      hideInSearch: true,
      hideInTable: false,
      render: (_, record) => {
        if (!record.updatedAt) return '-';
        try {
          const date = new Date(record.updatedAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      valueType: 'option',
      hideInSetting: true,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description={`确定要删除"${record.name}"吗？`}
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  if (!currentBase) {
    return (
      <PageContainer>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>请先选择一个基地</p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="人员总数">
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalPersonnel}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="主播">
          <Space>
            <UserOutlined style={{ color: '#722ed1' }} />
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.anchors}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.anchors / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="仓管">
          <Space>
            <TeamOutlined style={{ color: '#fa8c16' }} />
            <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{stats.warehouseKeepers}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.warehouseKeepers / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="在职人员">
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activePersonnel}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? ((stats.activePersonnel / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="离职人员">
          <Space>
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.totalPersonnel - stats.activePersonnel}</span>
            <span style={{ color: '#999' }}>({stats.totalPersonnel > 0 ? (((stats.totalPersonnel - stats.activePersonnel) / stats.totalPersonnel) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '主播/仓管管理',
        subTitle: `当前基地：${currentBase.name}`,
      }}
    >
      {/* ProTable */}
      <ProTable<Personnel>
        columns={columns}
        actionRef={actionRef}
        request={fetchPersonnelData}
        rowKey="id"
        
        // 列状态配置 - 持久化到 localStorage
        columnsState={{
          persistenceKey: 'personnel-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            // 默认隐藏的列
            id: { show: false },
            email: { show: false },
            notes: { show: false },
            updatedAt: { show: false },
          },
        }}
        
        // 搜索表单配置
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          optionRender: (searchConfig, formProps, dom) => [
            ...dom.reverse(),
          ],
        }}
        
        // 工具栏配置
        options={{
          setting: {
            listsHeight: 400,
            draggable: true,
          },
          reload: () => {
            actionRef.current?.reload();
          },
          density: true,
          fullScreen: true,
        }}
        
        // 表格配置
        scroll={{ x: 1400 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        // 工具栏按钮
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            添加人员
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>人员列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.totalPersonnel} 人)
            </span>
            <Popover
              content={statsContent}
              title="统计详情"
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                详情
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 创建人员模态框 */}
      <Modal
        title="添加人员"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
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

          <Form.Item
            label="联系电话"
            name="phone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入正确的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

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
        </Form>
      </Modal>

      {/* 编辑人员模态框 */}
      <Modal
        title="编辑人员"
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingPersonnel(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
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

          <Form.Item
            label="联系电话"
            name="phone"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入正确的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

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
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default PersonnelManagement;
