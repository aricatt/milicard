import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Button, Modal, Tree, message, Space, Popconfirm, Spin } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import type { DataNode } from 'antd/es/tree';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  userCount?: number;
}

interface PermissionTreeNode {
  key: string;
  title: string;
  children?: PermissionTreeNode[];
}

// 角色名称映射
const getRoleLabel = (roleName: string) => {
  const roleMap: Record<string, { label: string; color: string }> = {
    ADMIN: { label: '系统管理员', color: 'red' },
    BASE_MANAGER: { label: '基地管理员', color: 'blue' },
    POINT_OWNER: { label: '点位老板', color: 'green' },
    CUSTOMER_SERVICE: { label: '客服', color: 'orange' },
    WAREHOUSE_KEEPER: { label: '仓管', color: 'purple' },
    ANCHOR: { label: '主播', color: 'cyan' },
  };
  return roleMap[roleName] || { label: roleName, color: 'default' };
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleItem | null>(null);
  const [permissionTree, setPermissionTree] = useState<DataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        // 转换为 antd Tree 需要的格式
        const treeData: DataNode[] = result.data.map((node: PermissionTreeNode) => ({
          key: node.key,
          title: node.title,
          children: node.children?.map((child: PermissionTreeNode) => ({
            key: child.key,
            title: child.title,
          })),
        }));
        setPermissionTree(treeData);
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
        setCheckedKeys(result.data.permissions || []);
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

  const handleSavePermissions = async () => {
    if (!currentRole) return;

    setSaving(true);
    try {
      const result = await request(`/api/v1/roles/${currentRole.id}/permissions`, {
        method: 'PUT',
        data: { permissions: checkedKeys },
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
        // 重新加载权限
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

  const onCheck = (checked: any) => {
    // checked 可能是 { checked: string[], halfChecked: string[] } 或 string[]
    const keys = Array.isArray(checked) ? checked : checked.checked;
    setCheckedKeys(keys);
  };

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
      render: (name: string) => {
        const { label, color } = getRoleLabel(name);
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
      dataIndex: 'userCount',
      key: 'userCount',
      width: 80,
      render: (count: number) => count || 0,
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
      width: 120,
      render: (_: any, record: RoleItem) => (
        <Button
          type="link"
          icon={<SettingOutlined />}
          onClick={() => handleConfigPermission(record)}
        >
          配置权限
        </Button>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '角色管理' }}>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={`配置权限 - ${currentRole ? getRoleLabel(currentRole.name).label : ''}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        width={600}
        footer={[
          <Popconfirm
            key="reset"
            title="确定要重置为预设权限吗？"
            description="这将覆盖当前的所有权限配置"
            onConfirm={handleResetPermissions}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ReloadOutlined />} loading={saving}>
              重置为预设
            </Button>
          </Popconfirm>,
          <Button key="cancel" onClick={() => setPermissionModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleSavePermissions}>
            保存
          </Button>,
        ]}
      >
        {permissionLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="加载权限中..." />
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Tree
              checkable
              checkStrictly
              defaultExpandAll
              checkedKeys={checkedKeys}
              onCheck={onCheck}
              treeData={permissionTree}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default RolesPage;
