import React, { useRef, useState, useEffect } from 'react';
import { 
  Space, 
  Modal,
  Form,
  App,
  Button,
  Popconfirm,
  Popover,
  Descriptions,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import { useProcurementExcel } from './useProcurementExcel';
import ProcurementForm from './ProcurementForm';
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
  } = useProcurementExcel(currentBase?.id || 0, () => {
    actionRef.current?.reload();
    loadStats();
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
      // 计算应付金额
      const amountBox = (values.unitPriceBox || 0) * (values.purchaseBoxQty || 0);
      const amountPack = (values.unitPricePack || 0) * (values.purchasePackQty || 0);
      const amountPiece = (values.unitPricePiece || 0) * (values.purchasePieceQty || 0);
      const totalAmount = amountBox + amountPack + amountPiece;

      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'POST',
        data: {
          ...values,
          purchaseDate: values.purchaseDate?.format('YYYY-MM-DD'),
          amountBox,
          amountPack,
          amountPiece,
          totalAmount,
        },
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

// 继续在 index_new_part2.tsx
