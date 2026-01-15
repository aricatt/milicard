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
  Select,
  DatePicker,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  SendOutlined,
  SwapOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl, getLocale } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import dayjs from 'dayjs';
import GoodsNameText, { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';
import BaseGoodsSelectModal, { type BaseGoodsItem } from '@/components/BaseGoodsSelectModal';
import { useStockOutExcel } from './useStockOutExcel';
import ImportModal from '@/components/ImportModal';

const { TextArea } = Input;

// 出库类型
type StockOutType = 'POINT_ORDER' | 'TRANSFER' | 'MANUAL';

// 出库数据类型
interface StockOut {
  id: string;
  baseId: number;
  date: string;
  goodsId: string;
  type: StockOutType;
  targetName?: string;
  relatedOrderId?: string;
  relatedOrderCode?: string;
  locationId: number;
  boxQuantity: number;
  packQuantity: number;
  pieceQuantity: number;
  remark?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  goods?: {
    id: string;
    code: string;
    name: string;
    nameI18n?: { en?: string; th?: string; vi?: string; [key: string]: string | undefined } | null;
    packPerBox: number;
    piecePerPack: number;
    category?: {
      code: string;
      name: string;
    };
  };
  location?: {
    id: number;
    name: string;
    code: string;
  };
  creator?: {
    id: string;
    name: string;
    username: string;
  };
}

// 统计数据类型
interface StockOutStats {
  total: number;
  byType: { type: StockOutType; count: number }[];
  byLocation: { locationId: number; locationName: string; count: number }[];
}

// 出库类型映射
// 出库类型映射 - 将在组件内部使用intl动态获取
const TYPE_MAP_COLORS: Record<StockOutType, { color: string; icon: React.ReactNode }> = {
  POINT_ORDER: { color: 'blue', icon: <SendOutlined /> },
  TRANSFER: { color: 'orange', icon: <SwapOutlined /> },
  MANUAL: { color: 'green', icon: <ToolOutlined /> },
};

/**
 * 直播基地出库管理页面
 */
const StockOutPage: React.FC = () => {
  const { currentBase, initialized } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useStockOutExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => {
      actionRef.current?.reload();
    },
  });

  // 状态管理
  const [stats, setStats] = useState<StockOutStats>({
    total: 0,
    byType: [],
    byLocation: [],
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StockOut | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // 下拉选项
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  
  // 商品选择弹窗状态
  const [goodsSelectModalVisible, setGoodsSelectModalVisible] = useState(false);
  const [selectedGoods, setSelectedGoods] = useState<BaseGoodsItem | null>(null);
  const [editSelectedGoods, setEditSelectedGoods] = useState<BaseGoodsItem | null>(null);
  
  // 库存信息
  const [stockInfo, setStockInfo] = useState<{ currentBox: number; currentPack: number; currentPiece: number } | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取商品库存信息
   */
  const fetchStockInfo = async (goodsId: string, locationId?: number) => {
    if (!currentBase || !goodsId) {
      setStockInfo(null);
      return;
    }
    
    setStockLoading(true);
    try {
      const locId = locationId || createForm.getFieldValue('locationId') || editForm.getFieldValue('locationId');
      if (!locId) {
        setStockInfo(null);
        return;
      }
      
      const result = await request(`/api/v1/bases/${currentBase.id}/stock`, {
        params: { goodsId, locationId: locId },
      });
      
      if (result.success && result.data) {
        setStockInfo({
          currentBox: result.data.currentBox || 0,
          currentPack: result.data.currentPack || 0,
          currentPiece: result.data.currentPiece || 0,
        });
      } else {
        setStockInfo({ currentBox: 0, currentPack: 0, currentPiece: 0 });
      }
    } catch (error) {
      console.error('获取库存信息失败:', error);
      setStockInfo({ currentBox: 0, currentPack: 0, currentPiece: 0 });
    } finally {
      setStockLoading(false);
    }
  };

  /**
   * 获取仓库列表
   */
  const fetchLocations = async () => {
    if (!currentBase) return;
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/locations`, {
        params: { pageSize: 1000, isActive: true },
      });
      if (result.success) {
        setLocationOptions(
          (result.data || []).map((l: any) => ({
            label: l.name,
            value: l.id,
          }))
        );
      }
    } catch (error) {
      console.error('获取仓库列表失败:', error);
    }
  };

  /**
   * 获取出库数据
   */
  const fetchData = async (params: any) => {
    if (!currentBase) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const { current = 1, pageSize = 20, type, keyword } = params;

      const queryParams: any = {
        page: current,
        pageSize,
      };

      if (type) queryParams.type = type;
      if (keyword) queryParams.keyword = keyword;

      const result = await request(`/api/v1/bases/${currentBase.id}/stock-outs`, {
        params: queryParams,
      });

      if (result.success) {
        // 获取统计数据
        fetchStats();

        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      }

      return { data: [], success: true, total: 0 };
    } catch (error) {
      console.error('获取出库列表失败:', error);
      return { data: [], success: false, total: 0 };
    }
  };

  /**
   * 获取统计数据
   */
  const fetchStats = async () => {
    if (!currentBase) return;
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/stock-outs/stats`);
      if (result.success && result.data) {
        setStats({
          total: result.data.total || 0,
          byType: result.data.byType || [],
          byLocation: result.data.byLocation || [],
        });
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  /**
   * 创建出库记录
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) return;

    // 库存检查
    const boxQty = values.boxQuantity || 0;
    const packQty = values.packQuantity || 0;
    const pieceQty = values.pieceQuantity || 0;
    
    if (boxQty === 0 && packQty === 0 && pieceQty === 0) {
      message.error(intl.formatMessage({ id: 'stockOut.form.quantityRequired' }));
      return;
    }
    
    if (stockInfo) {
      if (boxQty > stockInfo.currentBox || packQty > stockInfo.currentPack || pieceQty > stockInfo.currentPiece) {
        message.error(intl.formatMessage({ id: 'stockOut.form.insufficientStock' }));
        return;
      }
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/stock-outs`, {
        method: 'POST',
        data: {
          ...values,
          type: 'MANUAL', // 强制设置为手动出库
          date: values.date.format('YYYY-MM-DD'),
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
      console.error('创建出库记录失败:', error);
      message.error('创建出库记录失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新出库记录
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingRecord) return;

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/stock-outs/${editingRecord.id}`,
        {
          method: 'PUT',
          data: {
            ...values,
            type: 'MANUAL', // 强制设置为手动出库
            date: values.date.format('YYYY-MM-DD'),
          },
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingRecord(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新出库记录失败:', error);
      message.error('更新出库记录失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除出库记录
   */
  const handleDelete = async (record: StockOut) => {
    if (!currentBase) return;

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/stock-outs/${record.id}`,
        { method: 'DELETE' }
      );

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除出库记录失败:', error);
      message.error('删除失败');
    }
  };

  /**
   * 批量删除出库记录
   */
  const handleBatchDelete = async () => {
    if (!currentBase || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条出库记录吗？此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          let failCount = 0;

          for (const id of selectedRowKeys) {
            try {
              const result = await request(
                `/api/v1/bases/${currentBase.id}/stock-outs/${id}`,
                { method: 'DELETE' }
              );
              if (result.success) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (error) {
              failCount++;
            }
          }

          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 条记录${failCount > 0 ? `，失败 ${failCount} 条` : ''}`);
            setSelectedRowKeys([]);
            actionRef.current?.reload();
          } else {
            message.error('删除失败');
          }
        } catch (error: any) {
          console.error('批量删除出库记录失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  /**
   * 编辑出库记录
   */
  const handleEdit = (record: StockOut) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      date: dayjs(record.date),
      goodsId: record.goodsId,
      targetName: record.targetName,
      locationId: record.locationId,
      boxQuantity: record.boxQuantity,
      packQuantity: record.packQuantity,
      pieceQuantity: record.pieceQuantity,
      remark: record.remark,
    });
    setEditModalVisible(true);
  };

  /**
   * 打开创建模态框
   */
  const openCreateModal = () => {
    fetchLocations();
    setSelectedGoods(null);
    createForm.resetFields();
    createForm.setFieldsValue({
      date: dayjs(),
      boxQuantity: 0,
      packQuantity: 0,
      pieceQuantity: 0,
    });
    setCreateModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<StockOut>[] = [
    {
      title: intl.formatMessage({ id: 'stockOut.column.date' }),
      dataIndex: 'date',
      key: 'date',
      width: 110,
      hideInSearch: true,
      render: (_, record) => {
        if (!record.date) return '-';
        return dayjs(record.date).format('YYYY-MM-DD');
      },
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.category' }),
      dataIndex: 'category',
      key: 'category',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        const categoryCode = record.goods?.category?.code;
        const categoryName = record.goods?.category?.name;
        const displayName = getCategoryDisplayName(categoryCode, categoryName, intl.locale);
        if (!displayName) return '-';
        return <Tag color="orange">{displayName}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.goods' }),
      dataIndex: 'goods',
      key: 'goods',
      width: 200,
      hideInSearch: true,
      render: (_, record) => (
        <GoodsNameText 
          text={record.goods?.name} 
          nameI18n={record.goods?.nameI18n}
        />
      ),
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.type' }),
      dataIndex: 'type',
      key: 'type',
      width: 120,
      valueType: 'select',
      valueEnum: {
        POINT_ORDER: { text: intl.formatMessage({ id: 'stockOut.type.pointOrder' }) },
        TRANSFER: { text: intl.formatMessage({ id: 'stockOut.type.transfer' }) },
        MANUAL: { text: intl.formatMessage({ id: 'stockOut.type.manual' }) },
      },
      render: (_, record) => {
        const typeInfo = TYPE_MAP_COLORS[record.type];
        const typeTextMap: Record<StockOutType, string> = {
          POINT_ORDER: intl.formatMessage({ id: 'stockOut.type.pointOrder' }),
          TRANSFER: intl.formatMessage({ id: 'stockOut.type.transfer' }),
          MANUAL: intl.formatMessage({ id: 'stockOut.type.manual' }),
        };
        return (
          <Tag color={typeInfo.color} icon={typeInfo.icon}>
            {typeTextMap[record.type]}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.targetName' }),
      dataIndex: 'targetName',
      key: 'targetName',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.relatedOrder' }),
      dataIndex: 'relatedOrderCode',
      key: 'relatedOrderCode',
      width: 150,
      hideInSearch: true,
      render: (text) => text ? <code style={{ fontSize: 12 }}>{text}</code> : '-',
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.location' }),
      dataIndex: 'location',
      key: 'location',
      width: 120,
      hideInSearch: true,
      render: (_, record) => record.location?.name || '-',
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.boxQty' }),
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.packQty' }),
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.pieceQty' }),
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'table.column.notes' }),
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdBy' }),
      dataIndex: 'creator',
      key: 'creator',
      width: 100,
      hideInSearch: true,
      render: (_, record) => record.creator?.name || '-',
    },
    {
      title: intl.formatMessage({ id: 'table.column.createdAt' }),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      hideInSearch: true,
      render: (_, record) => {
        if (!record.createdAt) return '-';
        return dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.keyword' }),
      dataIndex: 'keyword',
      key: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '搜索目标名称、订单号、备注',
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 120,
      fixed: 'right',
      valueType: 'option',
      render: (_, record) => {
        // 只有手动出库可以编辑和删除
        if (record.type !== 'MANUAL') {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return [
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              fetchLocations();
              // 设置编辑时选中的商品
              if (record.goods) {
                setEditSelectedGoods({
                  id: record.goods.id,
                  code: record.goods.code,
                  name: record.goods.name,
                  nameI18n: record.goods.nameI18n || undefined,
                  categoryCode: record.goods.category?.code,
                  categoryName: record.goods.category?.name,
                  packPerBox: record.goods.packPerBox,
                  piecePerPack: record.goods.piecePerPack,
                  isActive: true,
                });
              }
              handleEdit(record);
            }}
          >
            {intl.formatMessage({ id: 'button.edit' })}
          </Button>,
          <Popconfirm
            key="delete"
            title={intl.formatMessage({ id: 'message.deleteConfirm' })}
            description={intl.formatMessage({ id: 'stockOut.deleteConfirm' })}
            onConfirm={() => handleDelete(record)}
            okText={intl.formatMessage({ id: 'button.confirm' })}
            cancelText={intl.formatMessage({ id: 'button.cancel' })}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              {intl.formatMessage({ id: 'button.delete' })}
            </Button>
          </Popconfirm>,
        ];
      },
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
        <Descriptions.Item label={intl.formatMessage({ id: 'stockOut.stats.total' })}>
          <Space>
            <ExportOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.total}</span>
            <span style={{ color: '#999' }}>{intl.formatMessage({ id: 'unit.item' })}</span>
          </Space>
        </Descriptions.Item>
        {stats.byType.map((item) => {
          const typeTextMap: Record<StockOutType, string> = {
            POINT_ORDER: intl.formatMessage({ id: 'stockOut.type.pointOrder' }),
            TRANSFER: intl.formatMessage({ id: 'stockOut.type.transfer' }),
            MANUAL: intl.formatMessage({ id: 'stockOut.type.manual' }),
          };
          return (
            <Descriptions.Item key={item.type} label={typeTextMap[item.type] || item.type}>
              <Tag color={TYPE_MAP_COLORS[item.type]?.color}>{item.count}</Tag>
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </div>
  );

  // 创建表单内容
  const formContent = (
    <>
      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.date' })}
        name="date"
        rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.dateRequired' }) }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.goods' })}
        required
      >
        {selectedGoods ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="blue">{selectedGoods.code}</Tag>
            <span style={{ flex: 1 }}>
              {getLocalizedGoodsName(selectedGoods.name, selectedGoods.nameI18n, getLocale())}
            </span>
            <Button size="small" onClick={() => setGoodsSelectModalVisible(true)}>
              {intl.formatMessage({ id: 'stockOut.form.reselect' })}
            </Button>
          </div>
        ) : (
          <Button
            type="dashed"
            style={{ width: '100%' }}
            onClick={() => setGoodsSelectModalVisible(true)}
          >
            <PlusOutlined /> {intl.formatMessage({ id: 'stockOut.form.clickToSelect' })}
          </Button>
        )}
      </Form.Item>
      <Form.Item name="goodsId" hidden rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.goodsRequired' }) }]}>
        <Input />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.location' })}
        name="locationId"
        rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.locationRequired' }) }]}
      >
        <Select 
          placeholder={intl.formatMessage({ id: 'form.placeholder.select' })} 
          options={locationOptions}
          onChange={(value) => {
            if (selectedGoods) {
              fetchStockInfo(selectedGoods.id, value);
            }
          }}
        />
      </Form.Item>
      
      {/* 库存信息显示 */}
      {selectedGoods && stockInfo && (
        <Form.Item label={intl.formatMessage({ id: 'stockOut.form.currentStock' })}>
          <Space>
            <Tag color={stockInfo.currentBox > 0 ? 'green' : 'red'}>
              {intl.formatMessage({ id: 'stockOut.column.boxQty' })}: {stockInfo.currentBox}
            </Tag>
            <Tag color={stockInfo.currentPack > 0 ? 'green' : 'red'}>
              {intl.formatMessage({ id: 'stockOut.column.packQty' })}: {stockInfo.currentPack}
            </Tag>
            <Tag color={stockInfo.currentPiece > 0 ? 'green' : 'red'}>
              {intl.formatMessage({ id: 'stockOut.column.pieceQty' })}: {stockInfo.currentPiece}
            </Tag>
          </Space>
        </Form.Item>
      )}

      <Form.Item label={intl.formatMessage({ id: 'stockOut.column.targetName' })} name="targetName">
        <Input placeholder={intl.formatMessage({ id: 'stockOut.form.targetPlaceholder' })} />
      </Form.Item>

      <Space style={{ width: '100%' }} size="middle">
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.boxQty' })} name="boxQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.packQty' })} name="packQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.pieceQty' })} name="pieceQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
      </Space>

      <Form.Item label={intl.formatMessage({ id: 'table.column.notes' })} name="remark">
        <TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
      </Form.Item>
    </>
  );

  // 编辑表单内容（使用 editSelectedGoods）
  const editFormContent = (
    <>
      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.date' })}
        name="date"
        rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.dateRequired' }) }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.goods' })}
        required
      >
        {editSelectedGoods ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="blue">{editSelectedGoods.code}</Tag>
            <span style={{ flex: 1 }}>
              {getLocalizedGoodsName(editSelectedGoods.name, editSelectedGoods.nameI18n, getLocale())}
            </span>
          </div>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )}
      </Form.Item>
      <Form.Item name="goodsId" hidden rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.goodsRequired' }) }]}>
        <Input />
      </Form.Item>

      <Form.Item
        label={intl.formatMessage({ id: 'stockOut.column.location' })}
        name="locationId"
        rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.locationRequired' }) }]}
      >
        <Select placeholder={intl.formatMessage({ id: 'form.placeholder.select' })} options={locationOptions} />
      </Form.Item>

      <Form.Item label={intl.formatMessage({ id: 'stockOut.column.targetName' })} name="targetName">
        <Input placeholder={intl.formatMessage({ id: 'stockOut.form.targetPlaceholder' })} />
      </Form.Item>

      <Space style={{ width: '100%' }} size="middle">
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.boxQty' })} name="boxQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.packQty' })} name="packQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label={intl.formatMessage({ id: 'stockOut.column.pieceQty' })} name="pieceQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
      </Space>

      <Form.Item label={intl.formatMessage({ id: 'table.column.notes' })} name="remark">
        <TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
      </Form.Item>
    </>
  );

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<StockOut>
        columns={columns}
        actionRef={actionRef}
        request={fetchData}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          preserveSelectedRowKeys: false,
        }}
        tableAlertRender={({ selectedRowKeys }) => (
          <Space size={24}>
            <span>
              已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项
              <a style={{ marginLeft: 8 }} onClick={() => setSelectedRowKeys([])}>
                取消选择
              </a>
            </span>
          </Space>
        )}
        tableAlertOptionRender={() => (
          <Space size={16}>
            <Button
              type="link"
              size="small"
              danger
              onClick={handleBatchDelete}
            >
              批量删除
            </Button>
          </Space>
        )}
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        options={{
          setting: { listsHeight: 400, draggable: true },
          reload: () => actionRef.current?.reload(),
          density: true,
          fullScreen: true,
        }}
        scroll={{ x: 1600 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        toolBarRender={() => [
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            {intl.formatMessage({ id: 'pages.common.export' })}
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            {intl.formatMessage({ id: 'pages.common.import' })}
          </Button>,
          <Button
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            {intl.formatMessage({ id: 'pages.common.downloadTemplate' })}
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            {intl.formatMessage({ id: 'stockOut.add' })}
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.stockOut' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.total })})
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

      {/* 创建出库模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'stockOut.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          {formContent}
        </Form>
      </Modal>

      {/* 编辑出库模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'stockOut.edit' })}
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingRecord(null);
          setEditSelectedGoods(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          {editFormContent}
        </Form>
      </Modal>

      {/* 商品选择弹窗 */}
      <BaseGoodsSelectModal
        open={goodsSelectModalVisible}
        onCancel={() => setGoodsSelectModalVisible(false)}
        onSelect={(goods) => {
          setSelectedGoods(goods);
          createForm.setFieldsValue({ goodsId: goods.id });
          setGoodsSelectModalVisible(false);
        }}
        baseId={currentBase?.id || 0}
        title={intl.formatMessage({ id: 'stockOut.form.selectGoods' })}
      />

      {/* 导入模态框 */}
      <ImportModal
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        title="导入出库记录（仅支持手动出库）"
        width={700}
        fields={[
          { field: '出库日期', description: '必填，格式：YYYY-MM-DD，例如：2026-01-15', required: true },
          { field: '商品编号', description: '方式1：提供商品编号，例如：GOODS-6635T4P3HUC', required: false },
          { field: '品类名称', description: '方式2：提供品类名称，例如：创造营亚洲第二季·星光熠梦收藏卡（需配合商品名称）', required: false },
          { field: '商品名称', description: '方式2：提供商品名称，例如：创造营亚洲第二季·星光熠梦收藏卡（需配合品类名称）', required: false },
          { field: '出库位置', description: '必填，仓库或直播间名称，例如：G层仓库', required: true },
          { field: '目标/对象', description: '选填，出库目标，例如：【3L】-A（直播间）、损耗、调拨等', required: false },
          { field: '关联单号', description: '选填，关联的订单编号，例如：ORDER-123456', required: false },
          { field: '出库箱', description: '选填，出库箱数，默认为0', required: false },
          { field: '出库盒', description: '选填，出库盒数，默认为0', required: false },
          { field: '出库包', description: '选填，出库包数，默认为0', required: false },
          { field: '备注', description: '选填，出库备注信息', required: false },
        ]}
      />
    </PageContainer>
  );
};

export default StockOutPage;
