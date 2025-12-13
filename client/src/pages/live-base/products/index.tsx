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
  Alert,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl, getLocale } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import { useProductExcel } from './useProductExcel';
import ImportModal from '@/components/ImportModal';
import type { FieldDescription } from '@/components/ImportModal';
import GoodsNameText, { getLocalizedGoodsName } from '@/components/GoodsNameText';
import GlobalGoodsSelectModal from '@/components/GlobalGoodsSelectModal';

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

// 多语言名称类型
interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 全局商品类型（用于选择）
interface GlobalProduct {
  id: string;
  code: string;
  name: string;
  nameI18n?: NameI18n | null;
  categoryId?: number;
  category?: {
    id: number;
    code: string;
    name: string;
  };
  manufacturer: string;
  packPerBox: number;
  piecePerPack: number;
}

// 基地商品设置类型
interface ProductSetting {
  id: string;
  goodsId: string;
  baseId: number;
  retailPrice: number;
  purchasePrice?: number;
  packPrice?: number;
  alias?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // 关联的全局商品信息
  goods: GlobalProduct;
}

// 商品统计数据类型
interface ProductStats {
  totalSettings: number;
  activeSettings: number;
  inactiveSettings: number;
}

/**
 * 商品设置页面
 * 管理基地级别的商品配置（价格、别名、状态等）
 */
