/**
 * 字段权限配置组件
 * 用于配置角色的字段级权限（可读/可写）
 */
import React, { useState, useEffect } from 'react';
import { Table, Checkbox, Button, Select, Space, App, Empty } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

interface FieldPermission {
  id?: string;
  roleId: string;
  resource: string;
  field: string;
  canRead: boolean;
  canWrite: boolean;
}

interface ResourceField {
  key: string;
  label: string;
  type: string;
}

interface Resource {
  key: string;
  label: string;
  fields: ResourceField[];
}

interface Props {
  roleId: string;
  roleName: string;
}

// 资源定义（与后端保持一致）
const RESOURCES: Resource[] = [
  {
    key: 'point',
    label: '点位',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'ownerId', label: '老板', type: 'string' },
      { key: 'dealerId', label: '经销商', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
    ],
  },
  {
    key: 'pointOrder',
    label: '点位订单',
    fields: [
      { key: 'code', label: '订单号', type: 'string' },
      { key: 'orderDate', label: '订单日期', type: 'date' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'paidAmount', label: '已付金额', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'paymentStatus', label: '付款状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
    ],
  },
  {
    key: 'inventory',
    label: '库存',
    fields: [
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'quantity', label: '数量', type: 'number' },
      { key: 'averageCost', label: '平均成本', type: 'number' },
    ],
  },
];

const FieldPermissionConfig: React.FC<Props> = ({ roleId, roleName }) => {
  const [selectedResource, setSelectedResource] = useState<string>('point');
  const [permissions, setPermissions] = useState<Map<string, FieldPermission>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { message } = App.useApp();

  // 获取字段权限
  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const result = await request(`/api/v1/roles/${roleId}/field-permissions`);
      if (result.success) {
        const permMap = new Map<string, FieldPermission>();
        (result.data || []).forEach((p: FieldPermission) => {
          permMap.set(`${p.resource}:${p.field}`, p);
        });
        setPermissions(permMap);
      }
    } catch (error) {
      console.error('获取字段权限失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [roleId]);

  // 获取当前资源的字段列表
  const currentResource = RESOURCES.find(r => r.key === selectedResource);
  const currentFields = currentResource?.fields || [];

  // 获取字段权限
  const getFieldPermission = (field: string): { canRead: boolean; canWrite: boolean } => {
    const key = `${selectedResource}:${field}`;
    const perm = permissions.get(key);
    // 默认都是允许的
    return {
      canRead: perm?.canRead ?? true,
      canWrite: perm?.canWrite ?? true,
    };
  };

  // 更新字段权限
  const updateFieldPermission = (field: string, type: 'canRead' | 'canWrite', value: boolean) => {
    const key = `${selectedResource}:${field}`;
    const existing = permissions.get(key) || {
      roleId,
      resource: selectedResource,
      field,
      canRead: true,
      canWrite: true,
    };

    const updated = { ...existing, [type]: value };
    
    // 如果不可读，则也不可写
    if (type === 'canRead' && !value) {
      updated.canWrite = false;
    }

    const newPermissions = new Map(permissions);
    newPermissions.set(key, updated);
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  // 保存权限
  const handleSave = async () => {
    setSaving(true);
    try {
      // 只保存当前资源的权限
      const permissionsToSave = Array.from(permissions.values())
        .filter(p => p.resource === selectedResource);

      const result = await request(`/api/v1/roles/${roleId}/field-permissions`, {
        method: 'PUT',
        data: { permissions: permissionsToSave },
      });

      if (result.success) {
        message.success('保存成功');
        setHasChanges(false);
      } else {
        message.error(result.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 全选/取消全选
  const handleSelectAll = (type: 'canRead' | 'canWrite', value: boolean) => {
    const newPermissions = new Map(permissions);
    currentFields.forEach(field => {
      const key = `${selectedResource}:${field.key}`;
      const existing = newPermissions.get(key) || {
        roleId,
        resource: selectedResource,
        field: field.key,
        canRead: true,
        canWrite: true,
      };
      
      const updated = { ...existing, [type]: value };
      if (type === 'canRead' && !value) {
        updated.canWrite = false;
      }
      newPermissions.set(key, updated);
    });
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  // 检查是否全选
  const isAllChecked = (type: 'canRead' | 'canWrite') => {
    return currentFields.every(field => getFieldPermission(field.key)[type]);
  };

  const columns = [
    {
      title: '字段',
      dataIndex: 'label',
      key: 'label',
      width: 150,
    },
    {
      title: (
        <Space>
          <Checkbox
            checked={isAllChecked('canRead')}
            onChange={(e) => handleSelectAll('canRead', e.target.checked)}
          />
          可查看
        </Space>
      ),
      dataIndex: 'canRead',
      key: 'canRead',
      width: 120,
      render: (_: any, record: ResourceField) => {
        const perm = getFieldPermission(record.key);
        return (
          <Checkbox
            checked={perm.canRead}
            onChange={(e) => updateFieldPermission(record.key, 'canRead', e.target.checked)}
          />
        );
      },
    },
    {
      title: (
        <Space>
          <Checkbox
            checked={isAllChecked('canWrite')}
            onChange={(e) => handleSelectAll('canWrite', e.target.checked)}
          />
          可编辑
        </Space>
      ),
      dataIndex: 'canWrite',
      key: 'canWrite',
      width: 120,
      render: (_: any, record: ResourceField) => {
        const perm = getFieldPermission(record.key);
        return (
          <Checkbox
            checked={perm.canWrite}
            disabled={!perm.canRead}
            onChange={(e) => updateFieldPermission(record.key, 'canWrite', e.target.checked)}
          />
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ color: '#666' }}>资源：</span>
          <Select
            value={selectedResource}
            onChange={setSelectedResource}
            style={{ width: 150 }}
            options={RESOURCES.map(r => ({ label: r.label, value: r.key }))}
          />
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
        >
          保存
        </Button>
      </div>

      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
        配置 <strong>{roleName}</strong> 角色对 <strong>{currentResource?.label}</strong> 资源各字段的访问权限
      </div>

      {currentFields.length === 0 ? (
        <Empty description="该资源暂无可配置的字段" />
      ) : (
        <Table
          rowKey="key"
          columns={columns}
          dataSource={currentFields}
          loading={loading}
          pagination={false}
          size="small"
        />
      )}
    </div>
  );
};

export default FieldPermissionConfig;
