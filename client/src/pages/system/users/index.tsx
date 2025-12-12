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
  Popover,
  Descriptions,
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
  InfoCircleOutlined,
} from '@ant-design/icons';
import { request, useModel } from '@umijs/max';

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
  roles: { id: string; name: string; description?: string; level?: number }[];
  bases: { id: number; code: string; name: string; type: string }[];
  highestRoleLevel?: number; // 用户最高角色层级
}

// 角色类型定义
interface RoleItem {
  id: string;
  name: string;
  description?: string;
  level?: number;
}

// 基地类型定义
interface BaseItem {
  id: number;
  code: string;
  name: string;
  type: string;
}

// 统计数据类型
interface UserStats {
  total: number;
  active: number;
  inactive: number;
}

const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const currentLoginUser = initialState?.currentUser;
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [availableBases, setAvailableBases] = useState<BaseItem[]>([]);
  const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, inactive: 0 });
  const [currentUserLevel, setCurrentUserLevel] = useState<number>(999); // 当前登录用户的角色层级
  
  // 计算当前登录用户的最高角色层级
  React.useEffect(() => {
    if (currentLoginUser?.roles) {
      const levels = currentLoginUser.roles
        .map((r: any) => r.level ?? 999)
        .filter((l: number) => l !== undefined);
      const minLevel = levels.length > 0 ? Math.min(...levels) : 999;
      setCurrentUserLevel(minLevel);
    }
  }, [currentLoginUser]);

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

  // 获取可用基地列表（当前用户有权限的基地）
  const fetchAvailableBases = async () => {
    try {
      const result = await request('/api/v1/live-base/bases', { 
        method: 'GET',
        params: { pageSize: 100 }, // 获取所有可用基地
      });
      if (result.success) {
        setAvailableBases(result.data || []);
      }
    } catch (error) {
      console.error('获取可用基地列表失败', error);
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
    fetchAvailableBases();
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
  const getRoleLabel = (roleName: string, description?: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      SUPER_ADMIN: { label: '超级管理员', color: 'red' },
      ADMIN: { label: '系统管理员', color: 'volcano' },
      MANAGER: { label: '经理', color: 'blue' },
      OPERATOR: { label: '操作员', color: 'green' },
      VIEWER: { label: '查看者', color: 'cyan' },
      BASE_MANAGER: { label: '基地管理员', color: 'blue' },
      POINT_OWNER: { label: '点位老板', color: 'green' },
      CUSTOMER_SERVICE: { label: '客服', color: 'orange' },
      WAREHOUSE_KEEPER: { label: '仓管', color: 'purple' },
      ANCHOR: { label: '主播', color: 'cyan' },
    };
    // 如果有映射则使用映射，否则使用描述或角色名
    return roleMap[roleName] || { label: description || roleName, color: 'default' };
  };

  // 获取角色下拉选项显示文本（格式：角色标识 - 角色名称）
  const getRoleOptionLabel = (role: RoleItem) => {
    const { label } = getRoleLabel(role.name, role.description);
    return `${role.name} - ${label}`;
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
            const { label, color } = getRoleLabel(role.name, role.description);
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
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        // 计算目标用户的最高角色层级（level 越小权限越高）
        const targetUserLevel = record.roles.length > 0
          ? Math.min(...record.roles.map(r => r.level ?? 999))
          : 999;
        
        // 判断是否可以操作该用户
        // 只能操作层级比自己低的用户（targetUserLevel > currentUserLevel）
        // Level 0 (SUPER_ADMIN) 可以操作 Level 1+ 的用户
        // Level 1 (ADMIN) 可以操作 Level 2+ 的用户
        const canOperate = targetUserLevel > currentUserLevel;
        
        // 不能操作自己
        const isSelf = record.id === currentLoginUser?.id;
        
        // 最终判断：可以操作且不是自己
        const showActions = canOperate && !isSelf;
        
        if (!showActions) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        
        return [
          <Tooltip key="edit" title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setCurrentUser(record);
                setEditModalVisible(true);
              }}
            />
          </Tooltip>,
          <Tooltip key="resetPassword" title="重置密码">
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setCurrentUser(record);
                setResetPasswordModalVisible(true);
              }}
            />
          </Tooltip>,
          record.username !== 'admin' && (
            <Popconfirm
              key="delete"
              title="确定要删除该用户吗？"
              description="删除后用户将无法登录系统"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          ),
        ];
      },
    },
  ];

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 280 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="用户总数">
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.total}</span>
            <span style={{ color: '#999' }}>人</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="启用用户">
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.active}</span>
            <span style={{ color: '#999' }}>
              ({stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%)
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="禁用用户">
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.inactive}</span>
            <span style={{ color: '#999' }}>
              ({stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}%)
            </span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
      {/* 用户列表 */}
      <ProTable<UserItem>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchUsers}
        scroll={{ x: 1400 }}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        headerTitle={
          <Space>
            <span>用户列表</span>
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
        modalProps={{ destroyOnHidden: true }}
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
            label: getRoleOptionLabel(role),
            value: role.id,
          }))}
        />
        <ProFormSelect
          name="baseIds"
          label="关联基地"
          mode="multiple"
          placeholder="请选择关联基地"
          initialValue={[]}
          options={availableBases.map((base) => ({
            label: `${base.name} (${base.code})`,
            value: base.id,
          }))}
          extra="用户只能访问关联的基地数据"
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
        modalProps={{ destroyOnHidden: true }}
        width={500}
        initialValues={
          currentUser
            ? {
                name: currentUser.name,
                phone: currentUser.phone,
                email: currentUser.email,
                isActive: currentUser.isActive,
                roleIds: currentUser.roles.map((r) => r.id),
                baseIds: currentUser.bases.map((b) => b.id),
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
            label: getRoleOptionLabel(role),
            value: role.id,
          }))}
        />
        <ProFormSelect
          name="baseIds"
          label="关联基地"
          mode="multiple"
          placeholder="请选择关联基地"
          options={availableBases.map((base) => ({
            label: `${base.name} (${base.code})`,
            value: base.id,
          }))}
          extra="用户只能访问关联的基地数据"
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
        modalProps={{ destroyOnHidden: true }}
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