const ProductSettingsPage: React.FC = () => {
  const { currentBase, initialized } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType | null>(null);
  
  // 状态管理
  const [stats, setStats] = useState<ProductStats>({
    totalSettings: 0,
    activeSettings: 0,
    inactiveSettings: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ProductSetting | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // 全局商品选择
  const [goodsSelectModalVisible, setGoodsSelectModalVisible] = useState(false);
  const [selectedGlobalProduct, setSelectedGlobalProduct] = useState<GlobalProduct | null>(null);
  const [existingGoodsIds, setExistingGoodsIds] = useState<string[]>([]);
  
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

  // 导入字段说明
  const importFields: FieldDescription[] = [
    { field: '商品编号', required: true, description: '必须是全局商品库中已存在的商品编号', example: 'GOODS-ABC123' },
    { field: '商品名称', required: false, description: '如果商品编号为空，则使用商品名称匹配', example: '航海王和之国篇' },
    { field: '商品别名', required: false, description: '本基地使用的商品别名', example: '航海王' },
    { field: '零售价(一箱)', required: true, description: '本基地的零售价格（单位：分）', example: '22356' },
    { field: '采购价(一箱)', required: false, description: '本基地的采购价格（单位：分）', example: '18000' },
  ];

  /**
   * 获取基地商品设置数据
   */
  const fetchProductSettings = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 30, name, manufacturer, isActive } = params;
      
      const queryParams: any = {
        page: current,
        pageSize,
      };
      
      if (name) queryParams.search = name;
      if (manufacturer) queryParams.manufacturer = manufacturer;
      if (isActive !== undefined) queryParams.isActive = isActive;

      const result = await request(`/api/v1/bases/${currentBase.id}/goods-settings`, {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        calculateStats(result.data || []);
        // 更新已存在的商品ID列表（用于商品选择弹窗排除）
        setExistingGoodsIds((result.data || []).map((item: ProductSetting) => item.goodsId));
        
        return {
          data: result.data || [],
          success: true,
          total: result.pagination?.total || 0,
        };
      } else {
        message.error(result.message || intl.formatMessage({ id: 'productSettings.message.fetchFailed' }));
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取商品设置数据失败:', error);
      message.error(intl.formatMessage({ id: 'productSettings.message.fetchFailed' }));
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
  const calculateStats = (data: ProductSetting[]) => {
    const newStats: ProductStats = {
      totalSettings: data.length,
      activeSettings: data.filter(p => p.isActive).length,
      inactiveSettings: data.filter(p => !p.isActive).length,
    };
    setStats(newStats);
  };

  /**
   * 创建商品设置
   */
  const handleCreate = async (values: any) => {
    if (!currentBase || !selectedGlobalProduct) {
      message.error(intl.formatMessage({ id: 'productSettings.message.selectProductFirst' }));
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/goods-settings`, {
        method: 'POST',
        data: {
          goodsId: selectedGlobalProduct.id,
          ...values,
        },
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'productSettings.message.createSuccess' }));
        setCreateModalVisible(false);
        createForm.resetFields();
        setSelectedGlobalProduct(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'productSettings.message.createFailed' }));
      }
    } catch (error) {
      console.error('创建商品设置失败:', error);
      message.error(intl.formatMessage({ id: 'productSettings.message.createFailed' }));
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新商品设置
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingSetting) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/goods-settings/${editingSetting.id}`,
        {
          method: 'PUT',
          data: values,
        }
      );

      if (result.success) {
        message.success(intl.formatMessage({ id: 'productSettings.message.updateSuccess' }));
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingSetting(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'productSettings.message.updateFailed' }));
      }
    } catch (error) {
      console.error('更新商品设置失败:', error);
      message.error(intl.formatMessage({ id: 'productSettings.message.updateFailed' }));
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除商品设置
   */
  const handleDelete = async (record: ProductSetting) => {
    if (!currentBase) {
      return;
    }

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/goods-settings/${record.id}`,
        {
          method: 'DELETE',
        }
      );

      if (result.success) {
        message.success(intl.formatMessage({ id: 'productSettings.message.deleteSuccess' }));
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'productSettings.message.deleteFailed' }));
      }
    } catch (error) {
      console.error('删除商品设置失败:', error);
      message.error(intl.formatMessage({ id: 'productSettings.message.deleteFailed' }));
    }
  };

  /**
   * 编辑商品设置
   */
  const handleEdit = (record: ProductSetting) => {
    setEditingSetting(record);
    editForm.setFieldsValue({
      retailPrice: typeof record.retailPrice === 'number' ? record.retailPrice : parseFloat(record.retailPrice as any || '0'),
      packPrice: typeof record.packPrice === 'number' ? record.packPrice : parseFloat(record.packPrice as any || '0'),
      purchasePrice: typeof record.purchasePrice === 'number' ? record.purchasePrice : parseFloat(record.purchasePrice as any || '0'),
      alias: record.alias,
      isActive: record.isActive,
    });
    setEditModalVisible(true);
  };

  /**
   * 处理全局商品选择
   */
  const handleGlobalProductSelect = (goodsId: string) => {
    const product = globalProducts.find(p => p.id === goodsId);
    setSelectedGlobalProduct(product || null);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<ProductSetting>[] = [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: ['goods', 'code'],
      key: 'code',
      width: 160,
      fixed: 'left',
      copyable: true,
      hideInSearch: true,
      render: (_, record) => <code style={{ fontSize: 12 }}>{record.goods?.code}</code>,
    },
    {
      title: intl.formatMessage({ id: 'products.column.category' }),
      dataIndex: ['goods', 'category'],
      key: 'category',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        const category = record.goods?.category || GoodsCategory.CARD;
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
      render: (_, record) => <GoodsNameText text={record.goods?.name} nameI18n={record.goods?.nameI18n} />,
    },
    {
      title: intl.formatMessage({ id: 'products.column.alias' }),
      dataIndex: 'alias',
      key: 'alias',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
      render: (text: any) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'products.column.manufacturer' }),
      dataIndex: ['goods', 'manufacturer'],
      key: 'manufacturer',
      width: 100,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'products.column.retailPrice' }),
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 120,
      hideInSearch: true,
      align: 'right',
      render: (price: any) => (
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
      align: 'right',
      render: (price: any) => price ? (
        <span style={{ color: '#fa8c16' }}>
          {typeof price === 'number' ? price.toFixed(2) : parseFloat(price || '0').toFixed(2)}
        </span>
      ) : '-',
    },
    {
      title: intl.formatMessage({ id: 'products.column.packPerBox' }),
      dataIndex: ['goods', 'packPerBox'],
      key: 'packPerBox',
      width: 100,
      hideInSearch: true,
      align: 'center',
      render: (_, record) => (
        <Tag color="blue">{record.goods?.packPerBox}</Tag>
      ),
    },
    {
      title: intl.formatMessage({ id: 'products.column.piecePerPack' }),
      dataIndex: ['goods', 'piecePerPack'],
      key: 'piecePerPack',
      width: 100,
      hideInSearch: true,
      align: 'center',
      render: (_, record) => (
        <Tag color="green">{record.goods?.piecePerPack}</Tag>
      ),
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
            title={intl.formatMessage({ id: 'productSettings.deleteConfirm' })}
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
        {stats.totalSettings}
      </Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.activeGoods' })}>
        <Tag color="green">{stats.activeSettings}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'stats.inactiveGoods' })}>
        <Tag color="default">{stats.inactiveSettings}</Tag>
      </Descriptions.Item>
    </Descriptions>
  );

  // 未选择基地时的提示
  if (!initialized) {
    return (
      <PageContainer header={{ title: false }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          {intl.formatMessage({ id: 'message.loading' })}
        </div>
      </PageContainer>
    );
  }

  if (!currentBase) {
    return (
      <PageContainer header={{ title: false }}>
        <Alert
          message={intl.formatMessage({ id: 'message.selectBaseFirst' })}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<ProductSetting>
        key={`product-settings-${getLocale()}`}
        actionRef={actionRef}
        columns={columns}
        request={fetchProductSettings}
        rowKey="id"
        
        columnsState={{
          persistenceKey: 'product-settings-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            alias: { show: false },
            packPrice: { show: false },
            updatedAt: { show: false },
          },
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
        
        scroll={{ x: 1400 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
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
            onClick={() => {
              setSelectedGlobalProduct(null);
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'productSettings.add' })}
          </Button>,
        ]}
        
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'productSettings.title' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalSettings })})
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

      {/* 添加商品设置模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'productSettings.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          setSelectedGlobalProduct(null);
        }}
        afterOpenChange={(open) => {
          if (open) {
            createForm.resetFields();
          }
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
          {/* 选择全局商品 */}
          <Form.Item
            label={intl.formatMessage({ id: 'productSettings.form.selectProduct' })}
            required
          >
            {selectedGlobalProduct ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color="blue" style={{ margin: 0 }}>
                  {selectedGlobalProduct.code}
                </Tag>
                <span style={{ flex: 1 }}>{selectedGlobalProduct.name}</span>
                <Button size="small" onClick={() => setGoodsSelectModalVisible(true)}>
                  {intl.formatMessage({ id: 'productSettings.form.reselect' })}
                </Button>
              </div>
            ) : (
              <Button 
                type="dashed" 
                style={{ width: '100%' }}
                onClick={() => setGoodsSelectModalVisible(true)}
              >
                <PlusOutlined /> {intl.formatMessage({ id: 'productSettings.form.clickToSelect' })}
              </Button>
            )}
          </Form.Item>

          {/* 显示选中商品的信息 */}
          {selectedGlobalProduct && (
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }} bordered>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.code' })}>
                {selectedGlobalProduct.code}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.category' })}>
                <Tag color={GoodsCategoryColors[selectedGlobalProduct.category?.code || ''] || 'default'}>
                  {selectedGlobalProduct.category?.name || '未分类'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.manufacturer' })}>
                {selectedGlobalProduct.manufacturer}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.spec' })}>
                {selectedGlobalProduct.packPerBox} / {selectedGlobalProduct.piecePerPack}
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* 基地级配置字段 */}
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
                  addonAfter={intl.formatMessage({ id: 'unit.perBox' })}
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
                  addonAfter={intl.formatMessage({ id: 'unit.perPack' })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.purchasePrice' })}
                name="purchasePrice"
                rules={[
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.purchasePriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.purchasePricePlaceholder' })}
                  min={0}
                  precision={2}
                  addonAfter={intl.formatMessage({ id: 'unit.perBox' })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.alias' })}
                name="alias"
              >
                <Input placeholder={intl.formatMessage({ id: 'products.form.aliasPlaceholder' })} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 编辑商品设置模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'productSettings.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingSetting(null);
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
          {/* 显示商品信息（只读） */}
          {editingSetting && (
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }} bordered>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.name' })}>
                <strong>{getLocalizedGoodsName(editingSetting.goods?.name, editingSetting.goods?.nameI18n)}</strong>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.code' })}>
                {editingSetting.goods?.code}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.manufacturer' })}>
                {editingSetting.goods?.manufacturer}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'products.column.spec' })}>
                {editingSetting.goods?.packPerBox} / {editingSetting.goods?.piecePerPack}
              </Descriptions.Item>
            </Descriptions>
          )}

          {/* 基地级配置字段 */}
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
                  addonAfter={intl.formatMessage({ id: 'unit.perBox' })}
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
                  addonAfter={intl.formatMessage({ id: 'unit.perPack' })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.purchasePrice' })}
                name="purchasePrice"
                rules={[
                  { type: 'number', min: 0, message: intl.formatMessage({ id: 'products.form.purchasePriceMin' }) }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder={intl.formatMessage({ id: 'products.form.purchasePricePlaceholder' })}
                  min={0}
                  precision={2}
                  addonAfter={intl.formatMessage({ id: 'unit.perBox' })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'products.form.alias' })}
                name="alias"
              >
                <Input placeholder={intl.formatMessage({ id: 'products.form.aliasPlaceholder' })} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'products.form.status' })}
            name="isActive"
          >
            <Select
              options={[
                { value: true, label: intl.formatMessage({ id: 'status.enabled' }) },
                { value: false, label: intl.formatMessage({ id: 'status.disabled' }) },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        title={intl.formatMessage({ id: 'products.import.title' })}
        fields={importFields}
        onDownloadTemplate={handleDownloadTemplate}
        width={700}
      />

      {/* 全局商品选择弹窗 */}
      <GlobalGoodsSelectModal
        open={goodsSelectModalVisible}
        onCancel={() => setGoodsSelectModalVisible(false)}
        onSelect={(product) => {
          setSelectedGlobalProduct(product);
          setGoodsSelectModalVisible(false);
        }}
        excludeIds={existingGoodsIds}
        title={intl.formatMessage({ id: 'productSettings.form.selectProduct' })}
      />
    </PageContainer>
  );
};

export default ProductSettingsPage;
