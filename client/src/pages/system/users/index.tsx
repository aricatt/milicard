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
  ProFormDependency,
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
import { request, useModel, useIntl } from '@umijs/max';

// 用户类型定义
interface UserItem {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  hasGlobalBaseAccess?: boolean; // 全局基地访问权限
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
  const intl = useIntl();
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
      console.error('Failed to fetch roles', error);
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
      console.error('Failed to fetch available bases', error);
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
      console.error('Failed to fetch stats', error);
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
        message.error(result.message || intl.formatMessage({ id: 'users.message.fetchFailed' }));
        return { data: [], success: false, total: 0 };
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'users.message.fetchFailed' }));
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
        message.success(intl.formatMessage({ id: 'users.message.createSuccess' }));
        setCreateModalVisible(false);
        actionRef.current?.reload();
        fetchStats();
        return true;
      } else {
        message.error(result.message || intl.formatMessage({ id: 'users.message.createFailed' }));
        return false;
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'users.message.createFailed' }));
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
        message.success(intl.formatMessage({ id: 'users.message.updateSuccess' }));
        setEditModalVisible(false);
        setCurrentUser(null);
        actionRef.current?.reload();
        fetchStats();
        return true;
      } else {
        message.error(result.message || intl.formatMessage({ id: 'users.message.updateFailed' }));
        return false;
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'users.message.updateFailed' }));
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
        message.success(intl.formatMessage({ id: 'users.message.deleteSuccess' }));
        actionRef.current?.reload();
        fetchStats();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'users.message.deleteFailed' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'users.message.deleteFailed' }));
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
        message.success(intl.formatMessage({ id: 'users.message.resetPasswordSuccess' }));
        setResetPasswordModalVisible(false);
        setCurrentUser(null);
        return true;
      } else {
        message.error(result.message || intl.formatMessage({ id: 'users.message.resetPasswordFailed' }));
        return false;
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'users.message.resetPasswordFailed' }));
      return false;
    }
  };

  // 角色名称映射（颜色）
  const getRoleLabel = (roleName: string, description?: string) => {
    const roleColorMap: Record<string, string> = {
      SUPER_ADMIN: 'red',
      ADMIN: 'volcano',
      MANAGER: 'blue',
      OPERATOR: 'green',
      VIEWER: 'cyan',
      BASE_MANAGER: 'blue',
      POINT_OWNER: 'green',
      CUSTOMER_SERVICE: 'orange',
      WAREHOUSE_KEEPER: 'purple',
      ANCHOR: 'cyan',
    };
    // 优先使用描述（友好名称），如果没有描述则使用角色标识
    return { 
      label: description || roleName, 
      color: roleColorMap[roleName] || 'default' 
    };
  };

  // 获取角色下拉选项显示文本（格式：角色标识 - 角色名称）
  const getRoleOptionLabel = (role: RoleItem) => {
    const { label } = getRoleLabel(role.name, role.description);
    return `${role.name} - ${label}`;
  };

  // 表格列定义
  const columns: ProColumns<UserItem>[] = [
    {
      title: intl.formatMessage({ id: 'users.column.username' }),
      dataIndex: 'username',
      width: 120,
      fixed: 'left',
    },
    {
      title: intl.formatMessage({ id: 'users.column.name' }),
      dataIndex: 'name',
      width: 100,
    },
    {
      title: intl.formatMessage({ id: 'users.column.phone' }),
      dataIndex: 'phone',
      width: 130,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'users.column.email' }),
      dataIndex: 'email',
      width: 180,
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'users.column.roles' }),
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
          {record.roles.length === 0 && <Tag>{intl.formatMessage({ id: 'users.noRoles' })}</Tag>}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'users.column.bases' }),
      dataIndex: 'bases',
      width: 200,
      search: false,
      render: (_, record) => {
        // 如果有全局基地访问权限，显示特殊标签
        if (record.hasGlobalBaseAccess) {
          return (
            <Tag color="gold" icon={<CheckCircleOutlined />}>
              {intl.formatMessage({ id: 'users.globalAccess' })}
            </Tag>
          );
        }
        // 否则显示关联的基地列表
        return (
          <Space size={[0, 4]} wrap>
            {record.bases.slice(0, 2).map((base) => (
              <Tag key={base.id}>{base.name}</Tag>
            ))}
            {record.bases.length > 2 && (
              <Tooltip title={record.bases.map((b) => b.name).join(', ')}>
                <Tag>+{record.bases.length - 2}</Tag>
              </Tooltip>
            )}
            {record.bases.length === 0 && <Tag>{intl.formatMessage({ id: 'users.noBases' })}</Tag>}
          </Space>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'users.column.status' }),
      dataIndex: 'isActive',
      width: 80,
      valueType: 'select',
      valueEnum: {
        true: { text: intl.formatMessage({ id: 'status.enabled' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'status.disabled' }), status: 'Error' },
      },
      render: (_, record) =>
        record.isActive ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {intl.formatMessage({ id: 'status.enabled' })}
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            {intl.formatMessage({ id: 'status.disabled' })}
          </Tag>
        ),
    },
    {
      title: intl.formatMessage({ id: 'users.column.lastLoginAt' }),
      dataIndex: 'lastLoginAt',
      width: 160,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: intl.formatMessage({ id: 'users.column.createdAt' }),
      dataIndex: 'createdAt',
      width: 160,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        // 计算目标用户的最高角色层级（level 越小权限越高）
        const targetUserLevel = record.roles.length > 0
          ? Math.min(...record.roles.map(r => r.level ?? 999))
          : 999;
        
        // 判断是否是自己
        const isSelf = record.id === currentLoginUser?.id;
        
        // 判断是否可以操作该用户（高级可以操作低级）
        // 只能操作层级比自己低的用户（targetUserLevel > currentUserLevel）
        const canOperateOthers = targetUserLevel > currentUserLevel;
        
        // 可以编辑：自己 或 层级比自己低的用户
        const canEdit = isSelf || canOperateOthers;
        
        // 可以重置密码：自己 或 层级比自己低的用户
        const canResetPassword = isSelf || canOperateOthers;
        
        // 可以删除：只能删除层级比自己低的用户（不能删除自己，不能删除admin）
        const canDelete = canOperateOthers && !isSelf && record.username !== 'admin';
        
        if (!canEdit && !canResetPassword && !canDelete) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        
        return [
          canEdit && (
            <Tooltip key="edit" title={isSelf ? intl.formatMessage({ id: 'users.editProfile' }) : intl.formatMessage({ id: 'button.edit' })}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setCurrentUser(record);
                  setEditModalVisible(true);
                }}
              />
            </Tooltip>
          ),
          canResetPassword && (
            <Tooltip key="resetPassword" title={isSelf ? intl.formatMessage({ id: 'users.changePassword' }) : intl.formatMessage({ id: 'users.resetPassword' })}>
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => {
                  setCurrentUser(record);
                  setResetPasswordModalVisible(true);
                }}
              />
            </Tooltip>
          ),
          canDelete && (
            <Popconfirm
              key="delete"
              title={intl.formatMessage({ id: 'users.deleteConfirm' })}
              description={intl.formatMessage({ id: 'users.deleteDescription' })}
              onConfirm={() => handleDelete(record.id)}
              okText={intl.formatMessage({ id: 'button.confirm' })}
              cancelText={intl.formatMessage({ id: 'button.cancel' })}
            >
              <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
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
        <Descriptions.Item label={intl.formatMessage({ id: 'users.stats.total' })}>
          <Space>
            <TeamOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.total}</span>
            <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'users.stats.unit' })}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'users.stats.active' })}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.active}</span>
            <span style={{ color: '#999' }}>
              ({stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%)
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'users.stats.inactive' })}>
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
            <span>{intl.formatMessage({ id: 'users.title' })}</span>
            <Popover
              content={statsContent}
              title={intl.formatMessage({ id: 'users.statsDetail' })}
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                {intl.formatMessage({ id: 'button.detail' })}
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
            {intl.formatMessage({ id: 'users.add' })}
          </Button>,
        ]}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
      />

      {/* 创建用户弹窗 */}
      <ModalForm
        title={intl.formatMessage({ id: 'users.add' })}
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        onFinish={handleCreate}
        modalProps={{ destroyOnHidden: true }}
        width={500}
      >
        <ProFormText
          name="username"
          label={intl.formatMessage({ id: 'users.form.username' })}
          placeholder={intl.formatMessage({ id: 'users.form.usernamePlaceholder' })}
          fieldProps={{ autoComplete: 'off' }}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'users.form.usernameRequired' }) },
            { min: 3, message: intl.formatMessage({ id: 'users.form.usernameMinLength' }) },
            { pattern: /^[a-zA-Z0-9_]+$/, message: intl.formatMessage({ id: 'users.form.usernamePattern' }) },
          ]}
        />
        <ProFormText.Password
          name="password"
          label={intl.formatMessage({ id: 'users.form.password' })}
          placeholder={intl.formatMessage({ id: 'users.form.passwordPlaceholder' })}
          fieldProps={{ autoComplete: 'new-password' }}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'users.form.passwordRequired' }) },
            { min: 6, message: intl.formatMessage({ id: 'users.form.passwordMinLength' }) },
          ]}
        />
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'users.form.name' })}
          placeholder={intl.formatMessage({ id: 'users.form.namePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'users.form.nameRequired' }) }]}
        />
        <ProFormText
          name="phone"
          label={intl.formatMessage({ id: 'users.form.phone' })}
          placeholder={intl.formatMessage({ id: 'users.form.phonePlaceholder' })}
        />
        <ProFormText
          name="email"
          label={intl.formatMessage({ id: 'users.form.email' })}
          placeholder={intl.formatMessage({ id: 'users.form.emailPlaceholder' })}
          rules={[{ type: 'email', message: intl.formatMessage({ id: 'users.form.emailInvalid' }) }]}
        />
        <ProFormSelect
          name="roleIds"
          label={intl.formatMessage({ id: 'users.form.roles' })}
          mode="multiple"
          placeholder={intl.formatMessage({ id: 'users.form.rolesPlaceholder' })}
          options={roles.map((role) => ({
            label: getRoleOptionLabel(role),
            value: role.id,
          }))}
        />
        {/* 全局基地访问权限开关 - 只有 level <= 1 的用户才能设置 */}
        {currentUserLevel <= 1 && (
          <ProFormSwitch
            name="hasGlobalBaseAccess"
            label={intl.formatMessage({ id: 'users.form.globalBaseAccess' })}
            tooltip={intl.formatMessage({ id: 'users.form.globalBaseAccessTooltip' })}
            fieldProps={{
              checkedChildren: intl.formatMessage({ id: 'users.form.enabled' }),
              unCheckedChildren: intl.formatMessage({ id: 'users.form.disabled' }),
            }}
          />
        )}
        <ProFormDependency name={['hasGlobalBaseAccess']}>
          {({ hasGlobalBaseAccess }) => (
            <ProFormSelect
              name="baseIds"
              label={intl.formatMessage({ id: 'users.form.bases' })}
              mode="multiple"
              placeholder={hasGlobalBaseAccess ? intl.formatMessage({ id: 'users.form.globalAccessEnabled' }) : intl.formatMessage({ id: 'users.form.basesPlaceholder' })}
              disabled={hasGlobalBaseAccess}
              initialValue={[]}
              options={availableBases.map((base) => ({
                label: `${base.name} (${base.code})`,
                value: base.id,
              }))}
              extra={hasGlobalBaseAccess ? intl.formatMessage({ id: 'users.form.globalAccessEnabledExtra' }) : intl.formatMessage({ id: 'users.form.basesExtra' })}
            />
          )}
        </ProFormDependency>
      </ModalForm>

      {/* 编辑用户弹窗 */}
      <ModalForm
        title={currentUser?.id === currentLoginUser?.id ? intl.formatMessage({ id: 'users.editProfile' }) : intl.formatMessage({ id: 'users.edit' })}
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
                hasGlobalBaseAccess: currentUser.hasGlobalBaseAccess || false,
                roleIds: currentUser.roles.map((r) => r.id),
                baseIds: currentUser.bases.map((b) => b.id),
              }
            : {}
        }
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'users.form.name' })}
          placeholder={intl.formatMessage({ id: 'users.form.namePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'users.form.nameRequired' }) }]}
        />
        <ProFormText
          name="phone"
          label={intl.formatMessage({ id: 'users.form.phone' })}
          placeholder={intl.formatMessage({ id: 'users.form.phonePlaceholder' })}
        />
        <ProFormText
          name="email"
          label={intl.formatMessage({ id: 'users.form.email' })}
          placeholder={intl.formatMessage({ id: 'users.form.emailPlaceholder' })}
          rules={[{ type: 'email', message: intl.formatMessage({ id: 'users.form.emailInvalid' }) }]}
        />
        {/* 只有编辑他人时才显示角色和基地字段 */}
        {currentUser?.id !== currentLoginUser?.id && (
          <>
            <ProFormSelect
              name="roleIds"
              label={intl.formatMessage({ id: 'users.form.roles' })}
              mode="multiple"
              placeholder={intl.formatMessage({ id: 'users.form.rolesPlaceholder' })}
              options={roles.map((role) => ({
                label: getRoleOptionLabel(role),
                value: role.id,
              }))}
            />
            {/* 全局基地访问权限开关 - 只有 level <= 1 的用户才能设置 */}
            {currentUserLevel <= 1 && (
              <ProFormSwitch
                name="hasGlobalBaseAccess"
                label={intl.formatMessage({ id: 'users.form.globalBaseAccess' })}
                tooltip={intl.formatMessage({ id: 'users.form.globalBaseAccessTooltip' })}
                fieldProps={{
                  checkedChildren: intl.formatMessage({ id: 'users.form.enabled' }),
                  unCheckedChildren: intl.formatMessage({ id: 'users.form.disabled' }),
                }}
              />
            )}
            <ProFormDependency name={['hasGlobalBaseAccess']}>
              {({ hasGlobalBaseAccess }) => (
                <ProFormSelect
                  name="baseIds"
                  label={intl.formatMessage({ id: 'users.form.bases' })}
                  mode="multiple"
                  placeholder={hasGlobalBaseAccess ? intl.formatMessage({ id: 'users.form.globalAccessEnabled' }) : intl.formatMessage({ id: 'users.form.basesPlaceholder' })}
                  disabled={hasGlobalBaseAccess}
                  options={availableBases.map((base) => ({
                    label: `${base.name} (${base.code})`,
                    value: base.id,
                  }))}
                  extra={hasGlobalBaseAccess ? intl.formatMessage({ id: 'users.form.globalAccessEnabledExtra' }) : intl.formatMessage({ id: 'users.form.basesExtra' })}
                />
              )}
            </ProFormDependency>
            <ProFormSwitch name="isActive" label={intl.formatMessage({ id: 'users.form.status' })} />
          </>
        )}
      </ModalForm>

      {/* 重置密码弹窗 */}
      <ModalForm
        title={
          currentUser?.id === currentLoginUser?.id
            ? intl.formatMessage({ id: 'users.changePassword' })
            : `${intl.formatMessage({ id: 'users.resetPassword' })} - ${currentUser?.name || ''}`
        }
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
          label={intl.formatMessage({ id: 'users.form.newPassword' })}
          placeholder={intl.formatMessage({ id: 'users.form.newPasswordPlaceholder' })}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'users.form.newPasswordRequired' }) },
            { min: 6, message: intl.formatMessage({ id: 'users.form.passwordMinLength' }) },
          ]}
        />
        <ProFormText.Password
          name="confirmPassword"
          label={intl.formatMessage({ id: 'users.form.confirmPassword' })}
          placeholder={intl.formatMessage({ id: 'users.form.confirmPasswordPlaceholder' })}
          rules={[
            { required: true, message: intl.formatMessage({ id: 'users.form.confirmPasswordRequired' }) },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(intl.formatMessage({ id: 'users.form.passwordMismatch' })));
              },
            }),
          ]}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default UsersPage;
