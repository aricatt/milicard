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
      { key: 'pointId', label: '点位ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'orderDate', label: '订单日期', type: 'date' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'paidAmount', label: '已付金额', type: 'number' },
      { key: 'status', label: '状态', type: 'string' },
      { key: 'paymentStatus', label: '付款状态', type: 'string' },
      { key: 'paymentNotes', label: '付款备注', type: 'string' },
      { key: 'shippingAddress', label: '收货地址', type: 'string' },
      { key: 'shippingPhone', label: '收货电话', type: 'string' },
      { key: 'trackingNumber', label: '物流单号', type: 'string' },
      { key: 'deliveryPerson', label: '配送员', type: 'string' },
      { key: 'deliveryPhone', label: '配送电话', type: 'string' },
      { key: 'confirmedAt', label: '确认时间', type: 'date' },
      { key: 'shippedAt', label: '发货时间', type: 'date' },
      { key: 'deliveredAt', label: '送达时间', type: 'date' },
      { key: 'completedAt', label: '完成时间', type: 'date' },
      { key: 'cancelledAt', label: '取消时间', type: 'date' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'customerNotes', label: '客户备注', type: 'string' },
      { key: 'staffNotes', label: '员工备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'confirmedBy', label: '确认人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'items', label: '订单明细', type: 'array' },
      { key: 'point', label: '点位信息', type: 'object' },
    ],
  },
  // ========== 商品管理 ==========
  {
    key: 'category',
    label: '商品品类',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '品类编码', type: 'string' },
      { key: 'name', label: '品类名称', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'sortOrder', label: '排序', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'goods',
    label: '全局商品',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '商品编号', type: 'string' },
      { key: 'name', label: '商品名称', type: 'string' },
      { key: 'nameI18n', label: '多语言名称', type: 'object' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'categoryId', label: '品类ID', type: 'number' },
      { key: 'category', label: '品类信息', type: 'object' },
      { key: 'manufacturer', label: '厂商', type: 'string' },
      { key: 'boxQuantity', label: '箱数量', type: 'number' },
      { key: 'packPerBox', label: '箱规(盒/箱)', type: 'number' },
      { key: 'piecePerPack', label: '包规(包/盒)', type: 'number' },
      { key: 'imageUrl', label: '图片URL', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'retailPrice', label: '零售价', type: 'number' },
      { key: 'packPrice', label: '盒价', type: 'number' },
      { key: 'alias', label: '别名', type: 'string' },
    ],
  },
  {
    key: 'currencyRate',
    label: '货币汇率',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'currencyCode', label: '货币代码', type: 'string' },
      { key: 'currencyName', label: '货币名称', type: 'string' },
      { key: 'fixedRate', label: '固定汇率', type: 'number' },
      { key: 'liveRate', label: '实时汇率', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  // ========== 基地管理 ==========
  {
    key: 'base',
    label: '基地管理',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '基地编号', type: 'string' },
      { key: 'name', label: '基地名称', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'contactEmail', label: '联系邮箱', type: 'string' },
      { key: 'currency', label: '货币', type: 'string' },
      { key: 'language', label: '语言', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'location',
    label: '直播间/仓库',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'code', label: '编号', type: 'string' },
      { key: 'name', label: '名称', type: 'string' },
      { key: 'type', label: '类型', type: 'string' },
      { key: 'description', label: '描述', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'contactPhone', label: '联系电话', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'personnel',
    label: '人员管理',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '人员编号', type: 'string' },
      { key: 'name', label: '姓名', type: 'string' },
      { key: 'role', label: '角色', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'operatorId', label: '操作员ID', type: 'string' },
      { key: 'baseId', label: '基地ID', type: 'number' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'updatedBy', label: '更新人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
    ],
  },
  {
    key: 'supplier',
    label: '供应商管理',
    fields: [
      { key: 'id', label: 'ID', type: 'string' },
      { key: 'code', label: '供应商编号', type: 'string' },
      { key: 'name', label: '供应商名称', type: 'string' },
      { key: 'contactPerson', label: '联系人', type: 'string' },
      { key: 'phone', label: '电话', type: 'string' },
      { key: 'email', label: '邮箱', type: 'string' },
      { key: 'address', label: '地址', type: 'string' },
      { key: 'taxNumber', label: '税号', type: 'string' },
      { key: 'bankAccount', label: '银行账号', type: 'string' },
      { key: 'bankName', label: '开户行', type: 'string' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'isActive', label: '状态', type: 'boolean' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
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
      { key: 'orderNo', label: '订单号', type: 'string' },
      { key: 'supplierName', label: '供应商', type: 'string' },
      { key: 'purchaseDate', label: '采购日期', type: 'date' },
      { key: 'totalAmount', label: '总金额', type: 'number' },
      { key: 'actualAmount', label: '实付金额', type: 'number' },
      { key: 'cnyPaymentAmount', label: '人民币支付', type: 'number' },
      { key: 'targetLocationId', label: '目标位置ID', type: 'string' },
      { key: 'targetLocation', label: '目标位置', type: 'object' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'updatedAt', label: '更新时间', type: 'date' },
      { key: 'items', label: '订单明细', type: 'array' },
      { key: 'goodsId', label: '商品ID', type: 'string' },
      { key: 'goodsCode', label: '商品编号', type: 'string' },
      { key: 'goodsName', label: '商品名称', type: 'string' },
      { key: 'goodsNameI18n', label: '商品多语言名称', type: 'object' },
      { key: 'categoryCode', label: '品类编号', type: 'string' },
      { key: 'categoryName', label: '品类名称', type: 'string' },
      { key: 'retailPrice', label: '零售价', type: 'number' },
      { key: 'packPerBox', label: '箱规', type: 'number' },
      { key: 'piecePerPack', label: '包规', type: 'number' },
      { key: 'purchaseBoxQty', label: '采购箱数', type: 'number' },
      { key: 'purchasePackQty', label: '采购盒数', type: 'number' },
      { key: 'purchasePieceQty', label: '采购包数', type: 'number' },
      { key: 'unitPrice', label: '单价', type: 'number' },
      { key: 'unitPriceBox', label: '箱单价', type: 'number' },
      { key: 'unitPricePack', label: '盒单价', type: 'number' },
      { key: 'unitPricePiece', label: '包单价', type: 'number' },
      { key: 'arrivedBoxQty', label: '到货箱数', type: 'number' },
      { key: 'arrivedPackQty', label: '到货盒数', type: 'number' },
      { key: 'arrivedPieceQty', label: '到货包数', type: 'number' },
      { key: 'diffBoxQty', label: '相差箱数', type: 'number' },
      { key: 'diffPackQty', label: '相差盒数', type: 'number' },
      { key: 'diffPieceQty', label: '相差包数', type: 'number' },
      { key: 'logisticsSummary', label: '物流汇总', type: 'object' },
      { key: 'internationalLogisticsCount', label: '国际货运数量', type: 'number' },
    ],
  },
  {
    key: 'arrivalOrder',
    label: '到货单',
    fields: [
      { key: 'arrivalNo', label: '单号', type: 'string' },
      { key: 'purchaseOrderId', label: '采购订单ID', type: 'string' },
      { key: 'locationId', label: '位置ID', type: 'string' },
      { key: 'arrivalDate', label: '到货日期', type: 'date' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'items', label: '到货明细', type: 'array' },
      { key: 'purchaseOrder', label: '采购订单', type: 'object' },
      { key: 'location', label: '位置', type: 'object' },
    ],
  },
  {
    key: 'transferOrder',
    label: '调货单',
    fields: [
      { key: 'transferNo', label: '单号', type: 'string' },
      { key: 'fromLocationId', label: '源位置ID', type: 'string' },
      { key: 'toLocationId', label: '目标位置ID', type: 'string' },
      { key: 'transferDate', label: '调货日期', type: 'date' },
      { key: 'notes', label: '备注', type: 'string' },
      { key: 'createdBy', label: '创建人', type: 'string' },
      { key: 'createdAt', label: '创建时间', type: 'date' },
      { key: 'items', label: '调货明细', type: 'array' },
      { key: 'fromLocation', label: '源位置', type: 'object' },
      { key: 'toLocation', label: '目标位置', type: 'object' },
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
      // 保存当前资源的所有字段权限（包括默认值）
      const permissionsToSave = currentFields.map(field => {
        const key = `${selectedResource}:${field.key}`;
        const perm = permissions.get(key);
        return {
          roleId,
          resource: selectedResource,
          field: field.key,
          canRead: perm?.canRead ?? true,
          canWrite: perm?.canWrite ?? true,
        };
      });

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
