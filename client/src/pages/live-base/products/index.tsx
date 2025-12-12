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
  Image,
  InputNumber,
  Select,
  Tooltip,
} from 'antd';
import { 
  PlusOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ShoppingOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  ShopOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import styles from './index.less';
import { useProductExcel } from './useProductExcel';
import ImportModal from '@/components/ImportModal';

const { TextArea } = Input;

// 商品品类枚举
enum GoodsCategory {
  CARD = 'CARD',             // 卡牌
  CARD_BRICK = 'CARD_BRICK', // 卡砖
  GIFT = 'GIFT',             // 礼物
  COLOR_PAPER = 'COLOR_PAPER', // 色纸
  FORTUNE_SIGN = 'FORTUNE_SIGN', // 上上签
  TEAR_CARD = 'TEAR_CARD',   // 撕撕乐
  TOY = 'TOY',               // 玩具
  STAMP = 'STAMP',           // 邮票
  LUCKY_CAT = 'LUCKY_CAT'    // 招财猫
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

// 商品数据类型定义
interface Product {
  id: string;
  code: string;
  name: string;
  category: GoodsCategory;
  alias?: string;
  manufacturer: string;
  description?: string;
  retailPrice: number;
  packPrice?: number;
  purchasePrice?: number;
  boxQuantity: number;
  packPerBox: number;
  piecePerPack: number;
  imageUrl?: string;
  notes?: string;
  baseId: number;
  isActive: boolean | string | number;
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
 * 商品管理页面 - ProTable 版本
 * 基地中心化的商品管理，统一管理商品信息
 */
const ProductManagement: React.FC = () => {
  const { currentBase, initialized } = useBase();
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useProductExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => actionRef.current?.reload(),
  });

  /**
   * 获取商品数据
   */
  const fetchProductData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 30, name, manufacturer, isActive } = params;
      
      // 构建查询参数
      const queryParams: any = {
        page: current,  // 商品API使用 page 而不是 current
        pageSize,
      };
      
      if (name) queryParams.search = name;  // 商品API使用 search
      if (manufacturer) queryParams.manufacturer = manufacturer;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.pagination?.total || 0,  // 商品API返回 pagination.total
        };
      } else {
        message.error(result.message || '获取商品数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取商品数据失败:', error);
      message.error('获取商品数据失败');
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
  const calculateStats = (data: Product[]) => {
    const newStats: ProductStats = {
      totalGoods: data.length,
      activeGoods: data.filter(p => p.isActive === true || p.isActive === 'true' || p.isActive === 1).length,
      inactiveGoods: data.filter(p => !(p.isActive === true || p.isActive === 'true' || p.isActive === 1)).length,
      totalManufacturers: new Set(data.map(p => p.manufacturer).filter(Boolean)).size,
    };
    setStats(newStats);
  };

  /**
   * 创建商品
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        method: 'POST',
        data: {
          ...values,
          boxQuantity: 1,  // 箱数固定为1
        },
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建商品失败:', error);
      message.error('创建商品失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新商品
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingProduct) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/goods/${editingProduct.id}`,
        {
          method: 'PUT',
          data: values,
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingProduct(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新商品失败:', error);
      message.error('更新商品失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除商品
   */
  const handleDelete = async (record: Product) => {
    if (!currentBase) {
      return;
    }

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/goods/${record.id}`,
        {
          method: 'DELETE',
        }
      );

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除商品失败:', error);
      message.error('删除商品失败');
    }
  };

  /**
   * 编辑商品
   */
  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    editForm.setFieldsValue({
      name: record.name,
      category: record.category,
      alias: record.alias,
      manufacturer: record.manufacturer,
      description: record.description,
      retailPrice: typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice as any || '0'),
      packPrice: typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice as any || '0'),
      purchasePrice: typeof record.purchasePrice === 'number' ? record.purchasePrice : parseFloat(record.purchasePrice as any || '0'),
      packPerBox: record.packPerBox,
      piecePerPack: record.piecePerPack,
      imageUrl: record.imageUrl,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<Product>[] = [
    {
      title: intl.formatMessage({ id: 'table.column.id' }),
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
      hideInTable: false,
      render: (id: any) => String(id).slice(-8),
    },
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: 'code',
      key: 'code',
      width: 140,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      hideInSearch: true,
      render: (text: string) => <code style={{ fontSize: 12 }}>{text}</code>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 60,
      fixed: 'left',
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
      fixed: 'left',
      hideInSetting: true,
      hideInSearch: false,
      ellipsis: true,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.alias' }),
      dataIndex: 'alias',
      key: 'alias',
      width: 150,
      hideInSearch: true,
      hideInTable: false,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'products.column.manufacturer' }),
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 60,
      hideInSearch: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'products.column.retailPrice' }),
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 120,
      hideInSearch: true,
      align: 'right',
      render: (price: number) => (
        <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
          {typeof price === 'number' ? price.toFixed(2) : parseFloat(price || '0').toFixed(2)}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'products.column.packPrice' }),
      dataIndex: 'packPrice',
      key: 'packPrice',
      width: 100,
      hideInSearch: true,
      hideInTable: false,
      align: 'right',
      render: (price: number) => price ? (
        <span style={{ color: '#fa8c16' }}>
          {typeof price === 'number' ? price.toFixed(2) : parseFloat(price || '0').toFixed(2)}
        </span>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'products.column.purchasePrice' }),
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      width: 100,
      hideInSearch: true,
      hideInTable: false,
      align: 'right',
      render: (price: number) => price ? (
        <span style={{ color: '#52c41a' }}>
          {typeof price === 'number' ? price.toFixed(2) : parseFloat(price || '0').toFixed(2)}
        </span>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'products.column.boxQuantity' }),
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 60,
      hideInSearch: true,
      hideInTable: false,
      align: 'center',
      render: (num: number) => <Tag color="blue">{num}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.packPerBox' }),
      dataIndex: 'packPerBox',
      key: 'packPerBox',
      width: 60,
      hideInSearch: true,
      align: 'center',
      render: (num: number) => <Tag color="cyan">{num}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.piecePerPack' }),
      dataIndex: 'piecePerPack',
      key: 'piecePerPack',
      width: 60,
      hideInSearch: true,
      align: 'center',
      render: (num: number) => <Tag color="geekblue">{num}</Tag>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.image' }),
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 60,
      hideInSearch: true,
      hideInTable: false,
      align: 'center',
      render: (url: string) => url ? (
        <Image
          src={url}
          alt="商品图片"
          width={50}
          height={50}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.notes' }),
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
      render: (text: string) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 60,
      valueType: 'select',
      valueEnum: {
        true: { text: intl.formatMessage({ id: 'status.enabled' }), status: 'Success' },
        false: { text: intl.formatMessage({ id: 'status.disabled' }), status: 'Error' },
      },
      render: (_, record) => {
        const isActive = record.isActive === true || record.isActive === 'true' || record.isActive === 1;
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? intl.formatMessage({ id: 'status.enabled' }) : intl.formatMessage({ id: 'status.disabled' })}
          </Tag>
        );
      },
      hideInSearch: false,
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
      render: (_, record) => {
        if (!record.createdAt) return '-';
        try {
          const date = new Date(record.createdAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.updatedAt' }),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      valueType: 'dateTime',
      hideInSearch: true,
      hideInTable: false,
      render: (_, record) => {
        if (!record.updatedAt) return '-';
        try {
          const date = new Date(record.updatedAt);
          if (isNaN(date.getTime())) return '-';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (error) {
          return '-';
        }
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 60,
      fixed: 'right',
      valueType: 'option',
      hideInSetting: true,
      render: (_, record) => [
        <Tooltip key="edit" title={intl.formatMessage({ id: 'button.edit' })}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title={intl.formatMessage({ id: 'message.deleteConfirm' })}
          description={`${intl.formatMessage({ id: 'message.deleteConfirmContent' })}`}
          onConfirm={() => handleDelete(record)}
          okText={intl.formatMessage({ id: 'button.confirm' })}
          cancelText={intl.formatMessage({ id: 'button.cancel' })}
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Tooltip>
        </Popconfirm>,
      ],
    },
  ];

  // 等待 Context 初始化完成
  if (!initialized) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>加载中...</p>
        </div>
      </PageContainer>
    );
  }

  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>请先选择一个基地</p>
        </div>
      </PageContainer>
    );
  }

  // 统计详情弹出内容
  const statsContent = (
    <div style={{ width: 300 }}>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="商品总数">
          <Space>
            <ShoppingOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalGoods}</span>
            <span style={{ color: '#999' }}>个</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="启用商品">
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{stats.activeGoods}</span>
            <span style={{ color: '#999' }}>({stats.totalGoods > 0 ? ((stats.activeGoods / stats.totalGoods) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="禁用商品">
          <Space>
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{stats.inactiveGoods}</span>
            <span style={{ color: '#999' }}>({stats.totalGoods > 0 ? ((stats.inactiveGoods / stats.totalGoods) * 100).toFixed(1) : 0}%)</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="厂家数量">
          <Space>
            <ShopOutlined style={{ color: '#722ed1' }} />
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.totalManufacturers}</span>
            <span style={{ color: '#999' }}>家</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer header={{ title: false }}>
      {/* ProTable */}
      <ProTable<Product>
        columns={columns}
        actionRef={actionRef}
        request={fetchProductData}
        rowKey="id"
        
        // 列状态配置 - 持久化到 localStorage
        columnsState={{
          persistenceKey: 'product-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            // 默认隐藏的列
            id: { show: false },
            alias: { show: false },
            packPrice: { show: false },
            purchasePrice: { show: false },
            imageUrl: { show: false },
            notes: { show: false },
            updatedAt: { show: false },
          },
        }}
        
        // 搜索表单配置
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
          optionRender: (searchConfig, formProps, dom) => [
            ...dom.reverse(),
          ],
        }}
        
        // 工具栏配置
        options={{
          setting: {
            listsHeight: 400,
            draggable: true,
          },
          reload: () => {
            actionRef.current?.reload();
          },
          density: true,
          fullScreen: true,
        }}
        
        // 表格配置
        scroll={{ x: 1600 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        // 工具栏按钮
        toolBarRender={() => [
          <Button
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            {intl.formatMessage({ id: 'button.downloadTemplate' })}
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            {intl.formatMessage({ id: 'button.import' })}
          </Button>,
          <Button
            key="export"
            icon={<ExportOutlined />}
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
            {intl.formatMessage({ id: 'products.add' })}
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.products' })}</span>
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

      {/* 创建商品模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'products.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.alias' })}
                name="alias"
              >
                <Input placeholder={intl.formatMessage({ id: 'products.form.aliasPlaceholder' })} />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'products.form.description' })}
            name="description"
          >
            <TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'products.form.descriptionPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.retailPrice' })}
                name="retailPrice"
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'products.form.retailPriceRequired' }) },
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.retailPriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.retailPricePlaceholder' })}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.packPrice' })}
                name="packPrice"
                rules={[
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.packPriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.packPricePlaceholder' })}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.boxQuantity' })}
                name="boxQuantity"
                initialValue={1}
                extra={intl.formatMessage({ id: 'products.form.boxQuantityHint' })}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  value={1}
                  disabled
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.packPerBox' })}
                name="packPerBox"
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'products.form.packPerBoxRequired' }) },
                  { type: 'number', min: 1, message: intl.formatMessage({ id: 'products.form.packPerBoxMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.packPerBoxPlaceholder' })}
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.piecePerPack' })}
                name="piecePerPack"
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'products.form.piecePerPackRequired' }) },
                  { type: 'number', min: 1, message: intl.formatMessage({ id: 'products.form.piecePerPackMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.piecePerPackPlaceholder' })}
                  min={1}
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
              rows={3}
              placeholder={intl.formatMessage({ id: 'products.form.notesPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑商品模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'products.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingProduct(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
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
                rules={[{ required: true, message: intl.formatMessage({ id: 'products.form.categoryRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'products.form.categoryPlaceholder' })}
                  options={categoryOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.alias' })}
                name="alias"
              >
                <Input placeholder={intl.formatMessage({ id: 'products.form.aliasPlaceholder' })} />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'products.form.description' })}
            name="description"
          >
            <TextArea
              rows={3}
              placeholder={intl.formatMessage({ id: 'products.form.descriptionPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.retailPrice' })}
                name="retailPrice"
                rules={[
                  { required: true, message: intl.formatMessage({ id: 'products.form.retailPriceRequired' }) },
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.retailPriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.retailPricePlaceholder' })}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.packPrice' })}
                name="packPrice"
                rules={[
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.packPriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.packPricePlaceholder' })}
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

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
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.packPerBoxPlaceholder' })}
                  min={1}
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
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.piecePerPackPlaceholder' })}
                  min={1}
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
              rows={3}
              placeholder={intl.formatMessage({ id: 'products.form.notesPlaceholder' })}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入商品模态框 */}
      <ImportModal
        title="导入商品数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        loading={importLoading}
        progress={importProgress}
        onImport={handleImport}
        width={700}
        fields={[
          { field: '品类', required: false, description: '卡牌/卡砖/礼物/色纸/上上签/撕撕乐/玩具/邮票/招财猫', example: '卡牌' },
          { field: '商品名称', required: true, description: '商品名称（基地内唯一）', example: '琦趣创想航海王' },
          { field: '商品别名', required: false, description: '商品别名或简称', example: '' },
          { field: '厂家名称', required: true, description: '生产厂家名称', example: '琦趣创想' },
          { field: '零售价(一箱)', required: true, description: '一箱的零售价格', example: '22356' },
          { field: '多少盒1箱', required: true, description: '每箱包含多少盒', example: '36' },
          { field: '多少包1盒', required: true, description: '每盒包含多少包', example: '10' },
        ]}
      />
    </PageContainer>
  );
};

export default ProductManagement;
