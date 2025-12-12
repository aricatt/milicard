import React, { useRef, useState } from 'react';
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
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';

const { TextArea } = Input;

// 商品品类枚举
enum GoodsCategory {
  CARD = 'CARD',
  CARD_BRICK = 'CARD_BRICK',
  GIFT = 'GIFT',
  COLOR_PAPER = 'COLOR_PAPER',
  FORTUNE_SIGN = 'FORTUNE_SIGN',
  TEAR_CARD = 'TEAR_CARD',
  TOY = 'TOY',
  STAMP = 'STAMP',
  LUCKY_CAT = 'LUCKY_CAT'
}

// 品类中文映射
const GoodsCategoryLabels: Record<GoodsCategory, string> = {
  [GoodsCategory.CARD]: '卡牌',
  [GoodsCategory.CARD_BRICK]: '卡砖',
  [GoodsCategory.GIFT]: '礼物',
  [GoodsCategory.COLOR_PAPER]: '色纸',
  [GoodsCategory.FORTUNE_SIGN]: '上上签',
  [GoodsCategory.TEAR_CARD]: '撕撕乐',
  [GoodsCategory.TOY]: '玩具',
  [GoodsCategory.STAMP]: '邮票',
  [GoodsCategory.LUCKY_CAT]: '招财猫'
};

// 品类颜色映射
const GoodsCategoryColors: Record<GoodsCategory, string> = {
  [GoodsCategory.CARD]: 'blue',
  [GoodsCategory.CARD_BRICK]: 'cyan',
  [GoodsCategory.GIFT]: 'magenta',
  [GoodsCategory.COLOR_PAPER]: 'purple',
  [GoodsCategory.FORTUNE_SIGN]: 'gold',
  [GoodsCategory.TEAR_CARD]: 'orange',
  [GoodsCategory.TOY]: 'green',
  [GoodsCategory.STAMP]: 'geekblue',
  [GoodsCategory.LUCKY_CAT]: 'red'
};

// 品类选项列表
const categoryOptions = Object.entries(GoodsCategoryLabels).map(([value, label]) => ({
  value,
  label
}));

// 全局商品数据类型定义（不包含基地级字段）
interface GlobalProduct {
  id: string;
  code: string;
  name: string;
  category: GoodsCategory;
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
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

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
      category: record.category,
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
      dataIndex: 'category',
      key: 'category',
      width: 80,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(GoodsCategoryLabels).map(([key, label]) => [key, { text: label }])
      ),
      render: (_, record) => {
        const category = record.category || GoodsCategory.CARD;
        return (
          <Tag color={GoodsCategoryColors[category]}>
            {GoodsCategoryLabels[category]}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (text: any) => <strong>{text}</strong>,
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
      render: (value: any) => <Tag color="blue">{value} {intl.formatMessage({ id: 'products.unit.pack' })}/箱</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.piecePerPack' }),
      dataIndex: 'piecePerPack',
      key: 'piecePerPack',
      width: 100,
      hideInSearch: true,
      align: 'center',
      render: (value: any) => <Tag color="green">{value} {intl.formatMessage({ id: 'products.unit.piece' })}/盒</Tag>,
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
            name="category"
            initialValue={GoodsCategory.CARD}
            rules={[{ required: true, message: intl.formatMessage({ id: 'products.form.categoryRequired' }) }]}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'products.form.categoryPlaceholder' })}
              options={categoryOptions}
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
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        toolBarRender={() => [
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
    </PageContainer>
  );
};

export default GlobalProductManagement;
