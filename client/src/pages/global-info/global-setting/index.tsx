import React, { useRef, useState } from 'react';
import { 
  Space, 
  Modal,
  Form,
  Input,
  App,
  Button,
  Popconfirm,
  Switch,
  Tag,
  Select,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';

const { TextArea } = Input;

interface GlobalSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
}

const GlobalSettingPage: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSetting, setEditingSetting] = useState<GlobalSetting | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [valueType, setValueType] = useState<'string' | 'number' | 'boolean' | 'json'>('string');

  // 获取配置列表
  const fetchSettings = async (params: any) => {
    try {
      const response = await request('/api/v1/global-settings/', {
        method: 'GET',
        params: {
          page: params.current || 1,
          pageSize: params.pageSize || 20,
          search: params.key || params.description,
          category: params.category,
          isActive: params.isActive,
        },
      });
      
      return {
        data: response.data || [],
        success: response.success,
        total: response.pagination?.total || 0,
      };
    } catch (error) {
      message.error('获取配置列表失败');
      return { data: [], success: false, total: 0 };
    }
  };

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await request('/api/v1/global-settings/categories', {
        method: 'GET',
      });
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // 打开新增/编辑弹窗
  const handleOpenModal = (record?: GlobalSetting) => {
    if (record) {
      setEditingSetting(record);
      // 检测值的类型
      const detectedType = detectValueType(record.value);
      setValueType(detectedType);
      
      form.setFieldsValue({
        key: record.key,
        value: formatValueForForm(record.value, detectedType),
        description: record.description,
        category: record.category,
        isActive: record.isActive,
        valueType: detectedType,
      });
    } else {
      setEditingSetting(null);
      setValueType('string');
      form.resetFields();
      form.setFieldsValue({ isActive: true, valueType: 'string' });
    }
    setModalVisible(true);
    fetchCategories();
  };

  // 检测值的类型
  const detectValueType = (value: any): 'string' | 'number' | 'boolean' | 'json' => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    return 'json';
  };

  // 格式化值用于表单显示
  const formatValueForForm = (value: any, type: string): any => {
    if (type === 'json') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  // 解析表单值
  const parseFormValue = (value: any, type: string): any => {
    if (type === 'json') {
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new Error('JSON 格式错误');
      }
    }
    if (type === 'number') {
      return Number(value);
    }
    if (type === 'boolean') {
      return Boolean(value);
    }
    return value;
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 解析值
      const parsedValue = parseFormValue(values.value, values.valueType);

      const data = {
        key: values.key,
        value: parsedValue,
        description: values.description,
        category: values.category,
        isActive: values.isActive,
      };

      if (editingSetting) {
        await request(`/api/v1/global-settings/${editingSetting.id}`, {
          method: 'PUT',
          data,
        });
        message.success('更新成功');
      } else {
        await request('/api/v1/global-settings/', {
          method: 'POST',
          data,
        });
        message.success('创建成功');
      }

      setModalVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      if (error.message === 'JSON 格式错误') {
        message.error('JSON 格式错误，请检查');
      } else {
        message.error(editingSetting ? '更新失败' : '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 删除配置
  const handleDelete = async (id: string) => {
    try {
      await request(`/api/v1/global-settings/${id}`, {
        method: 'DELETE',
      });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 渲染值
  const renderValue = (value: any) => {
    if (typeof value === 'boolean') {
      return <Tag color={value ? 'green' : 'red'}>{value ? 'true' : 'false'}</Tag>;
    }
    if (typeof value === 'number') {
      return <Tag color="blue">{value}</Tag>;
    }
    if (typeof value === 'string') {
      return <span>{value.length > 50 ? `${value.substring(0, 50)}...` : value}</span>;
    }
    return <Tag color="purple">JSON</Tag>;
  };

  const columns: ProColumns<GlobalSetting>[] = [
    {
      title: '配置键名',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record.isSystem && <Tag color="orange">系统</Tag>}
        </Space>
      ),
    },
    {
      title: '配置值',
      dataIndex: 'value',
      key: 'value',
      width: 250,
      search: false,
      ellipsis: true,
      render: (_, record) => renderValue(record.value),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      valueType: 'select',
      fieldProps: {
        showSearch: true,
        options: categories.map(cat => ({ label: cat, value: cat })),
      },
      render: (text) => text ? <Tag>{text}</Tag> : '-',
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      search: false,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建人',
      dataIndex: ['creator', 'name'],
      key: 'creator',
      width: 120,
      search: false,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      search: false,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          {!record.isSystem && (
            <Popconfirm
              title="确定删除这条配置吗？"
              onConfirm={() => handleDelete(record.id)}
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
    <PageContainer>
      <ProTable<GlobalSetting>
        columns={columns}
        actionRef={actionRef}
        request={fetchSettings}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingSetting ? '编辑配置' : '新增配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="key"
            label="配置键名"
            rules={[
              { required: true, message: '请输入配置键名' },
              { pattern: /^[a-zA-Z0-9_.-]+$/, message: '只能包含字母、数字、下划线、点和横线' },
            ]}
          >
            <Input placeholder="例如: system.max_upload_size" disabled={!!editingSetting} />
          </Form.Item>

          <Form.Item
            name="valueType"
            label="值类型"
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingSetting?.isSystem}
              onChange={(value) => setValueType(value)}
              options={[
                { label: '字符串', value: 'string' },
                { label: '数字', value: 'number' },
                { label: '布尔值', value: 'boolean' },
                { label: 'JSON', value: 'json' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            {valueType === 'boolean' ? (
              <Switch checkedChildren="true" unCheckedChildren="false" />
            ) : valueType === 'json' ? (
              <TextArea
                rows={6}
                placeholder='例如: {"key": "value"}'
                style={{ fontFamily: 'monospace' }}
              />
            ) : valueType === 'number' ? (
              <Input type="number" placeholder="请输入数字" />
            ) : (
              <Input placeholder="请输入配置值" />
            )}
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
          >
            <Select
              disabled={editingSetting?.isSystem}
              placeholder="请选择或输入分类"
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
              options={categories.map(cat => ({ label: cat, value: cat }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="说明"
          >
            <TextArea rows={3} placeholder="请输入配置说明" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
          >
            <Switch disabled={editingSetting?.isSystem} checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GlobalSettingPage;
