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
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { useCategoryExcel } from './useCategoryExcel';
import ImportModal from '@/components/ImportModal';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import CategoryNameText from '@/components/CategoryNameText';

const { TextArea } = Input;

interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

interface Category {
  id: number;
  code: string;
  name: string;
  nameI18n?: NameI18n | null;
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

  // 翻译弹窗状态
  const [translateModalVisible, setTranslateModalVisible] = useState(false);
  const [translatingCategory, setTranslatingCategory] = useState<Category | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateForm] = Form.useForm();

  // 导入导出功能
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useCategoryExcel({
    onImportSuccess: () => actionRef.current?.reload(),
  });

  // 导入字段说明
  const importFields = [
    { field: intl.formatMessage({ id: 'categories.form.code' }), description: intl.formatMessage({ id: 'categories.import.codeDesc' }), required: true },
    { field: intl.formatMessage({ id: 'categories.form.name' }), description: intl.formatMessage({ id: 'categories.import.nameDesc' }), required: true },
    { field: intl.formatMessage({ id: 'categories.form.description' }), description: intl.formatMessage({ id: 'categories.import.descriptionDesc' }), required: false },
    { field: intl.formatMessage({ id: 'categories.form.sortOrder' }), description: intl.formatMessage({ id: 'categories.import.sortOrderDesc' }), required: false },
  ];

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
      width: 150,
      render: (text, record) => (
        <Space size={4}>
          <CategoryNameText text={record.name} nameI18n={record.nameI18n} />
          <Button
            type="text"
            size="small"
            icon={<TranslationOutlined />}
            style={{ color: record.nameI18n && Object.keys(record.nameI18n).length > 0 ? '#52c41a' : '#999' }}
            onClick={(e) => {
              e.stopPropagation();
              setTranslatingCategory(record);
              translateForm.setFieldsValue({
                en: record.nameI18n?.en || '',
                th: record.nameI18n?.th || '',
                vi: record.nameI18n?.vi || '',
              });
              setTranslateModalVisible(true);
            }}
          />
        </Space>
      ),
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
        title: false,
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
            key="template"
            icon={<FileExcelOutlined />}
            onClick={handleDownloadTemplate}
          >
            {intl.formatMessage({ id: 'button.downloadTemplate' })}
          </Button>,
          <Button
            key="import"
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            {intl.formatMessage({ id: 'button.import' })}
          </Button>,
          <Button
            key="export"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            {intl.formatMessage({ id: 'button.export' })}
          </Button>,
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
              onChange={(e) => {
                const upperValue = e.target.value.toUpperCase();
                form.setFieldValue('code', upperValue);
              }}
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

      {/* 导入弹窗 */}
      <ImportModal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        title={intl.formatMessage({ id: 'categories.import.title' })}
        fields={importFields}
      />

      {/* 翻译弹窗 */}
      <Modal
        title={
          <Space>
            <TranslationOutlined />
            {intl.formatMessage({ id: 'categories.translate.title' })}
          </Space>
        }
        open={translateModalVisible}
        onOk={() => translateForm.submit()}
        onCancel={() => {
          setTranslateModalVisible(false);
          setTranslatingCategory(null);
          translateForm.resetFields();
        }}
        confirmLoading={translateLoading}
        width={500}
        destroyOnHidden
      >
        {translatingCategory && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ color: '#666', fontSize: 12 }}>
              {intl.formatMessage({ id: 'categories.translate.originalName' })}
            </div>
            <div style={{ fontWeight: 'bold' }}>{translatingCategory.name}</div>
          </div>
        )}
        <Form
          form={translateForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!translatingCategory) return;
            setTranslateLoading(true);
            try {
              const nameI18n: Record<string, string> = {};
              if (values.en?.trim()) nameI18n.en = values.en.trim();
              if (values.th?.trim()) nameI18n.th = values.th.trim();
              if (values.vi?.trim()) nameI18n.vi = values.vi.trim();
              
              console.log('保存翻译 - 品类ID:', translatingCategory.id);
              console.log('保存翻译 - nameI18n:', nameI18n);
              
              const result = await request(`/api/v1/categories/${translatingCategory.id}`, {
                method: 'PUT',
                data: { nameI18n: Object.keys(nameI18n).length > 0 ? nameI18n : null },
              });
              
              console.log('保存翻译 - 响应:', result);
              
              if (result.success) {
                message.success(intl.formatMessage({ id: 'categories.translate.success' }));
                setTranslateModalVisible(false);
                setTranslatingCategory(null);
                translateForm.resetFields();
                actionRef.current?.reload();
              } else {
                console.error('保存翻译失败 - 错误信息:', result.message);
                message.error(result.message || intl.formatMessage({ id: 'categories.translate.failed' }));
              }
            } catch (error: any) {
              console.error('保存翻译失败 - 异常:', error);
              console.error('错误详情:', error.response?.data || error.message);
              message.error(error.response?.data?.message || error.message || intl.formatMessage({ id: 'categories.translate.failed' }));
            } finally {
              setTranslateLoading(false);
            }
          }}
        >
          <Form.Item
            label={intl.formatMessage({ id: 'categories.form.nameEn' })}
            name="en"
          >
            <Input placeholder="Enter English name" />
          </Form.Item>
          <Form.Item
            label={intl.formatMessage({ id: 'categories.form.nameTh' })}
            name="th"
          >
            <Input placeholder="ป้อนชื่อภาษาไทย" />
          </Form.Item>
          <Form.Item
            label={intl.formatMessage({ id: 'categories.form.nameVi' })}
            name="vi"
          >
            <Input placeholder="Nhập tên tiếng Việt" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default CategoriesPage;
