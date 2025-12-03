import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Button, Modal, Checkbox, Popconfirm, Spin, Tooltip, Form, Input, App, Space, Tabs } from 'antd';
import { SettingOutlined, ReloadOutlined, CheckSquareOutlined, MinusSquareOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined, FormOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import DataPermissionConfig from './components/DataPermissionConfig';
import FieldPermissionConfig from './components/FieldPermissionConfig';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  userCount?: number;
  _count?: {
    userRoles: number;
  };
}

interface PermissionTreeNode {
  key: string;
  title: string;
  children?: PermissionTreeNode[];
}

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

// 操作类型
const ACTIONS = [
  { key: 'read', label: '查看' },
  { key: 'create', label: '新增' },
  { key: 'update', label: '编辑' },
  { key: 'delete', label: '删除' },
  { key: 'manage', label: '管理' },
  { key: 'import', label: '导入' },
  { key: 'export', label: '导出' },
];

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleItem | null>(null);
  const [modules, setModules] = useState<{ key: string; title: string }[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm();
  const { message, modal } = App.useApp();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const result = await request('/api/v1/roles', { method: 'GET' });
      if (result.success) {
        setRoles(result.data || []);
      }
    } catch (error) {
      console.error('获取角色列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionTree = async () => {
    try {
      const result = await request('/api/v1/roles/permission-tree', { method: 'GET' });
      if (result.success) {
        // 提取模块列表
        const moduleList = result.data.map((node: PermissionTreeNode) => ({
          key: node.key,
          title: node.title,
        }));
        setModules(moduleList);
      }
    } catch (error) {
      console.error('获取权限树失败', error);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    setPermissionLoading(true);
    try {
      const result = await request(`/api/v1/roles/${roleId}/permissions`, { method: 'GET' });
      if (result.success) {
        setCheckedKeys(new Set(result.data.permissions || []));
      }
    } catch (error) {
      console.error('获取角色权限失败', error);
      message.error('获取角色权限失败');
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissionTree();
  }, []);

  const handleConfigPermission = useCallback((role: RoleItem) => {
    setCurrentRole(role);
    setPermissionModalVisible(true);
    fetchRolePermissions(role.id);
  }, []);

  // 创建角色
  const handleCreateRole = async (values: { name: string; displayName: string; description?: string }) => {
    setSaving(true);
    try {
      const result = await request('/api/v1/roles', {
        method: 'POST',
        data: {
          name: values.name,
          description: values.description || values.displayName,
        },
      });
      if (result.success) {
        message.success('创建角色成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchRoles();
      } else {
        message.error(result.message || '创建角色失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '创建角色失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除角色
  const handleDeleteRole = async (role: RoleItem) => {
    const userCount = role._count?.userRoles || role.userCount || 0;
    if (userCount > 0) {
      modal.warning({
        title: '无法删除',
        content: `该角色已分配给 ${userCount} 个用户，请先移除用户的角色分配后再删除。`,
      });
      return;
    }

    try {
      const result = await request(`/api/v1/roles/${role.id}`, {
        method: 'DELETE',
      });
      if (result.success) {
        message.success('删除角色成功');
        fetchRoles();
      } else {
        message.error(result.message || '删除角色失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除角色失败');
    }
  };

  const handleSavePermissions = async () => {
    if (!currentRole) return;

    setSaving(true);
    try {
      const result = await request(`/api/v1/roles/${currentRole.id}/permissions`, {
        method: 'PUT',
        data: { permissions: Array.from(checkedKeys) },
      });
      if (result.success) {
        message.success(`权限更新成功，新增 ${result.data.added} 项，删除 ${result.data.deleted} 项`);
        setPermissionModalVisible(false);
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存权限失败', error);
      message.error('保存权限失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!currentRole) return;

    setSaving(true);
    try {
      const result = await request(`/api/v1/roles/${currentRole.id}/permissions/reset`, {
        method: 'POST',
      });
      if (result.success) {
        message.success(`权限已重置为预设值，共 ${result.data.permissionCount} 项`);
        fetchRolePermissions(currentRole.id);
      } else {
        message.error(result.message || '重置失败');
      }
    } catch (error) {
      console.error('重置权限失败', error);
      message.error('重置权限失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换单个权限
  const togglePermission = (module: string, action: string) => {
    const key = `${module}:${action}`;
    const newChecked = new Set(checkedKeys);
    if (newChecked.has(key)) {
      newChecked.delete(key);
    } else {
      newChecked.add(key);
    }
    setCheckedKeys(newChecked);
  };

  // 切换整行（模块的所有操作）
  const toggleRow = (module: string) => {
    const newChecked = new Set(checkedKeys);
    const rowKeys = ACTIONS.map(a => `${module}:${a.key}`);
    const allChecked = rowKeys.every(k => newChecked.has(k));
    
    if (allChecked) {
      rowKeys.forEach(k => newChecked.delete(k));
    } else {
      rowKeys.forEach(k => newChecked.add(k));
    }
    setCheckedKeys(newChecked);
  };

  // 切换整列（所有模块的某个操作）
  const toggleColumn = (action: string) => {
    const newChecked = new Set(checkedKeys);
    const colKeys = modules.map(m => `${m.key}:${action}`);
    const allChecked = colKeys.every(k => newChecked.has(k));
    
    if (allChecked) {
      colKeys.forEach(k => newChecked.delete(k));
    } else {
      colKeys.forEach(k => newChecked.add(k));
    }
    setCheckedKeys(newChecked);
  };

  // 全选/清空
  const selectAll = () => {
    const allKeys = modules.flatMap(m => ACTIONS.map(a => `${m.key}:${a.key}`));
    setCheckedKeys(new Set(allKeys));
  };

  const clearAll = () => {
    setCheckedKeys(new Set());
  };

  // 检查行是否全选
  const isRowAllChecked = (module: string) => {
    return ACTIONS.every(a => checkedKeys.has(`${module}:${a.key}`));
  };

  // 检查行是否部分选中
  const isRowIndeterminate = (module: string) => {
    const checked = ACTIONS.filter(a => checkedKeys.has(`${module}:${a.key}`)).length;
    return checked > 0 && checked < ACTIONS.length;
  };

  // 检查列是否全选
  const isColumnAllChecked = (action: string) => {
    return modules.every(m => checkedKeys.has(`${m.key}:${action}`));
  };

  // 检查列是否部分选中
  const isColumnIndeterminate = (action: string) => {
    const checked = modules.filter(m => checkedKeys.has(`${m.key}:${action}`)).length;
    return checked > 0 && checked < modules.length;
  };

  // 权限矩阵表格列定义
  const permissionColumns = useMemo(() => [
    {
      title: '模块',
      dataIndex: 'title',
      key: 'title',
      width: 120,
      fixed: 'left' as const,
      render: (title: string, record: { key: string; title: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            checked={isRowAllChecked(record.key)}
            indeterminate={isRowIndeterminate(record.key)}
            onChange={() => toggleRow(record.key)}
          />
          <span>{title}</span>
        </div>
      ),
    },
    ...ACTIONS.map(action => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <Checkbox
            checked={isColumnAllChecked(action.key)}
            indeterminate={isColumnIndeterminate(action.key)}
            onChange={() => toggleColumn(action.key)}
          />
          <div style={{ fontSize: 12 }}>{action.label}</div>
        </div>
      ),
      dataIndex: action.key,
      key: action.key,
      width: 70,
      align: 'center' as const,
      render: (_: any, record: { key: string }) => (
        <Checkbox
          checked={checkedKeys.has(`${record.key}:${action.key}`)}
          onChange={() => togglePermission(record.key, action.key)}
        />
      ),
    })),
  ], [modules, checkedKeys]);

  const columns = [
    {
      title: '角色标识',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'label',
      width: 150,
      render: (name: string, record: RoleItem) => {
        const { label, color } = getRoleLabel(name, record.description);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '用户数',
      dataIndex: '_count',
      key: 'userCount',
      width: 80,
      render: (_: any, record: RoleItem) => record._count?.userRoles ?? record.userCount ?? 0,
    },
    {
      title: '类型',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 100,
      render: (isSystem: boolean) =>
        isSystem ? <Tag color="blue">系统角色</Tag> : <Tag>自定义角色</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: RoleItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleConfigPermission(record)}
          >
            配置权限
          </Button>
          {!record.isSystem && (
            <Popconfirm
              title="确定要删除该角色吗？"
              description="删除后无法恢复"
              onConfirm={() => handleDeleteRole(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '角色管理' }}>
      <Card
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建角色
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* 新建角色弹窗 */}
      <Modal
        title="新建角色"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateRole}
        >
          <Form.Item
            name="name"
            label="角色标识"
            rules={[
              { required: true, message: '请输入角色标识' },
              { pattern: /^[A-Z][A-Z0-9_]*$/, message: '角色标识必须以大写字母开头，只能包含大写字母、数字和下划线' },
            ]}
            extra="例如：SALES_MANAGER、WAREHOUSE_ADMIN"
          >
            <Input placeholder="请输入角色标识（大写字母、数字、下划线）" />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称，如：销售经理" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入角色描述（可选）" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`配置权限 - ${currentRole ? getRoleLabel(currentRole.name, currentRole.description).label : ''}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        width={800}
        footer={null}
        destroyOnClose
      >
        <Tabs
          items={[
            {
              key: 'function',
              label: (
                <span>
                  <SettingOutlined />
                  功能权限
                </span>
              ),
              children: permissionLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin tip="加载权限中..." />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                    <Tooltip title="全选所有权限">
                      <Button size="small" icon={<CheckSquareOutlined />} onClick={selectAll}>
                        全选
                      </Button>
                    </Tooltip>
                    <Tooltip title="清空所有权限">
                      <Button size="small" icon={<MinusSquareOutlined />} onClick={clearAll}>
                        清空
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="确定要重置为预设权限吗？"
                      description="这将覆盖当前的所有权限配置"
                      onConfirm={handleResetPermissions}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button size="small" icon={<ReloadOutlined />} loading={saving}>
                        重置为预设
                      </Button>
                    </Popconfirm>
                    <span style={{ marginLeft: 'auto', color: '#999', fontSize: 12 }}>
                      已选 {checkedKeys.size} 项权限
                    </span>
                  </div>
                  <Table
                    rowKey="key"
                    columns={permissionColumns}
                    dataSource={modules}
                    pagination={false}
                    size="small"
                    scroll={{ y: 350 }}
                    bordered
                  />
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={() => setPermissionModalVisible(false)}>
                        取消
                      </Button>
                      <Button type="primary" loading={saving} onClick={handleSavePermissions}>
                        保存功能权限
                      </Button>
                    </Space>
                  </div>
                </>
              ),
            },
            {
              key: 'data',
              label: (
                <span>
                  <DatabaseOutlined />
                  数据权限
                </span>
              ),
              children: currentRole ? (
                <DataPermissionConfig
                  roleId={currentRole.id}
                  roleName={getRoleLabel(currentRole.name, currentRole.description).label}
                />
              ) : null,
            },
            {
              key: 'field',
              label: (
                <span>
                  <FormOutlined />
                  字段权限
                </span>
              ),
              children: currentRole ? (
                <FieldPermissionConfig
                  roleId={currentRole.id}
                  roleName={getRoleLabel(currentRole.name, currentRole.description).label}
                />
              ) : null,
            },
          ]}
        />
      </Modal>
    </PageContainer>
  );
};

export default RolesPage;
