import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Space, 
  Modal,
  Form,
  DatePicker,
  InputNumber,
  Select,
  App,
  Popover,
  Descriptions,
  Checkbox,
  Input,
  Row,
  Col,
  Alert,
  Spin,
} from 'antd';
import DualCurrencyInput from '@/components/DualCurrencyInput';
import { 
  PlusOutlined, 
  ExportOutlined, 
  ImportOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { request, useIntl, getLocale } from '@umijs/max';
import dayjs from 'dayjs';
import { getColumns } from './columns';
import { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';
import { useArrivalExcel } from './useArrivalExcel';
import ImportModal from '@/components/ImportModal';
import type { ArrivalRecord, ArrivalStats, ArrivalFormValues } from './types';

/**
 * 到货管理页面
 * 记录采购商品的到货情况，支持一张采购单分批多次到货
 */
const ArrivalManagement: React.FC = () => {
  const { currentBase, currencyRate } = useBase();
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
  } = useArrivalExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    },
  });
  
  // 状态管理
  const [stats, setStats] = useState<ArrivalStats>({
    totalRecords: 0,
    todayRecords: 0,
    thisWeekRecords: 0,
    thisMonthRecords: 0,
    totalBoxes: 0,
    totalPacks: 0,
    totalPieces: 0,
  });

  // 模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  // 下拉选项
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);  // 直播间和仓库
  const [handlers, setHandlers] = useState<any[]>([]);    // 主播和仓管
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [handlersLoading, setHandlersLoading] = useState(false);

  // 人民币支付模式（物流费用）
  const [cnyPaymentMode, setCnyPaymentMode] = useState(false);
  const [cnyLogisticsFee, setCnyLogisticsFee] = useState<number | null>(null);

  // 国际货运信息
  const [internationalLogistics, setInternationalLogistics] = useState<any[]>([]);
  const [intlLogisticsLoading, setIntlLogisticsLoading] = useState(false);
  const [calculatedIntlFreight, setCalculatedIntlFreight] = useState<number>(0);
  // 预先计算好的各级运费单价（使用 ref 避免闭包问题）
  const freightRatesRef = useRef({ perBox: 0, perPack: 0, perPiece: 0 });
  const [freightPerBox, setFreightPerBox] = useState<number>(0);
  
  // 当前选中采购单的待到货数量
  const [pendingQuantity, setPendingQuantity] = useState({ box: 0, pack: 0, piece: 0 });
  
  // 是否已选择采购单（用于显示国际货运提醒）
  const [hasPurchaseOrderSelected, setHasPurchaseOrderSelected] = useState(false);
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 获取当前汇率
  const currentExchangeRate = currencyRate?.fixedRate || 1;
  const currentCurrencyCode = currentBase?.currency || 'CNY';
  const isCNY = currentCurrencyCode === 'CNY';

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    if (!currentBase) return;
    
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/arrivals/stats`, {
        method: 'GET',
      });
      
      if (result.success && result.data) {
        setStats({
          totalRecords: result.data.totalRecords || 0,
          todayRecords: result.data.todayRecords || 0,
          thisWeekRecords: result.data.thisWeekRecords || 0,
          thisMonthRecords: result.data.thisMonthRecords || 0,
          totalBoxes: result.data.totalBoxes || 0,
          totalPacks: result.data.totalPacks || 0,
          totalPieces: result.data.totalPieces || 0,
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  /**
   * 加载采购订单列表（用于下拉选择）
   */
  const loadPurchaseOrders = async () => {
    if (!currentBase) return;
    
    setPurchaseOrdersLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/purchase-orders`, {
        method: 'GET',
        params: { pageSize: 500 },
      });
      
      if (result.success && result.data) {
        // 保存采购订单完整信息（包括id和goodsId）
        // 过滤掉已完全到货的采购单（到货数量 >= 采购数量）
        const orderMap = new Map();
        result.data.forEach((item: any) => {
          // 判断是否已完全到货
          const purchaseBox = item.purchaseBoxQty || 0;
          const purchasePack = item.purchasePackQty || 0;
          const purchasePiece = item.purchasePieceQty || 0;
          const arrivedBox = item.arrivedBoxQty || 0;
          const arrivedPack = item.arrivedPackQty || 0;
          const arrivedPiece = item.arrivedPieceQty || 0;
          
          // 如果到货数量已经大于等于采购数量，则认为已完全到货，不显示
          const isFullyArrived = arrivedBox >= purchaseBox && 
                                  arrivedPack >= purchasePack && 
                                  arrivedPiece >= purchasePiece &&
                                  (purchaseBox > 0 || purchasePack > 0 || purchasePiece > 0);
          
          if (!orderMap.has(item.orderNo) && !isFullyArrived) {
            // 格式化采购日期为 YYYY-MM-DD
            const dateStr = item.purchaseDate 
              ? item.purchaseDate.split('T')[0] 
              : '';
            // 品类显示：中文显示品类名称，其他语言显示品类编号
            const locale = getLocale();
            const categoryDisplay = item.categoryCode 
              ? `[${getCategoryDisplayName(item.categoryCode, item.categoryName, locale)}]` 
              : '';
            // 商品名称翻译
            const goodsName = getLocalizedGoodsName(item.goodsName, item.goodsNameI18n, locale);
            // 计算待到货数量 = 采购数量 - 已到货数量
            const pendingBoxQty = purchaseBox - arrivedBox;
            const pendingPackQty = purchasePack - arrivedPack;
            const pendingPieceQty = purchasePiece - arrivedPiece;
            
            orderMap.set(item.orderNo, {
              id: item.purchaseOrderId,       // 采购订单ID（用于国际货运查询）
              itemId: item.id,                // 采购订单明细项ID
              orderNo: item.orderNo,
              goodsId: item.goodsId,          // 商品ID
              purchaseDate: dateStr,
              goodsName: goodsName,
              goodsNameI18n: item.goodsNameI18n,
              categoryCode: item.categoryCode,
              categoryName: item.categoryName,
              supplierName: item.supplierName,
              // 商品拆分关系
              packPerBox: item.packPerBox || 1,
              piecePerPack: item.piecePerPack || 1,
              // 待到货数量
              pendingBoxQty: Math.max(0, pendingBoxQty),
              pendingPackQty: Math.max(0, pendingPackQty),
              pendingPieceQty: Math.max(0, pendingPieceQty),
              // 生成采购名称：采购日期 + [品类] + 商品名称
              purchaseName: `${dateStr}${categoryDisplay}${goodsName || ''}`,
            });
          }
        });
        setPurchaseOrders(Array.from(orderMap.values()));
      }
    } catch (error) {
      console.error('加载采购订单失败:', error);
    } finally {
      setPurchaseOrdersLoading(false);
    }
  };

  /**
   * 加载直播间和仓库列表
   */
  const loadLocations = async () => {
    if (!currentBase) return;
    
    setLocationsLoading(true);
    try {
      // 加载所有类型的位置（直播间和仓库）
      const result = await request(`/api/v1/bases/${currentBase.id}/locations`, {
        method: 'GET',
      });
      
      if (result.success && result.data) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('加载位置列表失败:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  /**
   * 加载主播和仓管列表
   */
  const loadHandlers = async () => {
    if (!currentBase) return;
    
    setHandlersLoading(true);
    try {
      // 加载主播和仓管
      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
        method: 'GET',
      });
      
      if (result.success && result.data) {
        setHandlers(result.data);
      }
    } catch (error) {
      console.error('加载人员列表失败:', error);
    } finally {
      setHandlersLoading(false);
    }
  };

  /**
   * 加载采购单的国际货运信息
   */
  const loadInternationalLogistics = async (purchaseOrderId: string) => {
    if (!currentBase || !purchaseOrderId) {
      setInternationalLogistics([]);
      setFreightPerBox(0);
      setCalculatedIntlFreight(0);
      return;
    }

    setIntlLogisticsLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/purchase-orders/${purchaseOrderId}/international-logistics`,
        { method: 'GET' }
      );

      if (result.success && result.data && result.data.length > 0) {
        setInternationalLogistics(result.data);
        
        // 获取当前选中采购单的商品拆分关系
        const selectedOrder = purchaseOrders.find(o => o.id === purchaseOrderId);
        const packPerBox = selectedOrder?.packPerBox || 1;
        const piecePerPack = selectedOrder?.piecePerPack || 1;
        
        // 计算总运费
        const totalFreight = result.data.reduce((sum: number, item: any) => sum + (item.freight || 0), 0);
        const boxCount = result.data.length; // 每条记录代表一箱
        
        // 预先计算各级运费单价
        const perBoxFreight = boxCount > 0 ? totalFreight / boxCount : 0;
        const perPackFreight = perBoxFreight / packPerBox;
        const perPieceFreight = perPackFreight / piecePerPack;
        
        // 存储到 ref 中（避免闭包问题）
        freightRatesRef.current = {
          perBox: Math.round(perBoxFreight * 100) / 100,
          perPack: Math.round(perPackFreight * 10000) / 10000,
          perPiece: Math.round(perPieceFreight * 10000) / 10000,
        };
        setFreightPerBox(freightRatesRef.current.perBox);
        
        // 自动勾选人民币支付
        setCnyPaymentMode(true);
      } else {
        setInternationalLogistics([]);
        freightRatesRef.current = { perBox: 0, perPack: 0, perPiece: 0 };
        setFreightPerBox(0);
        setCalculatedIntlFreight(0);
        setCnyPaymentMode(false);
      }
    } catch (error) {
      console.error('加载国际货运信息失败:', error);
      setInternationalLogistics([]);
      setFreightPerBox(0);
    } finally {
      setIntlLogisticsLoading(false);
    }
  };

  /**
   * 计算国际货运费用（根据到货数量）
   * 直接使用 ref 中预先计算好的各级运费单价
   */
  const calculateIntlFreight = (boxQty: number, packQty: number, pieceQty: number) => {
    const { perBox, perPack, perPiece } = freightRatesRef.current;
    
    if (perBox <= 0) {
      setCalculatedIntlFreight(0);
      return;
    }
    
    // 总运费 = 箱数×单箱运费 + 盒数×单盒运费 + 包数×单包运费
    const totalFreight = boxQty * perBox + packQty * perPack + pieceQty * perPiece;
    setCalculatedIntlFreight(Math.round(totalFreight * 100) / 100);
    
    // 自动填充人民币物流费用
    setCnyLogisticsFee(Math.round(totalFreight * 100) / 100);
  };

  /**
   * 处理采购单选择变化
   */
  const handlePurchaseOrderChange = (orderNo: string) => {
    const selectedOrder = purchaseOrders.find(o => o.orderNo === orderNo);
    if (selectedOrder) {
      setHasPurchaseOrderSelected(true);
      loadInternationalLogistics(selectedOrder.id);
      // 更新待到货数量
      setPendingQuantity({
        box: selectedOrder.pendingBoxQty || 0,
        pack: selectedOrder.pendingPackQty || 0,
        piece: selectedOrder.pendingPieceQty || 0,
      });
    } else {
      setHasPurchaseOrderSelected(false);
      setInternationalLogistics([]);
      freightRatesRef.current = { perBox: 0, perPack: 0, perPiece: 0 };
      setFreightPerBox(0);
      setCalculatedIntlFreight(0);
      setPendingQuantity({ box: 0, pack: 0, piece: 0 });
    }
    // 重置到货数量相关的计算
    setCalculatedIntlFreight(0);
    setCnyLogisticsFee(null);
  };

  /**
   * 处理到货数量变化
   * 使用 setTimeout 确保表单值已更新
   */
  const handleQuantityChange = () => {
    setTimeout(() => {
      const boxQty = createForm.getFieldValue('boxQuantity') || 0;
      const packQty = createForm.getFieldValue('packQuantity') || 0;
      const pieceQty = createForm.getFieldValue('pieceQuantity') || 0;
      
      if (internationalLogistics.length > 0) {
        calculateIntlFreight(boxQty, packQty, pieceQty);
      }
    }, 0);
  };

  /**
   * 初始化加载
   */
  useEffect(() => {
    if (currentBase) {
      loadStats();
      loadPurchaseOrders();
      loadLocations();
      loadHandlers();
    }
  }, [currentBase]);

  /**
   * 创建到货记录
   */
  const handleCreate = async (values: ArrivalFormValues) => {
    if (!currentBase) return;

    setCreateLoading(true);
    try {
      // 根据选择的采购单号找到对应的采购订单信息
      const selectedOrder = purchaseOrders.find(o => o.orderNo === values.purchaseOrderNo);
      if (!selectedOrder) {
        message.error('请选择有效的采购单');
        setCreateLoading(false);
        return;
      }

      const requestData = {
        purchaseOrderId: selectedOrder.id,    // 采购订单ID（商品ID从采购单自动获取）
        arrivalDate: values.arrivalDate?.format('YYYY-MM-DD'),
        locationId: values.locationId,
        handlerId: values.handlerId,
        boxQuantity: values.boxQuantity || 0,
        packQuantity: values.packQuantity || 0,
        pieceQuantity: values.pieceQuantity || 0,
        logisticsFee: values.logisticsFee || 0,
        // 如果是人民币支付模式，使用人民币物流费用
        cnyLogisticsFee: cnyPaymentMode ? (cnyLogisticsFee || 0) : 0,
        notes: values.notes,
      };

      const result = await request(`/api/v1/bases/${currentBase.id}/arrivals`, {
        method: 'POST',
        data: requestData,
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        createForm.resetFields();
        // 重置国际货运相关状态
        setInternationalLogistics([]);
        freightRatesRef.current = { perBox: 0, perPack: 0, perPiece: 0 };
        setFreightPerBox(0);
        setCalculatedIntlFreight(0);
        setCnyPaymentMode(false);
        setCnyLogisticsFee(null);
        setPendingQuantity({ box: 0, pack: 0, piece: 0 });
        setHasPurchaseOrderSelected(false);
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error: any) {
      console.error('创建到货记录失败:', error);
      // 显示后端返回的详细错误信息
      const errorMsg = error?.response?.data?.message || error?.message || '创建到货记录失败';
      Modal.error({
        title: '录入失败',
        content: <div style={{ whiteSpace: 'pre-line' }}>{errorMsg}</div>,
        okText: '知道了',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 删除到货记录
   */
  const handleDelete = async (record: ArrivalRecord) => {
    if (!currentBase) return;

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/arrivals/${record.id}`,
        { method: 'DELETE' }
      );

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除到货记录失败:', error);
      message.error('删除到货记录失败');
    }
  };

  /**
   * 批量删除到货记录
   */
  const handleBatchDelete = async () => {
    if (!currentBase || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条到货记录吗？此操作不可恢复。`,
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
                `/api/v1/bases/${currentBase.id}/arrivals/${id}`,
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
            loadStats();
          } else {
            message.error('删除失败');
          }
        } catch (error: any) {
          console.error('批量删除到货记录失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  /**
   * 统计信息内容
   */
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="总到货记录">{stats.totalRecords} 条</Descriptions.Item>
      <Descriptions.Item label="今日到货">{stats.todayRecords} 条</Descriptions.Item>
      <Descriptions.Item label="本周到货">{stats.thisWeekRecords} 条</Descriptions.Item>
      <Descriptions.Item label="本月到货">{stats.thisMonthRecords} 条</Descriptions.Item>
      <Descriptions.Item label="总到货箱数">{stats.totalBoxes} 箱</Descriptions.Item>
      <Descriptions.Item label="总到货盒数">{stats.totalPacks} 盒</Descriptions.Item>
      <Descriptions.Item label="总到货包数">{stats.totalPieces} 包</Descriptions.Item>
    </Descriptions>
  );

  // 获取列定义
  const columns = getColumns(handleDelete, intl);

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
    <PageContainer header={{ title: false }}>
      <ProTable<ArrivalRecord>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          try {
            const result = await request(`/api/v1/bases/${currentBase.id}/arrivals`, {
              method: 'GET',
              params: {
                current: params.current,
                pageSize: params.pageSize,
                purchaseOrderNo: params.purchaseOrderNo,
                goodsName: params.goodsName,
              },
            });

            if (result.success) {
              return {
                data: result.data || [],
                success: true,
                total: result.pagination?.total || result.total || 0,
              };
            }
            return {
              data: [],
              success: false,
              total: 0,
            };
          } catch (error) {
            console.error('加载到货记录失败:', error);
            return {
              data: [],
              success: false,
              total: 0,
            };
          }
        }}
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
            {intl.formatMessage({ id: 'arrivals.add' })}
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.arrivals' })}</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              ({intl.formatMessage({ id: 'stats.count' }, { count: stats.totalRecords })})
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

      {/* 创建到货记录模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'arrivals.add' })}
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
          // 重置国际货运相关状态
          setInternationalLogistics([]);
          freightRatesRef.current = { perBox: 0, perPack: 0, perPiece: 0 };
          setFreightPerBox(0);
          setCalculatedIntlFreight(0);
          setCnyPaymentMode(false);
          setCnyLogisticsFee(null);
          setPendingQuantity({ box: 0, pack: 0, piece: 0 });
          setHasPurchaseOrderSelected(false);
        }}
        confirmLoading={createLoading}
        width={600}
      >
        <Spin spinning={intlLogisticsLoading}>
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{
              arrivalDate: dayjs(),
              boxQuantity: 0,
              packQuantity: 0,
              pieceQuantity: 0,
            }}
          >
            {/* 第一行：到货日期 + 采购单 */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.arrivalDate' })}
                  name="arrivalDate"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.arrivalDateRequired' }) }]}
                >
                  <DatePicker style={{ width: '100%' }} placeholder={intl.formatMessage({ id: 'arrivals.form.arrivalDatePlaceholder' })} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.purchaseOrder' })}
                  name="purchaseOrderNo"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.purchaseOrderRequired' }) }]}
                >
                  <Select
                    placeholder={intl.formatMessage({ id: 'arrivals.form.purchaseOrderPlaceholder' })}
                    loading={purchaseOrdersLoading}
                    showSearch
                    optionFilterProp="label"
                    onChange={handlePurchaseOrderChange}
                    options={purchaseOrders.map((order) => ({
                      value: order.orderNo,
                      label: order.purchaseName || `${order.purchaseDate}${order.goodsName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 第二行：入库仓库 + 经手人 */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.location' })}
                  name="locationId"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.locationRequired' }) }]}
                >
                  <Select
                    placeholder={intl.formatMessage({ id: 'arrivals.form.locationPlaceholder' })}
                    loading={locationsLoading}
                    showSearch
                    optionFilterProp="label"
                    options={locations
                      .filter((loc) => loc.type === 'MAIN_WAREHOUSE')
                      .map((loc) => ({
                        value: loc.id,
                        label: loc.name,
                      }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.handler' })}
                  name="handlerId"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.handlerRequired' }) }]}
                >
                  <Select
                    placeholder={intl.formatMessage({ id: 'arrivals.form.handlerPlaceholder' })}
                    loading={handlersLoading}
                    showSearch
                    optionFilterProp="label"
                    allowClear
                    options={handlers.map((h) => ({
                      value: h.id,
                      label: h.role === 'WAREHOUSE_KEEPER' ? `👷 ${h.name}` : `🎤 ${h.name}`,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 未录入国际货运信息提醒 */}
            {hasPurchaseOrderSelected && !intlLogisticsLoading && internationalLogistics.length === 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={intl.formatMessage({ id: 'arrivals.form.noIntlLogisticsWarning' })}
              />
            )}

            {/* 待到货数量提示 */}
            {(pendingQuantity.box > 0 || pendingQuantity.pack > 0 || pendingQuantity.piece > 0) && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={intl.formatMessage({ id: 'arrivals.form.pendingQuantity' })}
                description={
                  <span>
                    {pendingQuantity.box > 0 && (
                      <span style={{ marginRight: 16 }}>
                        {intl.formatMessage({ id: 'arrivals.form.pendingBoxQty' })}: <strong>{pendingQuantity.box}</strong>
                      </span>
                    )}
                    {pendingQuantity.pack > 0 && (
                      <span style={{ marginRight: 16 }}>
                        {intl.formatMessage({ id: 'arrivals.form.pendingPackQty' })}: <strong>{pendingQuantity.pack}</strong>
                      </span>
                    )}
                    {pendingQuantity.piece > 0 && (
                      <span>
                        {intl.formatMessage({ id: 'arrivals.form.pendingPieceQty' })}: <strong>{pendingQuantity.piece}</strong>
                      </span>
                    )}
                  </span>
                }
              />
            )}

            {/* 第三行：到货数量（箱/盒/包） */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.boxQuantity' })}
                  name="boxQuantity"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.boxQuantityRequired' }) }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }} 
                    placeholder="0"
                    onChange={handleQuantityChange}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.packQuantity' })}
                  name="packQuantity"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.packQuantityRequired' }) }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }} 
                    placeholder="0"
                    onChange={handleQuantityChange}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label={intl.formatMessage({ id: 'arrivals.form.pieceQuantity' })}
                  name="pieceQuantity"
                  rules={[{ required: true, message: intl.formatMessage({ id: 'arrivals.form.pieceQuantityRequired' }) }]}
                >
                  <InputNumber 
                    min={0} 
                    style={{ width: '100%' }} 
                    placeholder="0"
                    onChange={handleQuantityChange}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 国际货运费用提示 */}
            {internationalLogistics.length > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={intl.formatMessage({ id: 'arrivals.form.intlFreightInfo' })}
                description={
                  <div>
                    {/* 显示国际货运录入详情 */}
                    <div style={{ marginBottom: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{intl.formatMessage({ id: 'arrivals.form.intlLogisticsDetail' })}:</div>
                      {internationalLogistics.map((item, index) => (
                        <div key={item.id} style={{ fontSize: 12, color: '#666' }}>
                          {intl.formatMessage({ id: 'internationalLogistics.column.batchNo' })}: {item.batchNo} | 
                          {intl.formatMessage({ id: 'internationalLogistics.column.boxNo' })}: {item.boxNo} | 
                          {intl.formatMessage({ id: 'internationalLogistics.column.dimensions' })}: {item.length}×{item.width}×{item.height}cm | 
                          {intl.formatMessage({ id: 'internationalLogistics.column.volume' })}: {item.volume?.toFixed(4)}m³ | 
                          {intl.formatMessage({ id: 'internationalLogistics.column.freight' })}: ¥{item.freight?.toFixed(2)}
                        </div>
                      ))}
                    </div>
                    <div>{intl.formatMessage({ id: 'arrivals.form.intlFreightPerBox' })}: <strong>¥{freightPerBox.toFixed(2)}</strong></div>
                    {calculatedIntlFreight > 0 && (
                      <div>{intl.formatMessage({ id: 'arrivals.form.intlFreightTotal' })}: <strong style={{ color: '#52c41a' }}>¥{calculatedIntlFreight.toFixed(2)}</strong></div>
                    )}
                  </div>
                }
              />
            )}

            {/* 人民币支付勾选框（物流费用） */}
            {!isCNY && (
              <Form.Item style={{ marginBottom: 8 }}>
                <Checkbox
                  checked={cnyPaymentMode}
                  onChange={(e) => setCnyPaymentMode(e.target.checked)}
                >
                  {intl.formatMessage({ id: 'arrivals.form.cnyPayment' })}
                  {internationalLogistics.length > 0 && (
                    <span style={{ color: '#1890ff', marginLeft: 8 }}>
                      ({intl.formatMessage({ id: 'arrivals.form.intlFreightAutoFill' })})
                    </span>
                  )}
                </Checkbox>
              </Form.Item>
            )}

            {/* 物流费用 - 双货币输入 */}
            <Form.Item
              label={internationalLogistics.length > 0 
                ? intl.formatMessage({ id: 'arrivals.form.intlFreight' })
                : intl.formatMessage({ id: 'arrivals.form.logisticsFee' })}
              name="logisticsFee"
            >
              <DualCurrencyInput
                currencyCode={currentCurrencyCode}
                exchangeRate={currentExchangeRate}
                placeholder={intl.formatMessage({ id: 'arrivals.form.logisticsFeePlaceholder' })}
                precision={2}
                min={0}
                cnyPaymentMode={cnyPaymentMode}
                onCnyValueChange={setCnyLogisticsFee}
                initialCnyValue={cnyPaymentMode && calculatedIntlFreight > 0 ? calculatedIntlFreight : undefined}
              />
            </Form.Item>

            {/* 隐藏字段：人民币物流费用 */}
            <Form.Item name="cnyLogisticsFee" hidden>
              <InputNumber />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        title="导入到货记录"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        loading={importLoading}
        progress={importProgress}
        onImport={handleImport}
        width={700}
        fields={[
          { field: '到货日期', required: true, description: '到货日期，格式YYYY-MM-DD', example: '2025-11-24' },
          { field: '采购编号', required: true, description: '系统中已存在的采购单编号', example: 'PUSH-1CLM4AT5542' },
          { field: '直播间', required: true, description: '需与系统中直播间名称一致', example: '泰国仓库 1' },
          { field: '主播', required: true, description: '需与系统中主播姓名一致', example: 'Lin' },
          { field: '到货箱', required: false, description: '到货箱数', example: '2' },
          { field: '到货盒', required: false, description: '到货盒数', example: '0' },
          { field: '到货包', required: false, description: '到货包数', example: '0' },
        ]}
      />
    </PageContainer>
  );
};

export default ArrivalManagement;
