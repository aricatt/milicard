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
  const actionRef = useRef<ActionType>();
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
      message.error('获取品类列表失败');
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
        message.success('品类更新成功');
      } else {
        await request('/api/v1/categories', {
          method: 'POST',
          data: values,
        });
        message.success('品类创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingCategory(null);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      });
      message.success('品类删除成功');
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.error || '删除失败');
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
      title: '品类编码',
      dataIndex: 'code',
      width: 120,
      copyable: true,
    },
    {
      title: '品类名称',
      dataIndex: 'name',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      search: false,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
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
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 160,
      search: false,
    },
    {
      title: '操作',
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
            编辑
          </Button>
          <Popconfirm
            title="确定删除该品类吗？"
            description="删除后无法恢复，且该品类下不能有商品"
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
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'menu.global-info.categories', defaultMessage: '商品品类' }),
        subTitle: '管理商品品类信息',
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
            新增品类
          </Button>,
        ]}
      />

      <Modal
        title={editingCategory ? '编辑品类' : '新增品类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingCategory(null);
        }}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ sortOrder: 0, isActive: true }}
        >
          <Form.Item
            name="code"
            label="品类编码"
            rules={[
              { required: true, message: '请输入品类编码' },
              { pattern: /^[A-Z_]+$/, message: '编码只能包含大写字母和下划线' },
            ]}
            tooltip="编码用于系统内部标识，如 CARD, TOY"
          >
            <Input 
              placeholder="请输入品类编码，如 CARD" 
              disabled={!!editingCategory}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="品类名称"
            rules={[{ required: true, message: '请输入品类名称' }]}
          >
            <Input placeholder="请输入品类名称，如 卡牌" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入品类描述（可选）" />
          </Form.Item>
          <Form.Item
            name="sortOrder"
            label="排序"
            tooltip="数字越小排序越靠前"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CategoriesPage;
