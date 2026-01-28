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
import { request, useIntl, useModel } from '@umijs/max';

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
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSetting, setEditingSetting] = useState<GlobalSetting | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [valueType, setValueType] = useState<'string' | 'number' | 'boolean' | 'json'>('string');
  
  // 判断是否是 SUPER_ADMIN
  const isSuperAdmin = currentUser?.roles?.some((role: any) => role.name === 'SUPER_ADMIN') || false;

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
      message.error(intl.formatMessage({ id: 'globalSetting.message.fetchFailed' }));
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
        category: record.category ? [record.category] : [],
        isActive: record.isActive,
        isSystem: record.isSystem,
        valueType: detectedType,
      });
    } else {
      setEditingSetting(null);
      setValueType('string');
      form.resetFields();
      form.setFieldsValue({ isActive: true, isSystem: false, valueType: 'string' });
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
        throw new Error(intl.formatMessage({ id: 'globalSetting.message.jsonFormatError' }));
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

      const data: any = {
        key: values.key,
        value: parsedValue,
        description: values.description,
        category: Array.isArray(values.category) ? values.category[0] : values.category,
        isActive: values.isActive,
      };

      // 只有 SUPER_ADMIN 可以设置 isSystem
      if (isSuperAdmin && values.isSystem !== undefined) {
        data.isSystem = values.isSystem;
      }

      if (editingSetting) {
        await request(`/api/v1/global-settings/${editingSetting.id}`, {
          method: 'PUT',
          data,
        });
        message.success(intl.formatMessage({ id: 'globalSetting.message.updateSuccess' }));
      } else {
        await request('/api/v1/global-settings/', {
          method: 'POST',
          data,
        });
        message.success(intl.formatMessage({ id: 'globalSetting.message.createSuccess' }));
      }

      setModalVisible(false);
      actionRef.current?.reload();
    } catch (error: any) {
      if (error.message === intl.formatMessage({ id: 'globalSetting.message.jsonFormatError' })) {
        message.error(intl.formatMessage({ id: 'globalSetting.message.jsonFormatError' }));
      } else {
        message.error(intl.formatMessage({ id: 'globalSetting.message.operationFailed' }));
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
      message.success(intl.formatMessage({ id: 'globalSetting.message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error) {
      message.error(intl.formatMessage({ id: 'globalSetting.message.operationFailed' }));
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
      title: intl.formatMessage({ id: 'globalSetting.column.description' }),
      dataIndex: 'description',
      key: 'description',
      width: 250,
      fixed: 'left',
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'globalSetting.column.key' }),
      dataIndex: 'key',
      key: 'key',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record.isSystem && <Tag color="orange">{intl.formatMessage({ id: 'status.system' })}</Tag>}
        </Space>
      ),
    },
    {
      title: intl.formatMessage({ id: 'globalSetting.column.value' }),
      dataIndex: 'value',
      key: 'value',
      width: 250,
      search: false,
      ellipsis: true,
      render: (_, record) => renderValue(record.value),
    },
    {
      title: intl.formatMessage({ id: 'globalSetting.column.category' }),
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
      title: intl.formatMessage({ id: 'globalSetting.column.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: intl.formatMessage({ id: 'status.enabled' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'status.disabled' }), status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'default'}>
          {record.isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
        </Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'globalSetting.column.creator' }),
      dataIndex: ['creator', 'name'],
      key: 'creator',
      width: 120,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'globalSetting.column.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
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
          />
          {/* 只有 SUPER_ADMIN 且非系统参数时才显示删除按钮 */}
          {isSuperAdmin && !record.isSystem && (
            <Popconfirm
              title={intl.formatMessage({ id: 'globalSetting.deleteConfirm' })}
              onConfirm={() => handleDelete(record.id)}
              okText={intl.formatMessage({ id: 'button.confirm' })}
              cancelText={intl.formatMessage({ id: 'button.cancel' })}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
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
        toolBarRender={() => {
          const buttons = [];
          // 只有 SUPER_ADMIN 才能看到新增按钮
          if (isSuperAdmin) {
            buttons.push(
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                {intl.formatMessage({ id: 'globalSetting.add' })}
              </Button>
            );
          }
          return buttons;
        }}
        columnsState={{
          persistenceKey: 'global-setting-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            key: { show: false },
            category: { show: false },
            creator: { show: false },
          },
        }}
      />

      <Modal
        title={editingSetting ? intl.formatMessage({ id: 'globalSetting.edit' }) : intl.formatMessage({ id: 'globalSetting.add' })}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="key"
            label={intl.formatMessage({ id: 'globalSetting.form.key' })}
            rules={[
              { required: true, message: intl.formatMessage({ id: 'globalSetting.form.keyRequired' }) },
              { pattern: /^[a-zA-Z0-9_.-]+$/, message: intl.formatMessage({ id: 'globalSetting.form.keyPattern' }) },
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'globalSetting.form.keyPlaceholder' })} disabled={!!editingSetting} />
          </Form.Item>

          <Form.Item
            name="valueType"
            label={intl.formatMessage({ id: 'globalSetting.form.valueType' })}
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingSetting?.isSystem}
              onChange={(value) => setValueType(value)}
              options={[
                { label: intl.formatMessage({ id: 'globalSetting.form.valueTypeString' }), value: 'string' },
                { label: intl.formatMessage({ id: 'globalSetting.form.valueTypeNumber' }), value: 'number' },
                { label: intl.formatMessage({ id: 'globalSetting.form.valueTypeBoolean' }), value: 'boolean' },
                { label: intl.formatMessage({ id: 'globalSetting.form.valueTypeJson' }), value: 'json' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="value"
            label={intl.formatMessage({ id: 'globalSetting.form.value' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'globalSetting.form.valueRequired' }) }]}
          >
            {valueType === 'boolean' ? (
              <Switch checkedChildren="true" unCheckedChildren="false" />
            ) : valueType === 'json' ? (
              <TextArea
                rows={6}
                placeholder={intl.formatMessage({ id: 'globalSetting.form.valueJsonPlaceholder' })}
                style={{ fontFamily: 'monospace' }}
              />
            ) : valueType === 'number' ? (
              <Input type="number" placeholder={intl.formatMessage({ id: 'globalSetting.form.valuePlaceholder' })} />
            ) : (
              <Input placeholder={intl.formatMessage({ id: 'globalSetting.form.valuePlaceholder' })} />
            )}
          </Form.Item>

          <Form.Item
            name="category"
            label={intl.formatMessage({ id: 'globalSetting.form.category' })}
          >
            <Select
              disabled={editingSetting?.isSystem}
              placeholder={intl.formatMessage({ id: 'globalSetting.form.categoryPlaceholder' })}
              allowClear
              showSearch
              mode="tags"
              maxCount={1}
              options={categories.map(cat => ({ label: cat, value: cat }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={intl.formatMessage({ id: 'globalSetting.form.description' })}
          >
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'globalSetting.form.descriptionPlaceholder' })} />
          </Form.Item>

          {/* 系统参数标记 - 只有 SUPER_ADMIN 可见 */}
          {isSuperAdmin && (
            <Form.Item
              name="isSystem"
              label={intl.formatMessage({ id: 'globalSetting.form.isSystem' })}
              valuePropName="checked"
              tooltip={intl.formatMessage({ id: 'globalSetting.form.isSystemTooltip' })}
            >
              <Switch checkedChildren={intl.formatMessage({ id: 'common.yes' })} unCheckedChildren={intl.formatMessage({ id: 'common.no' })} />
            </Form.Item>
          )}

          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'globalSetting.form.status' })}
            valuePropName="checked"
          >
            <Switch disabled={editingSetting?.isSystem && !isSuperAdmin} checkedChildren={intl.formatMessage({ id: 'status.enabled' })} unCheckedChildren={intl.formatMessage({ id: 'status.disabled' })} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GlobalSettingPage;
