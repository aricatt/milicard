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
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  SendOutlined,
  SwapOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import dayjs from 'dayjs';
import GoodsNameText from '@/components/GoodsNameText';

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
    packPerBox: number;
    piecePerPack: number;
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

// 出库类型映射 - 将在组件内动态获取文本
const TYPE_COLORS: Record<StockOutType, { color: string; icon: React.ReactNode }> = {
  POINT_ORDER: { color: 'blue', icon: <SendOutlined /> },
  TRANSFER: { color: 'orange', icon: <SwapOutlined /> },
  MANUAL: { color: 'green', icon: <ToolOutlined /> },
};

/**
 * 线下区域出库管理页面
 */
const StockOutPage: React.FC = () => {
  const { currentBase, initialized } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);

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
  const [goodsOptions, setGoodsOptions] = useState<any[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);

  // 表单实例
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  /**
   * 获取商品列表
   */
  const fetchGoods = async () => {
    if (!currentBase) return;
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        params: { pageSize: 1000, isActive: true },
      });
      if (result.success) {
        setGoodsOptions(
          (result.data || []).map((g: any) => ({
            label: `${g.name} (${g.code})`,
            value: g.id,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch goods:', error);
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
      console.error('Failed to fetch locations:', error);
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
      console.error('Failed to fetch stock-out list:', error);
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
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  /**
   * 创建出库记录
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) return;

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/stock-outs`, {
        method: 'POST',
        data: {
          ...values,
          date: values.date.format('YYYY-MM-DD'),
        },
      });

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to create stock-out:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
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
            date: values.date.format('YYYY-MM-DD'),
          },
        }
      );

      if (result.success) {
        message.success(intl.formatMessage({ id: 'message.success' }));
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingRecord(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to update stock-out:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
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
        message.success(intl.formatMessage({ id: 'message.success' }));
        actionRef.current?.reload();
      } else {
        message.error(result.message || intl.formatMessage({ id: 'message.failed' }));
      }
    } catch (error) {
      console.error('Failed to delete stock-out:', error);
      message.error(intl.formatMessage({ id: 'message.failed' }));
    }
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
    fetchGoods();
    fetchLocations();
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
      title: intl.formatMessage({ id: 'stockOut.column.goods' }),
      dataIndex: 'goods',
      key: 'goods',
      width: 200,
      hideInSearch: true,
      render: (_, record) => <GoodsNameText text={record.goods?.name} nameI18n={record.goods?.nameI18n} />,
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
        const typeColors = TYPE_COLORS[record.type];
        const typeTextMap: Record<StockOutType, string> = {
          POINT_ORDER: intl.formatMessage({ id: 'stockOut.type.pointOrder' }),
          TRANSFER: intl.formatMessage({ id: 'stockOut.type.transfer' }),
          MANUAL: intl.formatMessage({ id: 'stockOut.type.manual' }),
        };
        return (
          <Tag color={typeColors.color} icon={typeColors.icon}>
            {typeTextMap[record.type]}
          </Tag>
        );
      },
    },
    {
      title: intl.formatMessage({ id: 'stockOut.column.targetName' }),
      dataIndex: 'targetName',
      key: 'targetName',
      width: 100,
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
      width: 100,
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
      title: intl.formatMessage({ id: 'form.label.notes' }),
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
        placeholder: intl.formatMessage({ id: 'stockOut.search.placeholder' }),
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.operation' }),
      key: 'action',
      width: 80,
      fixed: 'right',
      valueType: 'option',
      render: (_, record) => {
        // 只有手动出库可以编辑和删除
        if (record.type !== 'MANUAL') {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return [
          <Tooltip key="edit" title={intl.formatMessage({ id: 'button.edit' })}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                fetchGoods();
                fetchLocations();
                handleEdit(record);
              }}
            />
          </Tooltip>,
          <Popconfirm
            key="delete"
            title={intl.formatMessage({ id: 'message.deleteConfirm' })}
            description={intl.formatMessage({ id: 'stockOut.deleteConfirm' })}
            onConfirm={() => handleDelete(record)}
            okText={intl.formatMessage({ id: 'button.confirm' })}
            cancelText={intl.formatMessage({ id: 'button.cancel' })}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Tooltip title={intl.formatMessage({ id: 'button.delete' })}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
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
          <p>{intl.formatMessage({ id: 'message.loading' })}</p>
        </div>
      </PageContainer>
    );
  }

  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>{intl.formatMessage({ id: 'message.selectBaseFirst' })}</p>
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
              <Tag color={TYPE_COLORS[item.type]?.color}>{item.count}</Tag>
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    </div>
  );

  // 表单内容
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
        name="goodsId"
        rules={[{ required: true, message: intl.formatMessage({ id: 'stockOut.form.goodsRequired' }) }]}
      >
        <Select
          showSearch
          placeholder={intl.formatMessage({ id: 'form.placeholder.select' })}
          options={goodsOptions}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
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

      <Form.Item label={intl.formatMessage({ id: 'form.label.notes' })} name="remark">
        <TextArea rows={3} placeholder={intl.formatMessage({ id: 'form.placeholder.input' })} />
      </Form.Item>
    </>
  );

  return (
    <PageContainer
      header={{
        title: intl.formatMessage({ id: 'stockOut.title' }),
      }}
    >
      <ProTable<StockOut>
        columns={columns}
        actionRef={actionRef}
        request={fetchData}
        rowKey="id"
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
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          {formContent}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default StockOutPage;
