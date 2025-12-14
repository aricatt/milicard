import React, { useRef, useState, useEffect } from 'react';
import { 
  Space, 
  Tag, 
  Modal,
  Form,
  Input,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
  Row,
  Col,
  InputNumber,
  Select,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { useGlobalProductExcel } from './useGlobalProductExcel';
import ImportModal from '@/components/ImportModal';
import type { FieldDescription } from '@/components/ImportModal';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl, getLocale } from '@umijs/max';
import { getCategoryDisplayName } from '@/components/GoodsNameText';

const { TextArea } = Input;

// 品类数据类型
interface Category {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

// 品类颜色映射（根据品类编码）
const CategoryColors: Record<string, string> = {
  'CARD': 'blue',
  'CARD_BRICK': 'cyan',
  'GIFT': 'magenta',
  'COLOR_PAPER': 'purple',
  'FORTUNE_SIGN': 'gold',
  'TEAR_CARD': 'orange',
  'TOY': 'green',
  'STAMP': 'geekblue',
  'LUCKY_CAT': 'red'
};

// 多语言名称类型
interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 全局商品数据类型定义（不包含基地级字段）
interface GlobalProduct {
  id: string;
  code: string;
  name: string;
  nameI18n?: NameI18n;
  categoryId?: number;
  category?: Category;  // 后端返回的品类关联对象
  manufacturer: string;
  description?: string;
  boxQuantity: number;
  packPerBox: number;
  piecePerPack: number;
  imageUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 商品统计数据类型
interface ProductStats {
  totalGoods: number;
  activeGoods: number;
  inactiveGoods: number;
  totalManufacturers: number;
}

/**
 * 全局商品管理页面
 * 管理商品的通用属性（名称、规格、厂商等），不包含基地级别的价格和状态
 */
const GlobalProductManagement: React.FC = () => {
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<ProductStats>({
    totalGoods: 0,
    activeGoods: 0,
    inactiveGoods: 0,
    totalManufacturers: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GlobalProduct | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 翻译弹窗状态
  const [translateModalVisible, setTranslateModalVisible] = useState(false);
  const [translatingProduct, setTranslatingProduct] = useState<GlobalProduct | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateForm] = Form.useForm();
  
  // 品类列表
  const [categories, setCategories] = useState<Category[]>([]);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 获取品类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await request('/api/v1/categories/all', { method: 'GET' });
        setCategories(result || []);
      } catch (error) {
        console.error('获取品类列表失败:', error);
      }
    };
    fetchCategories();
  }, []);

  // 使用导入导出 hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useGlobalProductExcel({
    onImportSuccess: () => actionRef.current?.reload(),
  });

  // 导入字段说明
  const importFields: FieldDescription[] = [
    { field: '商品编码', required: false, description: '可选，留空则系统自动生成', example: 'GOODS-J37SVPYQEXJ' },
    { field: '品类编码', required: true, description: '必须是系统中已存在的品类编码', example: 'CARD' },
    { field: '品类名称', required: false, description: '如果品类编码为空，则使用品类名称匹配', example: '卡牌' },
    { field: '商品名称', required: true, description: '商品的完整名称', example: '航海王和之国篇' },
    { field: '厂家名称', required: true, description: '生产厂家名称', example: '琦趣创想' },
    { field: '多少盒1箱', required: true, description: '每箱包含的盒数', example: '36' },
    { field: '多少包1盒', required: true, description: '每盒包含的包数', example: '10' },
    { field: '描述', required: false, description: '商品描述信息', example: '' },
  ];

  /**
   * 获取全局商品数据
   */
  const fetchProductData = async (params: any) => {
    try {
      const { current = 1, pageSize = 30, name, manufacturer, isActive } = params;
      
      // 构建查询参数
      const queryParams: any = {
        page: current,
        pageSize,
      };
      
      if (name) queryParams.search = name;
      if (manufacturer) queryParams.manufacturer = manufacturer;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request('/api/v1/global-goods', {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.pagination?.total || 0,
        };
      } else {
        message.error(result.message || intl.formatMessage({ id: 'globalProducts.message.fetchFailed' }));
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取全局商品数据失败:', error);
      message.error(intl.formatMessage({ id: 'globalProducts.message.fetchFailed' }));
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  /**
   * 计算统计数据
   */
  const calculateStats = (data: GlobalProduct[]) => {
    const newStats: ProductStats = {
      totalGoods: data.length,
      activeGoods: data.filter(p => p.isActive).length,
      inactiveGoods: data.filter(p => !p.isActive).length,
      totalManufacturers: new Set(data.map(p => p.manufacturer).filter(Boolean)).size,
    };
    setStats(newStats);
  };

  /**
   * 创建全局商品
   */
  const handleCreate = async (values: any) => {
    setCreateLoading(true);
    try {
      const result = await request('/api/v1/global-goods', {
        method: 'POST',
        data: {
          ...values,
          boxQuantity: 1,
        },
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'globalProducts.message.createSuccess' }));
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'globalProducts.message.createFailed' }));
      }
    } catch (error) {
      console.error('创建全局商品失败:', error);
      message.error(intl.formatMessage({ id: 'globalProducts.message.createFailed' }));
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新全局商品
   */
  const handleUpdate = async (values: any) => {
    if (!editingProduct) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(`/api/v1/global-goods/${editingProduct.id}`, {
        method: 'PUT',
        data: values,
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'globalProducts.message.updateSuccess' }));
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingProduct(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'globalProducts.message.updateFailed' }));
      }
    } catch (error) {
      console.error('更新全局商品失败:', error);
      message.error(intl.formatMessage({ id: 'globalProducts.message.updateFailed' }));
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除全局商品
   */
  const handleDelete = async (record: GlobalProduct) => {
    try {
      const result = await request(`/api/v1/global-goods/${record.id}`, {
        method: 'DELETE',
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'globalProducts.message.deleteSuccess' }));
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'globalProducts.message.deleteFailed' }));
      }
    } catch (error) {
      console.error('删除全局商品失败:', error);
      message.error(intl.formatMessage({ id: 'globalProducts.message.deleteFailed' }));
    }
  };

  /**
   * 编辑全局商品
   */
  const handleEdit = (record: GlobalProduct) => {
    setEditingProduct(record);
    editForm.setFieldsValue({
      name: record.name,
      categoryId: record.categoryId,
      manufacturer: record.manufacturer,
      description: record.description,
      packPerBox: record.packPerBox,
      piecePerPack: record.piecePerPack,
      imageUrl: record.imageUrl,
      notes: record.notes,
      isActive: record.isActive,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<GlobalProduct>[] = [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 160,
      fixed: 'left',
      copyable: true,
      hideInSearch: true,
      render: (text: any) => <code style={{ fontSize: 12 }}>{text}</code>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.category' }),
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        categories.map(cat => [cat.id, { text: cat.name }])
      ),
      render: (_, record) => {
        const categoryName = record.category?.name || '';
        const categoryCode = record.category?.code || '';
        const color = CategoryColors[categoryCode] || 'default';
        const displayName = getCategoryDisplayName(categoryCode, categoryName, getLocale());
        return displayName ? (
          <Tag color={color}>{displayName}</Tag>
        ) : (
          <Tag color="default">{intl.formatMessage({ id: 'products.uncategorized' })}</Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (text: any, record: GlobalProduct) => {
        // 根据当前语言获取对应的翻译名称
        const locale = getLocale();
        const localeKey = locale === 'en-US' ? 'en' : locale === 'th-TH' ? 'th' : locale === 'vi-VN' ? 'vi' : '';
        const displayName = (localeKey && record.nameI18n?.[localeKey]) || record.name;
        
        return (
          <Space size={4}>
            <strong>{displayName}</strong>
            <Tooltip title={intl.formatMessage({ id: 'products.translate.tooltip' })}>
              <Button
                type="text"
                size="small"
                icon={<TranslationOutlined />}
                style={{ color: record.nameI18n && Object.keys(record.nameI18n).length > 0 ? '#52c41a' : '#999' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setTranslatingProduct(record);
                  translateForm.setFieldsValue({
                    en: record.nameI18n?.en || '',
                    th: record.nameI18n?.th || '',
                    vi: record.nameI18n?.vi || '',
                  });
                  setTranslateModalVisible(true);
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.manufacturer' }),
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'products.column.packPerBox' }),
      dataIndex: 'packPerBox',
      key: 'packPerBox',
      width: 100,
      hideInSearch: true,
      align: 'center',
      render: (value: any) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.piecePerPack' }),
      dataIndex: 'piecePerPack',
      key: 'piecePerPack',
      width: 100,
      hideInSearch: true,
      align: 'center',
      render: (value: any) => <Tag color="green">{value}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.description' }),
      dataIndex: 'description',
      key: 'description',
      width: 200,
      hideInSearch: true,
      ellipsis: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
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
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      hideInSearch: true,
      valueType: 'dateTime',
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title={intl.formatMessage({ id: 'button.edit' })}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title={intl.formatMessage({ id: 'globalProducts.deleteConfirm' })}
            onConfirm={() => handleDelete(record)}
            okText={intl.formatMessage({ id: 'button.confirm' })}
            cancelText={intl.formatMessage({ id: 'button.cancel' })}
          >
            <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计信息内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.totalGoods' })}>
        {stats.totalGoods}
      </Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.activeGoods' })}>
        <Tag color="green">{stats.activeGoods}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.inactiveGoods' })}>
        <Tag color="default">{stats.inactiveGoods}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.totalManufacturers' })}>
        {stats.totalManufacturers}
      </Descriptions.Item>
    </Descriptions>
  );

  // 表单字段（全局属性，不包含价格和别名）
  const renderFormFields = (isEdit: boolean = false) => (
    <>
      <Row gutter={16}>
        <Col span={16}>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.name' })}
            name="name"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'products.form.nameRequired' }) },
              { min: 2, max: 100, message: intl.formatMessage({ id: 'products.form.nameLength' }) }
            ]}
          >
            <Input placeholder={intl.formatMessage({ id: 'products.form.namePlaceholder' })} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.category' })}
            name="categoryId"
            rules={[{ required: true, message: intl.formatMessage({ id: 'products.form.categoryRequired' }) }]}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'products.form.categoryPlaceholder' })}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={intl.formatMessage({ id: 'products.form.manufacturer' })}
        name="manufacturer"
        rules={[
          { required: true, message: intl.formatMessage({ id: 'products.form.manufacturerRequired' }) },
          { min: 2, max: 50, message: intl.formatMessage({ id: 'products.form.manufacturerLength' }) }
        ]}
      >
        <Input placeholder={intl.formatMessage({ id: 'products.form.manufacturerPlaceholder' })} />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'products.form.description' })}
        name="description"
      >
        <TextArea
          rows={2}
          placeholder={intl.formatMessage({ id: 'products.form.descriptionPlaceholder' })}
          maxLength={500}
          showCount
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.packPerBox' })}
            name="packPerBox"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'products.form.packPerBoxRequired' }) },
              { type: 'number', min: 1, message: intl.formatMessage({ id: 'products.form.packPerBoxMin' }) }
            ]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'products.form.packPerBoxPlaceholder' })}
              addonAfter={intl.formatMessage({ id: 'products.unit.packPerBox' })}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.piecePerPack' })}
            name="piecePerPack"
            rules={[
              { required: true, message: intl.formatMessage({ id: 'products.form.piecePerPackRequired' }) },
              { type: 'number', min: 1, message: intl.formatMessage({ id: 'products.form.piecePerPackMin' }) }
            ]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'products.form.piecePerPackPlaceholder' })}
              addonAfter={intl.formatMessage({ id: 'products.unit.piecePerPack' })}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={intl.formatMessage({ id: 'products.form.imageUrl' })}
        name="imageUrl"
      >
        <Input placeholder={intl.formatMessage({ id: 'products.form.imageUrlPlaceholder' })} />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'products.form.notes' })}
        name="notes"
      >
        <TextArea
          rows={2}
          placeholder={intl.formatMessage({ id: 'products.form.notesPlaceholder' })}
          maxLength={500}
          showCount
        />
      </Form.Item>

      {isEdit && (
        <Form.Item
          label={intl.formatMessage({ id: 'products.form.status' })}
          name="isActive"
          valuePropName="checked"
        >
          <Select
            options={[
              { value: true, label: intl.formatMessage({ id: 'status.enabled' }) },
              { value: false, label: intl.formatMessage({ id: 'status.disabled' }) },
            ]}
          />
        </Form.Item>
      )}
    </>
  );

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<GlobalProduct>
        actionRef={actionRef}
        columns={columns}
        request={fetchProductData}
        rowKey="id"
        
        columnsState={{
          persistenceKey: 'global-product-table-columns',
          persistenceType: 'localStorage',
        }}
        
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        
        options={{
          setting: {
            listsHeight: 400,
            draggable: true,
          },
          reload: () => actionRef.current?.reload(),
          density: true,
          fullScreen: true,
        }}
        
        scroll={{ x: 1200 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
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
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            {intl.formatMessage({ id: 'globalProducts.add' })}
          </Button>,
        ]}
        
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'globalProducts.title' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalGoods })})
            </span>
            <Popover
              content={statsContent}
              title={intl.formatMessage({ id: 'stats.title' })}
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                {intl.formatMessage({ id: 'stats.detail' })}
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 创建全局商品模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'globalProducts.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          {renderFormFields(false)}
        </Form>
      </Modal>

      {/* 编辑全局商品模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'globalProducts.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingProduct(null);
        }}
        confirmLoading={editLoading}
        width={600}
        destroyOnHidden
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          {renderFormFields(true)}
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        title="导入全局商品"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        loading={importLoading}
        progress={importProgress}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        fields={importFields}
        width={700}
      />

      {/* 翻译编辑弹窗 */}
      <Modal
        title={
          <Space>
            <TranslationOutlined />
            {intl.formatMessage({ id: 'products.translate.title' })}
          </Space>
        }
        open={translateModalVisible}
        onOk={() => translateForm.submit()}
        onCancel={() => {
          setTranslateModalVisible(false);
          setTranslatingProduct(null);
          translateForm.resetFields();
        }}
        confirmLoading={translateLoading}
        width={500}
        destroyOnHidden
      >
        {translatingProduct && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ color: '#666', fontSize: 12 }}>{intl.formatMessage({ id: 'products.translate.originalName' })}</div>
            <div style={{ fontWeight: 'bold' }}>{translatingProduct.name}</div>
          </div>
        )}
        <Form
          form={translateForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!translatingProduct) return;
            setTranslateLoading(true);
            try {
              const nameI18n: Record<string, string> = {};
              if (values.en?.trim()) nameI18n.en = values.en.trim();
              if (values.th?.trim()) nameI18n.th = values.th.trim();
              if (values.vi?.trim()) nameI18n.vi = values.vi.trim();
              
              const result = await request(`/api/v1/global-goods/${translatingProduct.id}`, {
                method: 'PUT',
                data: { nameI18n: Object.keys(nameI18n).length > 0 ? nameI18n : null },
              });
              
              if (result.success) {
                message.success(intl.formatMessage({ id: 'products.translate.success' }));
                setTranslateModalVisible(false);
                setTranslatingProduct(null);
                translateForm.resetFields();
                actionRef.current?.reload();
              } else {
                message.error(result.message || intl.formatMessage({ id: 'products.translate.failed' }));
              }
            } catch (error) {
              console.error('保存翻译失败:', error);
              message.error(intl.formatMessage({ id: 'products.translate.failed' }));
            } finally {
              setTranslateLoading(false);
            }
          }}
        >
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.nameEn' })}
            name="en"
          >
            <Input placeholder={intl.formatMessage({ id: 'products.form.nameEnPlaceholder' })} />
          </Form.Item>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.nameTh' })}
            name="th"
          >
            <Input placeholder={intl.formatMessage({ id: 'products.form.nameThPlaceholder' })} />
          </Form.Item>
          <Form.Item
            label={intl.formatMessage({ id: 'products.form.nameVi' })}
            name="vi"
          >
            <Input placeholder={intl.formatMessage({ id: 'products.form.nameViPlaceholder' })} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default GlobalProductManagement;
