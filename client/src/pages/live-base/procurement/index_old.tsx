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
  DatePicker,
  InputNumber,
  Upload,
  Progress,
  Alert,
  Spin
} from 'antd';
import type { UploadProps } from 'antd';
import { 
  PlusOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  DollarOutlined,
  TeamOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import { useProcurementExcel } from './useProcurementExcel';
import styles from './index.less';

const { TextArea } = Input;

// 采购订单数据类型定义
interface PurchaseOrder {
  id: string;
  orderNo: string;              // 采购编号
  orderName?: string;           // 采购名称
  purchaseDate: string;         // 采购日期
  goodsCode: string;            // 商品编号（关联商品表）
  goodsName: string;            // 商品名称
  retailPrice?: number;         // 零售价
  discount?: number;            // 折扣
  supplierCode: string;         // 供应商编号（关联供应商表）
  supplierName: string;         // 供应商名称
  purchaseBoxQty: number;       // 采购箱
  purchasePackQty: number;      // 采购盒
  purchasePieceQty: number;     // 采购包
  arrivedBoxQty?: number;       // 到货箱
  arrivedPackQty?: number;      // 到货盒
  arrivedPieceQty?: number;     // 到货包
  diffBoxQty?: number;          // 相差箱
  diffPackQty?: number;         // 相差盒
  diffPieceQty?: number;        // 相差包
  unitPriceBox?: number;        // 拿货单价箱
  unitPricePack?: number;       // 拿货单价盒
  unitPricePiece?: number;      // 拿货单价包
  amountBox?: number;           // 应付金额箱
  amountPack?: number;          // 应付金额盒
  amountPiece?: number;         // 应付金额包
  totalAmount: number;          // 应付总金额
  baseId: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  status?: 'pending' | 'confirmed' | 'received' | 'cancelled';
}

// 采购统计数据类型
interface PurchaseStats {
  totalOrders: number;
  totalAmount: number;
  uniqueSuppliers: number;
  averageAmount: number;
}

/**
 * 采购管理页面 - ProTable 版本
 * 基地中心化的采购管理，统一管理采购订单
 */
const ProcurementManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  
  // 状态管理
  const [stats, setStats] = useState<PurchaseStats>({
    totalOrders: 0,
    totalAmount: 0,
    uniqueSuppliers: 0,
    averageAmount: 0,
  });
  
  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
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
  } = useProcurementExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => actionRef.current?.reload(),
  });

  /**
   * 获取采购订单数据
   */
  const fetchPurchaseData = async (params: any) => {
    if (!currentBase) {
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const { current = 1, pageSize = 20, orderNo, supplierName, status } = params;
      
      // 构建查询参数
      const queryParams: any = {
        current,
        pageSize,
      };
      
      if (orderNo) queryParams.orderNo = orderNo;
      if (supplierName) queryParams.supplierName = supplierName;
      if (status) queryParams.status = status;

      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'GET',
        params: queryParams,
      });
      
      if (result.success) {
        // 计算统计数据
        calculateStats(result.data || []);
        
        return {
          data: result.data || [],
          success: true,
          total: result.total || 0,
        };
      } else {
        message.error(result.message || '获取采购数据失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      console.error('获取采购数据失败:', error);
      message.error('获取采购数据失败');
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
  const calculateStats = (data: PurchaseOrder[]) => {
    const newStats: PurchaseStats = {
      totalOrders: data.length,
      totalAmount: data.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      uniqueSuppliers: new Set(data.map(order => order.supplierName).filter(Boolean)).size,
      averageAmount: data.length > 0 
        ? data.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / data.length 
        : 0,
    };
    setStats(newStats);
  };

  /**
   * 创建采购订单
   */
  const handleCreate = async (values: any) => {
    if (!currentBase) {
      message.error('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'POST',
        data: {
          ...values,
          purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
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
      console.error('创建采购订单失败:', error);
      message.error('创建采购订单失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 更新采购订单
   */
  const handleUpdate = async (values: any) => {
    if (!currentBase || !editingOrder) {
      return;
    }

    setEditLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/purchase-orders/${editingOrder.id}`,
        {
          method: 'PUT',
          data: {
            ...values,
            purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
          },
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingOrder(null);
        actionRef.current?.reload();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新采购订单失败:', error);
      message.error('更新采购订单失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除采购订单
   */
  const handleDelete = async (record: PurchaseOrder) => {
    if (!currentBase) {
      return;
    }

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/purchase-orders/${record.id}`,
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
      console.error('删除采购订单失败:', error);
      message.error('删除采购订单失败');
    }
  };

  /**
   * 编辑采购订单
   */
  const handleEdit = (record: PurchaseOrder) => {
    setEditingOrder(record);
    editForm.setFieldsValue({
      supplierName: record.supplierName,
      purchaseDate: record.purchaseDate,
      totalAmount: record.totalAmount,
      notes: record.notes,
    });
    setEditModalVisible(true);
  };

  /**
   * 列定义
   */
  const columns: ProColumns<PurchaseOrder>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      fixed: 'left',
      copyable: true,
      hideInSetting: true,
      render: (_, record) => (
        <code style={{ fontSize: 12, fontWeight: 'bold', color: '#1890ff' }}>
          {record.orderNo}
        </code>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 150,
      hideInSetting: true,
    },
    {
      title: '采购日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      valueType: 'date',
      hideInSearch: true,
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      hideInSearch: true,
      align: 'right',
      render: (_, record) => (
        <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
          ¥{(record.totalAmount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '目标位置',
      dataIndex: 'locationName',
      key: 'locationName',
      width: 120,
      hideInSearch: true,
      hideInTable: false,
    },
    {
      title: '位置类型',
      dataIndex: 'locationType',
      key: 'locationType',
      width: 100,
      hideInSearch: true,
      hideInTable: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        pending: { text: '待确认', status: 'Warning' },
        confirmed: { text: '已确认', status: 'Processing' },
        received: { text: '已收货', status: 'Success' },
        cancelled: { text: '已取消', status: 'Error' },
      },
      render: (_, record) => {
        // 根据创建时间推断状态
        const now = new Date();
        const createdAt = new Date(record.createdAt);
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        
        let status, config;
        if (daysDiff < 1) {
          status = 'pending';
          config = { color: 'orange', text: '待确认', icon: <ClockCircleOutlined /> };
        } else if (daysDiff < 7) {
          status = 'confirmed';
          config = { color: 'blue', text: '已确认', icon: <CheckCircleOutlined /> };
        } else {
          status = 'received';
          config = { color: 'green', text: '已收货', icon: <CheckCircleOutlined /> };
        }
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      hideInTable: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
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
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      valueType: 'option',
      hideInSetting: true,
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description={`确定要删除采购订单"${record.orderNo}"吗？`}
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

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
        <Descriptions.Item label="订单总数">
          <Space>
            <ShoppingOutlined />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>{stats.totalOrders}</span>
            <span style={{ color: '#999' }}>单</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="总采购金额">
          <Space>
            <DollarOutlined style={{ color: '#f5222d' }} />
            <span style={{ color: '#f5222d', fontWeight: 'bold' }}>¥{stats.totalAmount.toFixed(2)}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="供应商数量">
          <Space>
            <TeamOutlined style={{ color: '#722ed1' }} />
            <span style={{ color: '#722ed1', fontWeight: 'bold' }}>{stats.uniqueSuppliers}</span>
            <span style={{ color: '#999' }}>家</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="平均订单金额">
          <Space>
            <DollarOutlined style={{ color: '#1890ff' }} />
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{stats.averageAmount.toFixed(2)}</span>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  return (
    <PageContainer
      header={{
        title: '采购管理',
        subTitle: `当前基地：${currentBase.name}`,
      }}
    >
      {/* ProTable */}
      <ProTable<PurchaseOrder>
        columns={columns}
        actionRef={actionRef}
        request={fetchPurchaseData}
        rowKey="id"
        
        // 列状态配置
        columnsState={{
          persistenceKey: 'procurement-table-columns',
          persistenceType: 'localStorage',
          defaultValue: {
            id: { show: false },
            locationName: { show: false },
            locationType: { show: false },
            notes: { show: false },
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
        scroll={{ x: 1400 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
        }}
        
        // 工具栏按钮
        toolBarRender={() => [
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            导出Excel
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入Excel
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建采购订单
          </Button>,
        ]}
        
        // 表格属性
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>采购订单列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.totalOrders} 单)
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

      {/* 创建采购订单模态框 */}
      <Modal
        title="创建采购订单"
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
          <Form.Item
            label="供应商"
            name="supplierName"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            label="采购日期"
            name="purchaseDate"
            rules={[{ required: true, message: '请选择采购日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="总金额"
            name="totalAmount"
            rules={[
              { required: true, message: '请输入总金额' },
              { type: 'number', min: 0, message: '总金额不能为负数' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="总金额"
              min={0}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑采购订单模态框 */}
      <Modal
        title="编辑采购订单"
        open={editModalVisible}
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingOrder(null);
        }}
        confirmLoading={editLoading}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            label="供应商"
            name="supplierName"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>

          <Form.Item
            label="采购日期"
            name="purchaseDate"
            rules={[{ required: true, message: '请选择采购日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="总金额"
            name="totalAmount"
            rules={[
              { required: true, message: '请输入总金额' },
              { type: 'number', min: 0, message: '总金额不能为负数' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="总金额"
              min={0}
              precision={2}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入采购订单模态框 */}
      <Modal
        title="导入采购数据"
        open={importModalVisible}
        onCancel={() => {
          if (!importLoading) {
            setImportModalVisible(false);
          }
        }}
        footer={null}
        width={600}
        closable={!importLoading}
        maskClosable={!importLoading}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                <p>1. 请使用提供的模板文件，保持列名不变</p>
                <p>2. ID、采购编号、创建时间由系统自动生成</p>
                <p>3. 采购日期、供应商、商品名称为必填项</p>
                <p>4. 支持批量导入，建议每次不超过500条</p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>

        {importLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              正在导入数据，请稍候...
            </div>
            {importProgress > 0 && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={importProgress} status="active" />
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload.Dragger
              name="file"
              accept=".xlsx,.xls"
              customRequest={handleImport}
              showUploadList={false}
              disabled={importLoading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 .xlsx 和 .xls 格式，请按照模板格式填写数据
              </p>
            </Upload.Dragger>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button
                type="link"
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                下载导入模板
              </Button>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ProcurementManagement;
