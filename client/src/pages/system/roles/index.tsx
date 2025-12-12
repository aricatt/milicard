import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Table, Tag, Button, Modal, Checkbox, Popconfirm, Spin, Tooltip, Form, Input, App, Space, Tabs, Select, InputNumber, Alert } from 'antd';
import { SettingOutlined, ReloadOutlined, CheckSquareOutlined, MinusSquareOutlined, PlusOutlined, DeleteOutlined, DatabaseOutlined, FormOutlined, EyeOutlined } from '@ant-design/icons';
import { request, useModel } from '@umijs/max';
import DataPermissionConfig from './components/DataPermissionConfig';
import FieldPermissionConfig from './components/FieldPermissionConfig';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  createdAt: string;
  userCount?: number;
  _count?: {
    userRoles: number;
  };
}

// 角色等级说明
// 等级决定基地访问范围，权限决定操作能力
// 例如：Level 1 + 只读权限 = 可以查看所有基地但不能修改
const LEVEL_OPTIONS = [
  { value: 0, label: 'Level 0 - 超级管理员级', description: '可访问所有基地和用户（最高权限）' },
  { value: 1, label: 'Level 1 - 全局访问级', description: '可访问所有基地（适合全局只读角色）' },
  { value: 2, label: 'Level 2 - 经理级', description: '只能访问关联基地，可管理下级用户' },
  { value: 3, label: 'Level 3 - 操作员级', description: '只能访问关联基地，有限操作权限' },
  { value: 4, label: 'Level 4 - 查看者级', description: '只能访问关联基地，只读权限' },
  { value: 5, label: 'Level 5 - 业务角色', description: '特定业务功能权限' },
];

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

// 一级权限：基础数据操作（适用于所有模块，矩阵展示）
const BASE_ACTIONS = [
  { key: 'read', label: '查看' },
  { key: 'create', label: '新增' },
  { key: 'update', label: '编辑' },
  { key: 'delete', label: '删除' },
  { key: 'manage', label: '管理' },
  { key: 'import', label: '导入' },
  { key: 'export', label: '导出' },
];

// 二级权限：业务流程操作（按模块分组，单独展示）
const WORKFLOW_PERMISSIONS: {
  module: string;
  moduleName: string;
  actions: { key: string; label: string; description?: string }[];
}[] = [
  {
    module: 'point_order',
    moduleName: '点位订单',
    actions: [
      { key: 'confirm', label: '确认订单', description: '客服确认订单有效性' },
      { key: 'ship', label: '发货', description: '记录发货信息' },
      { key: 'deliver', label: '确认送达', description: '官方确认货物已送达' },
      { key: 'payment', label: '确认收款', description: '记录收款信息' },
      { key: 'complete', label: '完成订单', description: '官方完成订单' },
      { key: 'receive', label: '确认收货', description: '点位老板确认收货' },
    ],
  },
  // 未来可以添加其他模块的业务流程权限
];

// 一级权限矩阵使用的操作列表
const ACTIONS = BASE_ACTIONS;

// 权限依赖关系配置
// key: 主权限模块, value: 依赖的权限列表（建议同时开启）
const PERMISSION_DEPENDENCIES: Record<string, { permissions: string[]; description: string }> = {
  purchase_order: {
    permissions: ['supplier:read', 'goods:read'],
    description: '采购管理需要查看供应商和商品列表',
  },
  arrival_order: {
    permissions: ['purchase_order:read', 'goods:read', 'location:read'],
    description: '到货管理需要查看采购单、商品和地点',
  },
  stock_transfer: {
    permissions: ['goods:read', 'location:read', 'inventory:read'],
    description: '调货管理需要查看商品、地点和库存',
  },
  stock_consumption: {
    permissions: ['goods:read', 'personnel:read', 'inventory:read'],
    description: '消耗管理需要查看商品、人员和库存',
  },
  anchor_profit: {
    permissions: ['personnel:read', 'stock_consumption:read'],
    description: '主播利润需要查看人员和消耗记录',
  },
  inventory: {
    permissions: ['goods:read', 'location:read'],
    description: '库存管理需要查看商品和地点',
  },
  receivable: {
    permissions: ['customer:read', 'goods:read'],
    description: '应收管理需要查看客户和商品',
  },
};

