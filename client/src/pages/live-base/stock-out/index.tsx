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
  InfoCircleOutlined,
  SendOutlined,
  SwapOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import dayjs from 'dayjs';

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

// 出库类型映射
const TYPE_MAP: Record<StockOutType, { text: string; color: string; icon: React.ReactNode }> = {
  POINT_ORDER: { text: '点位发货', color: 'blue', icon: <SendOutlined /> },
  TRANSFER: { text: '跨基地调货', color: 'orange', icon: <SwapOutlined /> },
  MANUAL: { text: '手动出库', color: 'green', icon: <ToolOutlined /> },
};

/**
 * 直播基地出库管理页面
 */
const StockOutPage: React.FC = () => {
  const { currentBase, initialized } = useBase();
  const { message } = App.useApp();
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
      console.error('获取商品列表失败:', error);
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
      if (result.success) {
        setStats(result.data);
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
      message.error('删除出库记录失败');
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
      title: '出库日期',
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
      title: '商品',
      dataIndex: 'goods',
      key: 'goods',
      width: 200,
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => record.goods?.name || '-',
    },
    {
      title: '出库类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      valueType: 'select',
      valueEnum: {
        POINT_ORDER: { text: '点位发货' },
        TRANSFER: { text: '跨基地调货' },
        MANUAL: { text: '手动出库' },
      },
      render: (_, record) => {
        const typeInfo = TYPE_MAP[record.type];
        return (
          <Tag color={typeInfo.color} icon={typeInfo.icon}>
            {typeInfo.text}
          </Tag>
        );
      },
    },
    {
      title: '目标名称',
      dataIndex: 'targetName',
      key: 'targetName',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '关联订单',
      dataIndex: 'relatedOrderCode',
      key: 'relatedOrderCode',
      width: 150,
      hideInSearch: true,
      render: (text) => text ? <code style={{ fontSize: 12 }}>{text}</code> : '-',
    },
    {
      title: '出库仓库',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      hideInSearch: true,
      render: (_, record) => record.location?.name || '-',
    },
    {
      title: '出库/箱',
      dataIndex: 'boxQuantity',
      key: 'boxQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: '出库/盒',
      dataIndex: 'packQuantity',
      key: 'packQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: '出库/包',
      dataIndex: 'pieceQuantity',
      key: 'pieceQuantity',
      width: 80,
      hideInSearch: true,
      align: 'right',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      hideInSearch: true,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      key: 'creator',
      width: 100,
      hideInSearch: true,
      render: (_, record) => record.creator?.name || '-',
    },
    {
      title: '创建时间',
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
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      hideInTable: true,
      fieldProps: {
        placeholder: '搜索目标名称、订单号、备注',
      },
    },
    {
      title: '操作',
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
              fetchGoods();
              fetchLocations();
              handleEdit(record);
            }}
          >
            编辑
          </Button>,
          <Popconfirm
            key="delete"
            title="确认删除"
            description="确定要删除这条出库记录吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
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
        <Descriptions.Item label="出库总数">
          <Space>
            <ExportOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.total}</span>
            <span style={{ color: '#999' }}>条</span>
          </Space>
        </Descriptions.Item>
        {stats.byType.map((item) => (
          <Descriptions.Item key={item.type} label={TYPE_MAP[item.type]?.text || item.type}>
            <Tag color={TYPE_MAP[item.type]?.color}>{item.count}</Tag>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  );

  // 表单内容
  const formContent = (
    <>
      <Form.Item
        label="出库日期"
        name="date"
        rules={[{ required: true, message: '请选择出库日期' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="商品"
        name="goodsId"
        rules={[{ required: true, message: '请选择商品' }]}
      >
        <Select
          showSearch
          placeholder="请选择商品"
          options={goodsOptions}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Form.Item>

      <Form.Item
        label="出库仓库"
        name="locationId"
        rules={[{ required: true, message: '请选择出库仓库' }]}
      >
        <Select placeholder="请选择出库仓库" options={locationOptions} />
      </Form.Item>

      <Form.Item label="目标名称" name="targetName">
        <Input placeholder="请输入目标名称（如客户名、直播间等）" />
      </Form.Item>

      <Space style={{ width: '100%' }} size="middle">
        <Form.Item label="出库/箱" name="boxQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="出库/盒" name="packQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="出库/包" name="pieceQuantity">
          <InputNumber min={0} style={{ width: 100 }} />
        </Form.Item>
      </Space>

      <Form.Item label="备注" name="remark">
        <TextArea rows={3} placeholder="请输入备注" />
      </Form.Item>
    </>
  );

  return (
    <PageContainer
      header={{
        title: '出库管理',
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
            onClick={openCreateModal}
          >
            手动出库
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>出库列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.total} 条)
            </span>
            <Popover
              content={statsContent}
              title="统计详情"
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<InfoCircleOutlined />}
                style={{ color: '#1890ff' }}
              >
                详情
              </Button>
            </Popover>
          </Space>
        }
      />

      {/* 创建出库模态框 */}
      <Modal
        title="手动出库"
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
        title="编辑出库记录"
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
