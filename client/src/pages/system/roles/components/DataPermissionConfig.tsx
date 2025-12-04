/**
 * 数据权限配置组件
 * 用于配置角色的数据权限规则
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Input, Space, Tag, Popconfirm, App, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';

interface DataPermissionRule {
  id: string;
  roleId: string;
  resource: string;
  field: string;
  operator: string;
  valueType: string;
  fixedValue?: string;
  description?: string;
  isActive: boolean;
}

interface Metadata {
  valueTypes: Array<{ key: string; label: string; description: string }>;
  operators: Array<{ key: string; label: string; description: string }>;
  resources: Array<{
    key: string;
    label: string;
    fields: Array<{ key: string; label: string; type: string }>;
  }>;
}

interface Props {
  roleId: string;
  roleName: string;
  readOnly?: boolean;
}

const DataPermissionConfig: React.FC<Props> = ({ roleId, roleName, readOnly = false }) => {
  const [rules, setRules] = useState<DataPermissionRule[]>([]);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // 获取元数据
  const fetchMetadata = async () => {
    try {
      const result = await request('/api/v1/data-permissions/metadata');
      if (result.success) {
        setMetadata(result.data);
      }
    } catch (error) {
      console.error('获取元数据失败', error);
    }
  };

  // 获取规则列表
  const fetchRules = async () => {
    setLoading(true);
    try {
      const result = await request(`/api/v1/roles/${roleId}/data-permissions`);
      if (result.success) {
        setRules(result.data || []);
      }
    } catch (error) {
      console.error('获取数据权限规则失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchRules();
  }, [roleId]);

  // 创建规则
  const handleCreate = async (values: any) => {
    try {
      const result = await request(`/api/v1/roles/${roleId}/data-permissions`, {
        method: 'POST',
        data: values,
      });
      if (result.success) {
        message.success('创建成功');
        setModalVisible(false);
        form.resetFields();
        fetchRules();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '创建失败');
    }
  };

  // 删除规则
  const handleDelete = async (ruleId: string) => {
    try {
      const result = await request(`/api/v1/data-permissions/${ruleId}`, {
        method: 'DELETE',
      });
      if (result.success) {
        message.success('删除成功');
        fetchRules();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  // 获取资源标签
  const getResourceLabel = (key: string) => {
    return metadata?.resources.find(r => r.key === key)?.label || key;
  };

  // 获取字段标签
  const getFieldLabel = (resourceKey: string, fieldKey: string) => {
    const resource = metadata?.resources.find(r => r.key === resourceKey);
    return resource?.fields.find(f => f.key === fieldKey)?.label || fieldKey;
  };

  // 获取操作符标签
  const getOperatorLabel = (key: string) => {
    return metadata?.operators.find(o => o.key === key)?.label || key;
  };

  // 获取值类型标签
  const getValueTypeLabel = (key: string) => {
    return metadata?.valueTypes.find(v => v.key === key)?.label || key;
  };

  // 监听资源变化，重置字段
  const handleResourceChange = () => {
    form.setFieldValue('field', undefined);
  };

  // 获取当前选中资源的字段列表
  const selectedResource = Form.useWatch('resource', form);
  const currentFields = metadata?.resources.find(r => r.key === selectedResource)?.fields || [];

  const columns = [
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 120,
      render: (text: string) => <Tag color="blue">{getResourceLabel(text)}</Tag>,
    },
    {
      title: '字段',
      dataIndex: 'field',
      key: 'field',
      width: 120,
      render: (text: string, record: DataPermissionRule) => getFieldLabel(record.resource, text),
    },
    {
      title: '条件',
      dataIndex: 'operator',
      key: 'operator',
      width: 80,
      render: (text: string) => getOperatorLabel(text),
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      key: 'valueType',
      width: 140,
      render: (text: string, record: DataPermissionRule) => (
        <Space direction="vertical" size={0}>
          <span>{getValueTypeLabel(text)}</span>
          {record.fixedValue && (
            <span style={{ fontSize: 12, color: '#999' }}>值: {record.fixedValue}</span>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '启用' : '禁用'}</Tag>
      ),
    },
    ...(!readOnly ? [{
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: DataPermissionRule) => (
        <Popconfirm
          title="确定要删除这条规则吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#666' }}>
          {readOnly ? '查看' : '配置'} <strong>{roleName}</strong> 角色的数据访问范围
        </span>
        {!readOnly && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            添加规则
          </Button>
        )}
      </div>

      {rules.length === 0 ? (
        <Empty description="暂无数据权限规则，该角色可访问所有数据" />
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rules}
          loading={loading}
          pagination={false}
          size="small"
        />
      )}

      <Modal
        title="添加数据权限规则"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="resource"
            label="资源"
            rules={[{ required: true, message: '请选择资源' }]}
          >
            <Select
              placeholder="请选择资源"
              onChange={handleResourceChange}
              options={metadata?.resources.map(r => ({ label: r.label, value: r.key }))}
            />
          </Form.Item>

          <Form.Item
            name="field"
            label="过滤字段"
            rules={[{ required: true, message: '请选择字段' }]}
          >
            <Select
              placeholder="请选择字段"
              disabled={!selectedResource}
              options={currentFields.map(f => ({ label: f.label, value: f.key }))}
            />
          </Form.Item>

          <Form.Item
            name="operator"
            label="条件"
            rules={[{ required: true, message: '请选择条件' }]}
          >
            <Select
              placeholder="请选择条件"
              options={metadata?.operators.map(o => ({ label: o.label, value: o.key }))}
            />
          </Form.Item>

          <Form.Item
            name="valueType"
            label="值类型"
            rules={[{ required: true, message: '请选择值类型' }]}
          >
            <Select
              placeholder="请选择值类型"
              options={metadata?.valueTypes.map(v => ({
                label: (
                  <Space direction="vertical" size={0}>
                    <span>{v.label}</span>
                    <span style={{ fontSize: 12, color: '#999' }}>{v.description}</span>
                  </Space>
                ),
                value: v.key,
              }))}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.valueType !== curr.valueType}
          >
            {({ getFieldValue }) =>
              getFieldValue('valueType') === 'fixed' && (
                <Form.Item
                  name="fixedValue"
                  label="固定值"
                  rules={[{ required: true, message: '请输入固定值' }]}
                >
                  <Input placeholder="请输入固定值" />
                </Form.Item>
              )
            }
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="规则描述（可选）" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataPermissionConfig;
