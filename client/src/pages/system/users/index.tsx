import React, { useRef, useState } from 'react';
import {
  PageContainer,
  ProTable,
  ProColumns,
  ActionType,
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormSwitch,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Popconfirm,
  Tag,
  Space,
  Tooltip,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';

// 用户类型定义
interface UserItem {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: { id: string; name: string; description?: string }[];
  bases: { id: number; code: string; name: string; type: string }[];
}

// 角色类型定义
interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

// 统计数据类型
interface UserStats {
  total: number;
  active: number;
  inactive: number;
}

const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, inactive: 0 });

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const result = await request('/api/v1/roles', { method: 'GET' });
      if (result.success) {
        setRoles(result.data || []);
      }
    } catch (error) {
      console.error('获取角色列表失败', error);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const result = await request('/api/v1/users/stats', { method: 'GET' });
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  };

  // 初始化加载
  React.useEffect(() => {
    fetchRoles();
    fetchStats();
  }, []);

  // 获取用户列表
  const fetchUsers = async (params: any) => {
    try {
      const result = await request('/api/v1/users', {
        method: 'GET',
        params: {
          page: params.current,
          pageSize: params.pageSize,
          keyword: params.keyword,
          isActive: params.isActive,
          roleId: params.roleId,
        },
      });

      if (result.success) {
        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      } else {
        message.error(result.message || '获取用户列表失败');
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      message.error('获取用户列表失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 创建用户
  const handleCreate = async (values: any) => {
    try {
      const result = await request('/api/v1/users', {
        method: 'POST',
        data: values,
      });

      if (result.success) {
        message.success('创建用户成功');
        setCreateModalVisible(false);
        actionRef.current?.reload();
        fetchStats();
        return true;
      } else {
        message.error(result.message || '创建用户失败');
        return false;
      }
    } catch (error) {
      message.error('创建用户失败');
      return false;
    }
  };

  // 更新用户
  const handleUpdate = async (values: any) => {
    if (!currentUser) return false;

    try {
      const result = await request(`/api/v1/users/${currentUser.id}`, {
        method: 'PUT',
        data: values,
      });

      if (result.success) {
        message.success('更新用户成功');
        setEditModalVisible(false);
        setCurrentUser(null);
        actionRef.current?.reload();
        fetchStats();
        return true;
      } else {
        message.error(result.message || '更新用户失败');
        return false;
      }
    } catch (error) {
      message.error('更新用户失败');
      return false;
    }
  };

  // 删除用户
  const handleDelete = async (id: string) => {
    try {
      const result = await request(`/api/v1/users/${id}`, {
        method: 'DELETE',
      });

      if (result.success) {
        message.success('删除用户成功');
        actionRef.current?.reload();
        fetchStats();
      } else {
        message.error(result.message || '删除用户失败');
      }
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  // 重置密码
  const handleResetPassword = async (values: any) => {
    if (!currentUser) return false;

    try {
      const result = await request(`/api/v1/users/${currentUser.id}/reset-password`, {
        method: 'POST',
        data: { newPassword: values.newPassword },
      });

      if (result.success) {
        message.success('重置密码成功');
        setResetPasswordModalVisible(false);
        setCurrentUser(null);
        return true;
      } else {
        message.error(result.message || '重置密码失败');
        return false;
      }
    } catch (error) {
      message.error('重置密码失败');
      return false;
    }
  };

  // 角色名称映射
  const getRoleLabel = (roleName: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      ADMIN: { label: '系统管理员', color: 'red' },
      BASE_MANAGER: { label: '基地管理员', color: 'blue' },
      POINT_OWNER: { label: '点位老板', color: 'green' },
      CUSTOMER_SERVICE: { label: '客服', color: 'orange' },
      WAREHOUSE_KEEPER: { label: '仓管', color: 'purple' },
    };
    return roleMap[roleName] || { label: roleName, color: 'default' };
  };

  // 表格列定义
  const columns: ProColumns<UserItem>[] = [
    {
      title: '用户名',
      dataIndex: 'username',
      width: 120,
      fixed: 'left',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      search: false,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 180,
      search: false,
      ellipsis: true,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      width: 200,
      search: false,
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.roles.map((role) => {
            const { label, color } = getRoleLabel(role.name);
            return (
              <Tag key={role.id} color={color}>
                {label}
              </Tag>
            );
          })}
          {record.roles.length === 0 && <Tag>无角色</Tag>}
        </Space>
      ),
    },
    {
      title: '关联基地',
      dataIndex: 'bases',
      width: 200,
      search: false,
      render: (_, record) => (
        <Space size={[0, 4]} wrap>
          {record.bases.slice(0, 2).map((base) => (
            <Tag key={base.id}>{base.name}</Tag>
          ))}
          {record.bases.length > 2 && (
            <Tooltip title={record.bases.map((b) => b.name).join(', ')}>
              <Tag>+{record.bases.length - 2}</Tag>
            </Tooltip>
          )}
          {record.bases.length === 0 && <Tag>无关联</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Error' },
      },
      render: (_, record) =>
        record.isActive ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            启用
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            禁用
          </Tag>
        ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 160,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setCurrentUser(record);
            setEditModalVisible(true);
          }}
        >
          编辑
        </Button>,
        <Button
          key="resetPassword"
          type="link"
          size="small"
          icon={<KeyOutlined />}
          onClick={() => {
            setCurrentUser(record);
            setResetPasswordModalVisible(true);
          }}
        >
          重置密码
        </Button>,
        record.username !== 'admin' && (
          <Popconfirm
            key="delete"
            title="确定要删除该用户吗？"
            description="删除后用户将无法登录系统"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];

  return (
    <PageContainer header={{ title: '用户管理' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats.total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="启用用户"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="禁用用户"
              value={stats.inactive}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户列表 */}
      <ProTable<UserItem>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchUsers}
        scroll={{ x: 1400 }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建用户
          </Button>,
        ]}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />

      {/* 创建用户弹窗 */}
      <ModalForm
        title="新建用户"
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        onFinish={handleCreate}
        modalProps={{ destroyOnClose: true }}
        width={500}
      >
        <ProFormText
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          fieldProps={{ autoComplete: 'off' }}
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
          ]}
        />
        <ProFormText.Password
          name="password"
          label="密码"
          placeholder="请输入密码"
          fieldProps={{ autoComplete: 'new-password' }}
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
        />
        <ProFormText
          name="name"
          label="姓名"
          placeholder="请输入姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        />
        <ProFormText
          name="phone"
          label="手机号"
          placeholder="请输入手机号"
        />
        <ProFormText
          name="email"
          label="邮箱"
          placeholder="请输入邮箱"
          rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
        />
        <ProFormSelect
          name="roleIds"
          label="角色"
          mode="multiple"
          placeholder="请选择角色"
          options={roles.map((role) => ({
            label: getRoleLabel(role.name).label,
            value: role.id,
          }))}
        />
      </ModalForm>

      {/* 编辑用户弹窗 */}
      <ModalForm
        title="编辑用户"
        open={editModalVisible}
        onOpenChange={(visible) => {
          setEditModalVisible(visible);
          if (!visible) setCurrentUser(null);
        }}
        onFinish={handleUpdate}
        modalProps={{ destroyOnClose: true }}
        width={500}
        initialValues={
          currentUser
            ? {
                name: currentUser.name,
                phone: currentUser.phone,
                email: currentUser.email,
                isActive: currentUser.isActive,
                roleIds: currentUser.roles.map((r) => r.id),
              }
            : {}
        }
      >
        <ProFormText
          name="name"
          label="姓名"
          placeholder="请输入姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        />
        <ProFormText
          name="phone"
          label="手机号"
          placeholder="请输入手机号"
        />
        <ProFormText
          name="email"
          label="邮箱"
          placeholder="请输入邮箱"
          rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
        />
        <ProFormSelect
          name="roleIds"
          label="角色"
          mode="multiple"
          placeholder="请选择角色"
          options={roles.map((role) => ({
            label: getRoleLabel(role.name).label,
            value: role.id,
          }))}
        />
        <ProFormSwitch name="isActive" label="启用状态" />
      </ModalForm>

      {/* 重置密码弹窗 */}
      <ModalForm
        title={`重置密码 - ${currentUser?.name || ''}`}
        open={resetPasswordModalVisible}
        onOpenChange={(visible) => {
          setResetPasswordModalVisible(visible);
          if (!visible) setCurrentUser(null);
        }}
        onFinish={handleResetPassword}
        modalProps={{ destroyOnClose: true }}
        width={400}
      >
        <ProFormText.Password
          name="newPassword"
          label="新密码"
          placeholder="请输入新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
        />
        <ProFormText.Password
          name="confirmPassword"
          label="确认密码"
          placeholder="请再次输入新密码"
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default UsersPage;
