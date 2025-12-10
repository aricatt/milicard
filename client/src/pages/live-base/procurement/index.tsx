import React, { useRef, useState, useEffect } from 'react';
import { 
  Space, 
  Modal,
  Form,
  App,
  Button,
  Popover,
  Descriptions,
} from 'antd';
import { 
  PlusOutlined, 
  InfoCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import { useProcurementExcel } from './useProcurementExcel';
import ProcurementForm from './ProcurementForm';
import { getColumns } from './columns';
import ImportModal from '@/components/ImportModal';
import LogisticsModal from './LogisticsModal';
import type { 
  PurchaseOrder, 
  PurchaseStats, 
  GoodsOption, 
  SupplierOption,
  ProcurementFormValues 
} from './types';
import dayjs from 'dayjs';

/**
 * 采购管理页面 - 完整版
 * 包含ProTable、Excel导入导出、商品/供应商关联选择
 */
const ProcurementManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  
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
  
  // 物流弹窗状态
  const [logisticsModalVisible, setLogisticsModalVisible] = useState(false);
  const [logisticsOrder, setLogisticsOrder] = useState<PurchaseOrder | null>(null);
  
  // 商品和供应商选项
  const [goodsOptions, setGoodsOptions] = useState<GoodsOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [goodsLoading, setGoodsLoading] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  
  // 表单实例
  const [createForm] = Form.useForm<ProcurementFormValues>();
  const [editForm] = Form.useForm<ProcurementFormValues>();
  
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
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    }
  });

  /**
   * 加载商品列表
   */
  const loadGoods = async () => {
    if (!currentBase) return;
    
    setGoodsLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/goods`, {
        method: 'GET',
        params: { page: 1, pageSize: 1000 },
      });
      
      if (result.success && result.data) {
        const options = result.data.map((item: any) => ({
          code: item.code,
          name: item.name,
          retailPrice: item.retailPrice,
          packPerBox: item.packPerBox || 1,      // 多少盒1箱
          piecePerPack: item.piecePerPack || 1,  // 多少包1盒
        }));
        setGoodsOptions(options);
      }
    } catch (error) {
      console.error('加载商品列表失败:', error);
    } finally {
      setGoodsLoading(false);
    }
  };

  /**
   * 加载供应商列表
   */
  const loadSuppliers = async () => {
    if (!currentBase) return;
    
    setSupplierLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/suppliers`, {
        method: 'GET',
        params: { page: 1, pageSize: 1000 },
      });
      
      if (result.success && result.data) {
        const options = result.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        setSupplierOptions(options);
      }
    } catch (error) {
      console.error('加载供应商列表失败:', error);
    } finally {
      setSupplierLoading(false);
    }
  };

  /**
   * 初始化加载商品和供应商
   */
  useEffect(() => {
    if (currentBase) {
      loadGoods();
      loadSuppliers();
    }
  }, [currentBase]);

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    if (!currentBase) return;
    
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders/stats`, {
        method: 'GET',
      });
      
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  /**
   * 监听基地变化，重新加载统计数据
   */
  useEffect(() => {
    if (currentBase) {
      loadStats();
    }
  }, [currentBase]);

  /**
   * 创建采购订单
   */
  const handleCreate = async (values: ProcurementFormValues) => {
    if (!currentBase) {
      return;
    }

    setCreateLoading(true);
    try {
      // 找到选中的商品，获取商品ID
      const selectedGoods = goodsOptions.find(g => g.code === values.goodsCode);
      if (!selectedGoods) {
        message.error('未找到选中的商品');
        setCreateLoading(false);
        return;
      }

      // 计算应付金额
      const amountBox = (values.unitPriceBox || 0) * (values.purchaseBoxQty || 0);
      const amountPack = (values.unitPricePack || 0) * (values.purchasePackQty || 0);
      const amountPiece = (values.unitPricePiece || 0) * (values.purchasePieceQty || 0);
      const totalAmount = amountBox + amountPack + amountPiece;

      // 构造后端API期望的数据格式
      const requestData = {
        supplierName: values.supplierName || '',
        // targetLocationId 不需要填写，到货时才分配具体位置
        purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
        actualAmount: values.actualAmount || 0,  // 使用用户输入的实付金额
        items: [
          {
            goodsId: selectedGoods.code, // 使用商品编号作为ID
            boxQuantity: values.purchaseBoxQty || 0,
            packQuantity: values.purchasePackQty || 0,
            pieceQuantity: values.purchasePieceQty || 0,
            unitPrice: values.unitPriceBox || 0,
          }
        ]
      };

      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'POST',
        data: requestData,
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        actionRef.current?.reload();
        loadStats();
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
  const handleUpdate = async (values: ProcurementFormValues) => {
    if (!currentBase || !editingOrder) {
      return;
    }

    setEditLoading(true);
    try {
      // 计算应付金额
      const amountBox = (values.unitPriceBox || 0) * (values.purchaseBoxQty || 0);
      const amountPack = (values.unitPricePack || 0) * (values.purchasePackQty || 0);
      const amountPiece = (values.unitPricePiece || 0) * (values.purchasePieceQty || 0);
      const totalAmount = amountBox + amountPack + amountPiece;

      const result = await request(
        `/api/v1/bases/${currentBase.id}/purchase-orders/${editingOrder.id}`,
        {
          method: 'PUT',
          data: {
            ...values,
            purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
            amountBox,
            amountPack,
            amountPiece,
            totalAmount,
          },
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingOrder(null);
        actionRef.current?.reload();
        loadStats();
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
        loadStats();
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
      ...record,
      purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
    } as any);
    setEditModalVisible(true);
  };

  /**
   * 查看物流信息
   */
  const handleLogistics = (record: PurchaseOrder) => {
    setLogisticsOrder(record);
    setLogisticsModalVisible(true);
  };

  /**
   * 统计信息内容
   */
  // 向下取整到2位小数
  const floorTo2 = (value: number): string => {
    return (Math.floor(value * 100) / 100).toFixed(2);
  };

  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="总订单数">{stats.totalOrders} 单</Descriptions.Item>
      <Descriptions.Item label="总金额">{floorTo2(stats.totalAmount)}</Descriptions.Item>
      <Descriptions.Item label="供应商数">{stats.uniqueSuppliers} 家</Descriptions.Item>
      <Descriptions.Item label="平均订单金额">{floorTo2(stats.averageAmount)}</Descriptions.Item>
    </Descriptions>
  );

  // 获取列定义
  const columns = getColumns(handleEdit, handleDelete, handleLogistics);

  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          请先选择基地
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ProTable<PurchaseOrder>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          try {
            const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
              method: 'GET',
              params: {
                page: params.current,
                pageSize: params.pageSize,
                orderNo: params.orderNo,
                supplierName: params.supplierName,
                goodsName: params.goodsName,
              },
            });

            if (result.success) {
              return {
                data: result.data || [],
                success: true,
                total: result.pagination?.total || 0,
              };
            }
            return {
              data: [],
              success: false,
              total: 0,
            };
          } catch (error) {
            console.error('加载采购订单失败:', error);
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        search={{
          labelWidth: 'auto',
        }}
        scroll={{ x: 'max-content' }}
        options={{
          setting: {
            listsHeight: 400,
          },
          reload: true,
          density: true,
        }}
        toolBarRender={() => [
          <Button
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>,
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
        width={700}
      >
        <ProcurementForm
          form={createForm}
          goodsOptions={goodsOptions}
          supplierOptions={supplierOptions}
          goodsLoading={goodsLoading}
          supplierLoading={supplierLoading}
          onFinish={handleCreate}
        />
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
        width={700}
      >
        <ProcurementForm
          form={editForm}
          goodsOptions={goodsOptions}
          supplierOptions={supplierOptions}
          goodsLoading={goodsLoading}
          supplierLoading={supplierLoading}
          onFinish={handleUpdate}
        />
      </Modal>

      {/* 导入Excel模态框 */}
      <ImportModal
        title="导入采购数据"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        loading={importLoading}
        progress={importProgress}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        tips={[
          '1. 请使用提供的模板文件，保持列名不变',
          '2. 采购日期、商品名称、供应商、拿货单价箱为必填项',
          '3. 商品名称需与系统中商品名称完全匹配',
          '4. 供应商需与系统中供应商名称完全匹配（请先在"供应商"页面添加）',
          '5. 采购编号留空则自动生成，填写已存在的编号则会更新该订单',
          '6. 零售价、折扣、应付金额等字段由系统自动计算，导入时会被忽略',
          '7. 支持批量导入，建议每次不超过500条',
        ]}
      />

      {/* 物流信息弹窗 */}
      <LogisticsModal
        visible={logisticsModalVisible}
        record={logisticsOrder}
        baseId={currentBase?.id || 0}
        onClose={() => {
          setLogisticsModalVisible(false);
          setLogisticsOrder(null);
        }}
        onRefreshSuccess={() => {
          actionRef.current?.reload();
        }}
      />
    </PageContainer>
  );
};

export default ProcurementManagement;
