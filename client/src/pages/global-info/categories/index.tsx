import React, { useRef, useState, useEffect } from 'react';
import { 
  Space, 
  Modal,
  Form,
  Input,
  App,
  Button,
  Popconfirm,
  InputNumber,
  Switch,
  Tag,
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

interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CategoriesPage: React.FC = () => {
  const intl = useIntl();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async (params: any) => {
    try {
      const response = await request('/api/v1/categories', {
        method: 'GET',
        params: {
          page: params.current,
          pageSize: params.pageSize,
          search: params.keyword,
          isActive: params.isActive,
        },
      });
      return {
        data: response.data || [],
        success: true,
        total: response.pagination?.total || 0,
      };
    } catch (error) {
      message.error(intl.formatMessage({ id: 'categories.message.fetchFailed' }));
      return { data: [], success: false, total: 0 };
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingCategory) {
        await request(`/api/v1/categories/${editingCategory.id}`, {
          method: 'PUT',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'categories.message.updateSuccess' }));
      } else {
        await request('/api/v1/categories', {
          method: 'POST',
          data: values,
        });
        message.success(intl.formatMessage({ id: 'categories.message.createSuccess' }));
      }

      setModalVisible(false);
      form.resetFields();
      setEditingCategory(null);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || intl.formatMessage({ id: 'categories.message.operationFailed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      });
      message.success(intl.formatMessage({ id: 'categories.message.deleteSuccess' }));
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || intl.formatMessage({ id: 'categories.message.deleteFailed' }));
    }
  };

  const openEditModal = (record: Category) => {
    setEditingCategory(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      sortOrder: record.sortOrder,
      isActive: record.isActive,
    });
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0, isActive: true });
    setModalVisible(true);
  };

  const columns: ProColumns<Category>[] = [
    {
      title: intl.formatMessage({ id: 'categories.column.code' }),
      dataIndex: 'code',
      width: 120,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'categories.column.name' }),
      dataIndex: 'name',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'categories.column.description' }),
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'categories.column.sortOrder' }),
      dataIndex: 'sortOrder',
      width: 80,
      search: false,
      sorter: true,
    },
    {
      title: intl.formatMessage({ id: 'categories.column.status' }),
      dataIndex: 'isActive',
      width: 80,
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
      title: intl.formatMessage({ id: 'categories.column.createdAt' }),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 160,
      search: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            {intl.formatMessage({ id: 'button.edit' })}
          </Button>
          <Popconfirm
            title={intl.formatMessage({ id: 'categories.deleteConfirm' })}
            description={intl.formatMessage({ id: 'categories.deleteDescription' })}
            onConfirm={() => handleDelete(record.id)}
            okText={intl.formatMessage({ id: 'button.confirm' })}
            cancelText={intl.formatMessage({ id: 'button.cancel' })}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              {intl.formatMessage({ id: 'button.delete' })}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'categories.title' }),
        subTitle: intl.formatMessage({ id: 'categories.subTitle' }),
      }}
    >
      <ProTable<Category>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchCategories}
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddModal}
          >
            {intl.formatMessage({ id: 'categories.add' })}
          </Button>,
        ]}
      />

      <Modal
        title={editingCategory ? intl.formatMessage({ id: 'categories.edit' }) : intl.formatMessage({ id: 'categories.add' })}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCategory(null);
        }}
        confirmLoading={loading}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sortOrder: 0, isActive: true }}
        >
          <Form.Item
            name="code"
            label={intl.formatMessage({ id: 'categories.form.code' })}
            rules={[
              { required: true, message: intl.formatMessage({ id: 'categories.form.codeRequired' }) },
              { pattern: /^[A-Z_]+$/, message: intl.formatMessage({ id: 'categories.form.codePattern' }) },
            ]}
            tooltip={intl.formatMessage({ id: 'categories.form.codeTooltip' })}
          >
            <Input 
              placeholder={intl.formatMessage({ id: 'categories.form.codePlaceholder' })} 
              disabled={!!editingCategory}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={intl.formatMessage({ id: 'categories.form.name' })}
            rules={[{ required: true, message: intl.formatMessage({ id: 'categories.form.nameRequired' }) }]}
          >
            <Input placeholder={intl.formatMessage({ id: 'categories.form.namePlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="description"
            label={intl.formatMessage({ id: 'categories.form.description' })}
          >
            <TextArea rows={3} placeholder={intl.formatMessage({ id: 'categories.form.descriptionPlaceholder' })} />
          </Form.Item>
          <Form.Item
            name="sortOrder"
            label={intl.formatMessage({ id: 'categories.form.sortOrder' })}
            tooltip={intl.formatMessage({ id: 'categories.form.sortOrderTooltip' })}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label={intl.formatMessage({ id: 'categories.form.status' })}
            valuePropName="checked"
          >
            <Switch checkedChildren={intl.formatMessage({ id: 'status.enabled' })} unCheckedChildren={intl.formatMessage({ id: 'status.disabled' })} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CategoriesPage;