// 模块名称映射（用于显示友好名称）
const MODULE_LABELS: Record<string, string> = {
  purchase_order: '采购管理',
  supplier: '供应商',
  goods: '商品',
  arrival_order: '到货管理',
  location: '地点',
  stock_transfer: '调货管理',
  inventory: '库存',
  stock_consumption: '消耗管理',
  personnel: '人员',
  anchor_profit: '主播利润',
  receivable: '应收管理',
  customer: '客户',
};

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
  
  // 当前用户拥有的权限集合
  const [currentUserPermissions, setCurrentUserPermissions] = useState<Set<string>>(new Set());
  
  // 获取当前登录用户信息
  const { initialState } = useModel('@@initialState');
  const currentLoginUser = initialState?.currentUser;
  
  // 计算当前用户的最高角色等级（level 越小权限越高）
  const currentUserLevel = useMemo(() => {
    if (!currentLoginUser?.roles || currentLoginUser.roles.length === 0) {
      return 999; // 无角色时设为最低权限
    }
    return Math.min(...currentLoginUser.roles.map((r: any) => r.level ?? 999));
  }, [currentLoginUser]);
  
  // 过滤后的角色列表（只显示 level >= 当前用户 level 的角色）
  const filteredRoles = useMemo(() => {
    return roles.filter(role => role.level >= currentUserLevel);
  }, [roles, currentUserLevel]);
  
  // 判断是否可以编辑目标角色的权限（只能编辑 level > 当前用户 level 的角色）
  const canEditRole = useCallback((role: RoleItem) => {
    return role.level > currentUserLevel;
  }, [currentUserLevel]);
  
  // 当前选中角色是否为只读模式
  const isReadOnly = useMemo(() => {
    if (!currentRole) return true;
    return currentRole.level <= currentUserLevel;
  }, [currentRole, currentUserLevel]);
  
  // 判断某个权限是否可以被当前用户配置（只能配置自己拥有的权限）
  const canConfigurePermission = useCallback((permissionKey: string) => {
    // 超级管理员可以配置所有权限
    if (currentUserLevel === 0) return true;
    return currentUserPermissions.has(permissionKey);
  }, [currentUserPermissions, currentUserLevel]);

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

  // 获取当前用户的所有权限（合并所有角色的权限）
  const fetchCurrentUserPermissions = async () => {
    if (!currentLoginUser?.roles || currentLoginUser.roles.length === 0) {
      setCurrentUserPermissions(new Set());
      return;
    }
    
    try {
      const allPermissions = new Set<string>();
      
      // 获取当前用户所有角色的权限
      for (const role of currentLoginUser.roles) {
        const result = await request(`/api/v1/roles/${role.id}/permissions`, { method: 'GET' });
        if (result.success && result.data.permissions) {
          result.data.permissions.forEach((perm: string) => allPermissions.add(perm));
        }
      }
      
      setCurrentUserPermissions(allPermissions);
    } catch (error) {
      console.error('获取当前用户权限失败', error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissionTree();
    fetchCurrentUserPermissions();
  }, [currentLoginUser]);

  const handleConfigPermission = useCallback((role: RoleItem) => {
    setCurrentRole(role);
    setPermissionModalVisible(true);
    fetchRolePermissions(role.id);
  }, []);

  // 创建角色
  const handleCreateRole = async (values: { name: string; displayName: string; description?: string; level?: number }) => {
    setSaving(true);
    try {
      const result = await request('/api/v1/roles', {
        method: 'POST',
        data: {
          name: values.name,
          description: values.description || values.displayName,
          level: values.level ?? 3,
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
    // 检查是否有权限配置
    if (!canConfigurePermission(key)) return;
    
    const newChecked = new Set(checkedKeys);
    if (newChecked.has(key)) {
      newChecked.delete(key);
    } else {
      newChecked.add(key);
    }
    setCheckedKeys(newChecked);
  };

  // 切换整行（模块的所有基础操作）- 只切换用户有权限的项
  const toggleRow = (module: string) => {
    const newChecked = new Set(checkedKeys);
    // 只处理基础操作且用户有权限配置的项
    const rowKeys = ACTIONS
      .map(a => `${module}:${a.key}`)
      .filter(k => canConfigurePermission(k));
    
    if (rowKeys.length === 0) return;
    
    const allChecked = rowKeys.every(k => newChecked.has(k));
    
    if (allChecked) {
      rowKeys.forEach(k => newChecked.delete(k));
    } else {
      rowKeys.forEach(k => newChecked.add(k));
    }
    setCheckedKeys(newChecked);
  };

  // 切换整列（所有模块的某个操作）- 只切换用户有权限的项
  const toggleColumn = (action: string) => {
    const newChecked = new Set(checkedKeys);
    // 只处理用户有权限配置的项
    const colKeys = modules
      .map(m => `${m.key}:${action}`)
      .filter(k => canConfigurePermission(k));
    
    if (colKeys.length === 0) return;
    
    const allChecked = colKeys.every(k => newChecked.has(k));
    
    if (allChecked) {
      colKeys.forEach(k => newChecked.delete(k));
    } else {
      colKeys.forEach(k => newChecked.add(k));
    }
    setCheckedKeys(newChecked);
  };

  // 全选/清空 - 只操作用户有权限的项（包括基础权限和业务流程权限）
  const selectAll = () => {
    // 基础权限
    const baseKeys = modules
      .flatMap(m => ACTIONS.map(a => `${m.key}:${a.key}`))
      .filter(k => canConfigurePermission(k));
    // 业务流程权限
    const workflowKeys = WORKFLOW_PERMISSIONS
      .flatMap(wp => wp.actions.map(a => `${wp.module}:${a.key}`))
      .filter(k => canConfigurePermission(k));
    setCheckedKeys(new Set([...baseKeys, ...workflowKeys]));
  };

  const clearAll = () => {
    // 清空时，保留用户无权配置的已选项（不能取消别人配置的权限）
    const keysToKeep = Array.from(checkedKeys).filter(k => !canConfigurePermission(k));
    setCheckedKeys(new Set(keysToKeep));
  };

  // 检查行是否全选（只检查基础操作）
  const isRowAllChecked = (module: string) => {
    return ACTIONS.every(a => checkedKeys.has(`${module}:${a.key}`));
  };

  // 检查行是否部分选中（只检查基础操作）
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

  // 检查行内是否有可配置的权限
  const hasConfigurablePermissionInRow = (module: string) => {
    return ACTIONS.some(a => canConfigurePermission(`${module}:${a.key}`));
  };

  // 检查列内是否有可配置的权限
  const hasConfigurablePermissionInColumn = (action: string) => {
    return modules.some(m => canConfigurePermission(`${m.key}:${action}`));
  };

  // 计算缺失的依赖权限
  const missingDependencies = useMemo(() => {
    const missing: { module: string; moduleName: string; missingPerms: { key: string; name: string }[]; description: string }[] = [];
    
    // 遍历所有已选中的权限，检查其依赖
    const checkedModules = new Set<string>();
    checkedKeys.forEach(key => {
      const [module] = key.split(':');
      checkedModules.add(module);
    });
    
    // 检查每个有依赖的模块
    checkedModules.forEach(module => {
      const dep = PERMISSION_DEPENDENCIES[module];
      if (!dep) return;
      
      // 检查该模块是否有任何非read权限被选中（如果只有read权限，可能不需要依赖）
      const hasNonReadPermission = ACTIONS.some(
        a => a.key !== 'read' && checkedKeys.has(`${module}:${a.key}`)
      );
      
      // 如果有创建/编辑/删除等权限，才检查依赖
      if (hasNonReadPermission || checkedKeys.has(`${module}:read`)) {
        const missingPerms = dep.permissions
          .filter(p => !checkedKeys.has(p))
          .map(p => {
            const [m, a] = p.split(':');
            const moduleName = MODULE_LABELS[m] || m;
            const actionName = ACTIONS.find(act => act.key === a)?.label || a;
            return { key: p, name: `${moduleName}-${actionName}` };
          });
        
        if (missingPerms.length > 0) {
          missing.push({
            module,
            moduleName: MODULE_LABELS[module] || module,
            missingPerms,
            description: dep.description,
          });
        }
      }
    });
    
    return missing;
  }, [checkedKeys]);

  // 权限矩阵表格列定义
  const permissionColumns = useMemo(() => [
    {
      title: '模块',
      dataIndex: 'title',
      key: 'title',
      width: 120,
      fixed: 'left' as const,
      render: (title: string, record: { key: string; title: string }) => {
        const canConfigureRow = hasConfigurablePermissionInRow(record.key);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={!canConfigureRow && !isReadOnly ? '您没有该模块的任何权限，无法配置' : undefined}>
              <Checkbox
                checked={isRowAllChecked(record.key)}
                indeterminate={isRowIndeterminate(record.key)}
                onChange={() => toggleRow(record.key)}
                disabled={isReadOnly || !canConfigureRow}
              />
            </Tooltip>
            <span style={{ color: !canConfigureRow && !isReadOnly ? '#999' : undefined }}>{title}</span>
          </div>
        );
      },
    },
    ...ACTIONS.map(action => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <Checkbox
            checked={isColumnAllChecked(action.key)}
            indeterminate={isColumnIndeterminate(action.key)}
            onChange={() => toggleColumn(action.key)}
            disabled={isReadOnly || !hasConfigurablePermissionInColumn(action.key)}
          />
          <div style={{ fontSize: 12 }}>{action.label}</div>
        </div>
      ),
      dataIndex: action.key,
      key: action.key,
      width: 70,
      align: 'center' as const,
      render: (_: any, record: { key: string }) => {
        // 一级权限矩阵只显示基础操作，所有模块都支持
        const permKey = `${record.key}:${action.key}`;
        const canConfigure = canConfigurePermission(permKey);
        return (
          <Tooltip title={!canConfigure && !isReadOnly ? '您没有此权限，无法授予他人' : undefined}>
            <Checkbox
              checked={checkedKeys.has(permKey)}
              onChange={() => togglePermission(record.key, action.key)}
              disabled={isReadOnly || !canConfigure}
            />
          </Tooltip>
        );
      },
    })),
  ], [modules, checkedKeys, isReadOnly, currentUserPermissions, currentUserLevel]);

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
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      sorter: (a: RoleItem, b: RoleItem) => a.level - b.level,
      render: (level: number) => {
        const levelInfo = LEVEL_OPTIONS.find(l => l.value === level);
        const color = level === 0 ? 'red' : level === 1 ? 'volcano' : level <= 2 ? 'blue' : level <= 4 ? 'green' : 'default';
        return (
          <Tooltip title={levelInfo?.description}>
            <Tag color={color}>Level {level}</Tag>
          </Tooltip>
        );
      },
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
      render: (_: any, record: RoleItem) => {
        const canEdit = canEditRole(record);
        
        return (
          <Space size="small">
            <Tooltip title={canEdit ? '配置权限' : '查看权限（只读）'}>
              <Button
                type="link"
                size="small"
                icon={canEdit ? <SettingOutlined /> : <EyeOutlined />}
                onClick={() => handleConfigPermission(record)}
              >
                {/* {canEdit ? '配置权限' : '查看权限'} */}
              </Button>
            </Tooltip>
            {!record.isSystem && canEdit && (
              <Popconfirm
                title="确定要删除该角色吗？"
                description="删除后无法恢复"
                onConfirm={() => handleDeleteRole(record)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer header={{ title: false }}>
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
          dataSource={filteredRoles}
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
        destroyOnHidden
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
          <Form.Item
            name="level"
            label="角色等级"
            rules={[{ required: true, message: '请选择角色等级' }]}
            extra="等级越低权限越高。只能创建比自己等级低的角色"
            initialValue={Math.max(currentUserLevel + 1, 2)}
          >
            <Select
              options={LEVEL_OPTIONS
                .filter(l => l.value > currentUserLevel)
                .map(l => ({
                  value: l.value,
                  label: `${l.label}`,
                }))}
              placeholder="请选择角色等级"
            />
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
        title={`${isReadOnly ? '查看' : '配置'}权限 - ${currentRole ? getRoleLabel(currentRole.name, currentRole.description).label : ''}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        width={800}
        footer={null}
        destroyOnHidden
      >
        {isReadOnly && (
          <Alert
            message="只读模式"
            description="您只能查看同级或更高级别角色的权限配置，无法修改。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
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
                    {!isReadOnly && (
                      <>
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
                      </>
                    )}
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
                    scroll={{ y: 300 }}
                    bordered
                  />
                  
                  {/* 二级权限：业务流程权限 */}
                  {WORKFLOW_PERMISSIONS.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 500, 
                        marginBottom: 12,
                        color: '#1890ff',
                        borderLeft: '3px solid #1890ff',
                        paddingLeft: 8
                      }}>
                        业务流程权限
                      </div>
                      {WORKFLOW_PERMISSIONS.map(wp => (
                        <div 
                          key={wp.module} 
                          style={{ 
                            marginBottom: 12, 
                            padding: '12px 16px',
                            background: '#fafafa',
                            borderRadius: 6,
                            border: '1px solid #f0f0f0'
                          }}
                        >
                          <div style={{ fontWeight: 500, marginBottom: 8, color: '#333' }}>
                            {wp.moduleName}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                            {wp.actions.map(action => {
                              const permKey = `${wp.module}:${action.key}`;
                              const canConfigure = canConfigurePermission(permKey);
                              return (
                                <Tooltip 
                                  key={action.key} 
                                  title={action.description || (!canConfigure && !isReadOnly ? '您没有此权限，无法授予他人' : undefined)}
                                >
                                  <Checkbox
                                    checked={checkedKeys.has(permKey)}
                                    onChange={() => togglePermission(wp.module, action.key)}
                                    disabled={isReadOnly || !canConfigure}
                                  >
                                    {action.label}
                                  </Checkbox>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 权限依赖警告提示 */}
                  {!isReadOnly && missingDependencies.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginTop: 12 }}
                      message="权限依赖提示"
                      description={
                        <div>
                          <p style={{ marginBottom: 8 }}>以下权限可能需要配合其他权限才能正常使用：</p>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {missingDependencies.map(dep => (
                              <li key={dep.module} style={{ marginBottom: 4 }}>
                                <strong>{dep.moduleName}</strong>：建议开启{' '}
                                {dep.missingPerms.map((p, i) => (
                                  <span key={p.key}>
                                    <Tag 
                                      color="orange" 
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => {
                                        const newChecked = new Set(checkedKeys);
                                        newChecked.add(p.key);
                                        setCheckedKeys(newChecked);
                                      }}
                                    >
                                      {p.name} +
                                    </Tag>
                                    {i < dep.missingPerms.length - 1 && ' '}
                                  </span>
                                ))}
                                <span style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>
                                  ({dep.description})
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p style={{ marginTop: 8, marginBottom: 0, color: '#666', fontSize: 12 }}>
                            点击标签可快速添加对应权限
                          </p>
                        </div>
                      }
                    />
                  )}
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Space>
                      <Button onClick={() => setPermissionModalVisible(false)}>
                        {isReadOnly ? '关闭' : '取消'}
                      </Button>
                      {!isReadOnly && (
                        <Button type="primary" loading={saving} onClick={handleSavePermissions}>
                          保存功能权限
                        </Button>
                      )}
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
                  readOnly={isReadOnly}
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
                  readOnly={isReadOnly}
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
