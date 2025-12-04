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
  readOnly?: boolean;
}

// 资源定义（与后端保持一致）
const RESOURCES: Resource[] = [
  // ========== 基地管理 ==========
  {
    key: 'base',
    label: '基地',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
    ],
  },
  {
    key: 'location',
    label: '直播间/仓库',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'capacity', label: '容量', type: 'number' },
    ],
  },
  {
    key: 'personnel',
    label: '人员',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
    ],
  },
  // ========== 点位管理 ==========
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
  // ========== 商品管理 ==========
  {
    key: 'goods',
    label: '商品',
    fields: [
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'barcode', label: '条码', type: 'string' },
      { key: 'unit', label: '单位', type: 'string' },
      { key: 'boxSpec', label: '箱规', type: 'number' },
      { key: 'packSpec', label: '包规', type: 'number' },
      { key: 'purchasePrice', label: '采购价', type: 'number' },
      { key: 'sellingPrice', label: '销售价', type: 'number' },
    ],
  },
  // ========== 库存管理 ==========
  {
    key: 'inventory',
    label: '库存',
    fields: [
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'quantity', label: '数量', type: 'number' },
      { key: 'averageCost', label: '平均成本', type: 'number' },
    ],
  },
  {
    key: 'purchaseOrder',
    label: '采购订单',
    fields: [
      { key: 'code', label: '订单号', type: 'string' },
      { key: 'supplierName', label: '供应商', type: 'string' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
    ],
  },
  {
    key: 'arrivalOrder',
    label: '到货单',
    fields: [
      { key: 'code', label: '单号', type: 'string' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
    ],
  },
  {
    key: 'transferOrder',
    label: '调货单',
    fields: [
      { key: 'code', label: '单号', type: 'string' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
    ],
  },
  {
    key: 'stockConsumption',
    label: '消耗记录',
    fields: [
      { key: 'code', label: '单号', type: 'string' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
    ],
  },
  // ========== 用户管理 ==========
  {
    key: 'user',
    label: '用户',
    fields: [
      { key: 'username', label: '用户名', type: 'string' },
      { key: 'name', label: '姓名', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
    ],
  },
];

const FieldPermissionConfig: React.FC<Props> = ({ roleId, roleName, readOnly = false }) => {
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
            disabled={readOnly}
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
            disabled={readOnly}
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
            disabled={readOnly}
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
            disabled={!perm.canRead || readOnly}
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
        {!readOnly && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            保存
          </Button>
        )}
      </div>

      <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
        {readOnly ? '查看' : '配置'} <strong>{roleName}</strong> 角色对 <strong>{currentResource?.label}</strong> 资源各字段的访问权限
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
