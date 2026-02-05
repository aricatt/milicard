import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import {
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  App,
  Row,
  Col,
  Statistic,
  Divider,
  Alert,
  Space,
  Popover,
  Descriptions,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { useBase } from '@/contexts/BaseContext';
import { getColumns } from './columns';
import { useAnchorProfitExcel } from './useAnchorProfitExcel';
import ImportModal from '@/components/ImportModal';
import type {
  AnchorProfitRecord,
  AnchorProfitStats,
  AnchorProfitFormValues,
  PersonnelOption,
  ConsumptionOption,
} from './types';

const { TextArea } = Input;

const AnchorProfitPage: React.FC = () => {
  const { currentBase, currencyRate } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useAnchorProfitExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    },
  });

  // 状态
  const [profitMarginThreshold, setProfitMarginThreshold] = useState<number>(0.3);
  const [stats, setStats] = useState<AnchorProfitStats>({
    totalRecords: 0,
    totalGmv: 0,
    totalRefund: 0,
    totalSales: 0,
    totalConsumption: 0,
    totalAdSpend: 0,
    totalPlatformFee: 0,
    totalProfit: 0,
    avgProfitRate: 0,
    todayRecords: 0,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnchorProfitRecord | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // 下拉选项
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  
  // 消耗记录选项
  const [consumptionOptions, setConsumptionOptions] = useState<ConsumptionOption[]>([]);
  const [consumptionOptionsLoading, setConsumptionOptionsLoading] = useState(false);

  // 以人民币显示金额
  const [showInCNY, setShowInCNY] = useState(false);
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 获取当前汇率和货币代码
  const currentExchangeRate = currencyRate?.fixedRate || 1;
  const currentCurrencyCode = currentBase?.currency || 'CNY';

  // 计算字段
  const [calculatedValues, setCalculatedValues] = useState({
    salesAmount: 0,
    platformFeeAmount: 0,
    profitAmount: 0,
    profitRate: 0,
  });

  // 消耗金额（从选择的消耗记录获取，仅用于显示）
  const [consumptionAmount, setConsumptionAmount] = useState(0);
  // 拿货价（用于毛利计算）
  const [costPrice, setCostPrice] = useState(0);

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    if (!currentBase) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/anchor-profits/stats`, {
        method: 'GET',
      });

      if (result.success && result.data) {
        setStats({
          totalRecords: result.data.totalRecords || 0,
          totalGmv: result.data.totalGmv || 0,
          totalRefund: result.data.totalRefund || 0,
          totalSales: result.data.totalSales || 0,
          totalConsumption: result.data.totalConsumption || 0,
          totalAdSpend: result.data.totalAdSpend || 0,
          totalPlatformFee: result.data.totalPlatformFee || 0,
          totalProfit: result.data.totalProfit || 0,
          avgProfitRate: result.data.avgProfitRate || 0,
          todayRecords: result.data.todayRecords || 0,
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  /**
   * 加载人员列表（只加载主播）
   */
  const loadPersonnelOptions = async () => {
    if (!currentBase) return;

    setOptionsLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/personnel`, {
        method: 'GET',
      });

      if (result.success && result.data) {
        // 只保留主播
        setPersonnelOptions(
          result.data.filter((p: PersonnelOption) => p.role === 'ANCHOR')
        );
      }
    } catch (error) {
      console.error('加载人员列表失败:', error);
    } finally {
      setOptionsLoading(false);
    }
  };

  /**
   * 加载未关联利润的消耗记录（根据主播）
   * @param handlerId 主播ID
   * @param currentConsumptionId 当前编辑记录的消耗ID（编辑时需要包含）
   */
  const loadUnlinkedConsumptions = useCallback(async (handlerId: string, currentConsumptionId?: string) => {
    if (!currentBase || !handlerId) {
      setConsumptionOptions([]);
      setConsumptionAmount(0);
      setCostPrice(0);
      return;
    }

    setConsumptionOptionsLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/anchor-profits/unlinked-consumptions`,
        {
          method: 'GET',
          params: { 
            handlerId,
            currentConsumptionId, // 传递当前消耗ID，后端会包含它
          },
        }
      );

      if (result.success) {
        // 处理国际化并重新构建 label
        const processedOptions = (result.data || []).map((option: ConsumptionOption) => {
          const currentLocale = intl.locale;
          
          // 语言代码降级匹配：en-US -> en, zh-CN -> zh, vi-VN -> vi
          const getLocalizedValue = (i18nObj: Record<string, string> | undefined, fallback: string) => {
            if (!i18nObj) return fallback;
            
            // 1. 尝试完整匹配 (如 en-US)
            if (i18nObj[currentLocale]) return i18nObj[currentLocale];
            
            // 2. 尝试语言代码前缀匹配 (如 en-US -> en)
            const langPrefix = currentLocale.split('-')[0];
            if (i18nObj[langPrefix]) return i18nObj[langPrefix];
            
            // 3. 使用默认值
            return fallback;
          };
          
          // 获取本地化的品类名
          const localizedCategoryName = getLocalizedValue(option.categoryNameI18n, option.categoryName);
          const categoryDisplay = localizedCategoryName ? `[${localizedCategoryName}]` : '';
          
          // 获取本地化的商品名
          const localizedGoodsName = getLocalizedValue(option.goodsNameI18n, option.goodsName);
          
          // 重新构建 label（本地化单位）
          const dateStr = option.consumptionDate.split('T')[0];
          const boxUnit = intl.formatMessage({ id: 'unit.box' });
          const packUnit = intl.formatMessage({ id: 'unit.pack' });
          const pieceUnit = intl.formatMessage({ id: 'unit.piece' });
          const quantityStr = `${option.boxQuantity}${boxUnit}${option.packQuantity}${packUnit}${option.pieceQuantity}${pieceUnit}`;
          const amountStr = `¥${(option.consumptionAmount || 0).toFixed(2)}`;
          const localizedLabel = `${dateStr} - ${categoryDisplay}${localizedGoodsName} (${quantityStr}) ${amountStr}`;
          
          return {
            ...option,
            label: localizedLabel,
          };
        });
        
        setConsumptionOptions(processedOptions);
      }
    } catch (error) {
      console.error('获取消耗记录失败:', error);
      setConsumptionOptions([]);
    } finally {
      setConsumptionOptionsLoading(false);
    }
  }, [currentBase, intl]);

  /**
   * 选择消耗记录后更新消耗金额
   */
  const handleConsumptionChange = useCallback((consumptionId: string) => {
    const selected = consumptionOptions.find(c => c.id === consumptionId);
    if (selected) {
      // 直接使用后端计算好的值
      // - consumptionAmount: 消耗金额（基于 packPrice，仅用于显示）
      // - costPrice: 拿货价（基于 averageCost，用于计算毛利）
      setConsumptionAmount(selected.consumptionAmount); // 用于显示
      setCostPrice(selected.costPrice); // 用于毛利计算
      
      // 自动设置日期为消耗记录的日期
      form.setFieldValue('profitDate', dayjs(selected.consumptionDate));
    } else {
      setConsumptionAmount(0);
      setCostPrice(0);
    }
  }, [consumptionOptions, form]);

  /**
   * 计算利润相关字段
   */
  const calculateProfit = useCallback(() => {
    const gmv = form.getFieldValue('gmvAmount') || 0;
    const refund = form.getFieldValue('refundAmount') || 0;
    const cancelOrder = form.getFieldValue('cancelOrderAmount') || 0;
    const shopOrder = form.getFieldValue('shopOrderAmount') || 0;
    const water = form.getFieldValue('waterAmount') || 0;
    const adSpend = form.getFieldValue('adSpendAmount') || 0;
    const platformFeeRate = form.getFieldValue('platformFeeRate') || 17; // 默认17%

    // 当日销售额 = GMV + 店铺订单 + 走水 - 取消订单 - 退款
    const salesAmount = gmv + shopOrder + water - cancelOrder - refund;
    // 平台扣点 = (GMV - 取消订单 - 退款) * 扣点比例
    const platformFeeAmount = (gmv - cancelOrder - refund) * (platformFeeRate / 100);
    // 毛利 = 真实GMV - 拿货价 - 投流 - 平台扣点
    const profitAmount = salesAmount - costPrice - adSpend - platformFeeAmount;
    // 毛利率 = 毛利 / 真实GMV * 100
    const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

    setCalculatedValues({
      salesAmount,
      platformFeeAmount,
      profitAmount,
      profitRate,
    });
  }, [form, costPrice]);

  /**
   * 主播选择变化时加载消耗记录
   */
  const handleHandlerChange = (handlerId: string) => {
    // 清空之前选择的消耗记录
    form.setFieldValue('consumptionId', undefined);
    setConsumptionAmount(0);
    setCostPrice(0);
    // 加载该主播的未关联消耗记录
    loadUnlinkedConsumptions(handlerId);
    calculateProfit();
  };

  /**
   * 表单字段变化时重新计算
   */
  const handleFormValuesChange = () => {
    calculateProfit();
  };

  // 消耗金额变化时重新计算利润
  useEffect(() => {
    calculateProfit();
  }, [consumptionAmount, calculateProfit]);

  // 语言切换时重新处理消耗记录选项的 label
  useEffect(() => {
    if (consumptionOptions.length > 0) {
      const currentLocale = intl.locale;
      
      // 语言代码降级匹配函数
      const getLocalizedValue = (i18nObj: Record<string, string> | undefined, fallback: string) => {
        if (!i18nObj) return fallback;
        
        // 1. 尝试完整匹配 (如 en-US)
        if (i18nObj[currentLocale]) return i18nObj[currentLocale];
        
        // 2. 尝试语言代码前缀匹配 (如 en-US -> en)
        const langPrefix = currentLocale.split('-')[0];
        if (i18nObj[langPrefix]) return i18nObj[langPrefix];
        
        // 3. 使用默认值
        return fallback;
      };
      
      const updatedOptions = consumptionOptions.map((option) => {
        // 获取本地化的品类名
        const localizedCategoryName = getLocalizedValue(option.categoryNameI18n, option.categoryName);
        const categoryDisplay = localizedCategoryName ? `[${localizedCategoryName}]` : '';
        
        // 获取本地化的商品名
        const localizedGoodsName = getLocalizedValue(option.goodsNameI18n, option.goodsName);
        
        // 重新构建 label（本地化单位）
        const dateStr = option.consumptionDate.split('T')[0];
        const boxUnit = intl.formatMessage({ id: 'unit.box' });
        const packUnit = intl.formatMessage({ id: 'unit.pack' });
        const pieceUnit = intl.formatMessage({ id: 'unit.piece' });
        const quantityStr = `${option.boxQuantity}${boxUnit}${option.packQuantity}${packUnit}${option.pieceQuantity}${pieceUnit}`;
        const amountStr = `¥${(option.consumptionAmount || 0).toFixed(2)}`;
        const localizedLabel = `${dateStr} - ${categoryDisplay}${localizedGoodsName} (${quantityStr}) ${amountStr}`;
        
        return {
          ...option,
          label: localizedLabel,
        };
      });
      
      setConsumptionOptions(updatedOptions);
    }
  }, [intl.locale]); // 只监听语言变化，不包含 consumptionOptions 避免循环

  /**
   * 获取系统参数 - 毛利率预警阈值
   */
  const loadProfitMarginThreshold = async () => {
    try {
      const result = await request('/api/v1/global-settings/value/business.profit_margin_threshold');
      if (result.success && typeof result.data === 'number') {
        setProfitMarginThreshold(result.data);
      } else if (result.success && result.data === null) {
        // 参数不存在，使用默认值
        console.warn('System parameter "business.profit_margin_threshold" not found, using default value 0.3');
      }
    } catch (error) {
      // API 请求失败，使用默认值
      console.error('Failed to load profit margin threshold, using default value 0.3:', error);
    }
  };

  /**
   * 初始化加载
   */
  useEffect(() => {
    if (currentBase) {
      loadStats();
      loadPersonnelOptions();
      loadProfitMarginThreshold();
    }
  }, [currentBase]);

  /**
   * 获取利润记录列表
   */
  const fetchProfitRecords = async (params: any) => {
    if (!currentBase) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const { current = 1, pageSize = 20, ...rest } = params;
      const result = await request(`/api/v1/bases/${currentBase.id}/anchor-profits`, {
        method: 'GET',
        params: {
          page: current,
          pageSize,
          ...rest,
        },
      });

      if (result.success) {
        return {
          data: result.data || [],
          success: true,
          total: result.pagination?.total || 0,
        };
      }
      return { data: [], success: false, total: 0 };
    } catch (error) {
      console.error('获取利润记录失败:', error);
      return { data: [], success: false, total: 0 };
    }
  };

  /**
   * 创建利润记录
   */
  const handleCreate = async (values: AnchorProfitFormValues) => {
    if (!currentBase) return;

    setCreateLoading(true);
    try {
      const requestData = {
        profitDate: dayjs(values.profitDate).format('YYYY-MM-DD'),
        handlerId: values.handlerId,
        consumptionId: values.consumptionId, // 关联的消耗记录ID
        gmvAmount: values.gmvAmount || 0,
        refundAmount: values.refundAmount || 0,
        cancelOrderAmount: values.cancelOrderAmount || 0,
        shopOrderAmount: values.shopOrderAmount || 0,
        waterAmount: values.waterAmount || 0,
        adSpendAmount: values.adSpendAmount || 0,
        platformFeeRate: values.platformFeeRate || 17, // 平台扣点比例
        notes: values.notes,
        // 以下字段由后端自动计算，不需要传递：
        // - consumptionAmount (从消耗记录和商品信息计算)
        // - platformFeeAmount (从GMV和扣点比例计算)
        // - salesAmount (从GMV、退款等计算)
        // - profitAmount (从销售额、成本等计算)
        // - profitRate (从利润和销售额计算)
      };

      const result = await request(`/api/v1/bases/${currentBase.id}/anchor-profits`, {
        method: 'POST',
        data: requestData,
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        setConsumptionAmount(0);
        setCostPrice(0);
        setConsumptionOptions([]);
        setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建利润记录失败:', error);
      message.error('创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * 编辑利润记录
   */
  const handleEdit = async (record: AnchorProfitRecord) => {
    setEditingRecord(record);
    
    // 先加载该主播的消耗记录选项（包括已关联的）
    if (record.handlerId) {
      await loadUnlinkedConsumptions(record.handlerId, record.consumptionId);
    }
    
    form.setFieldsValue({
      profitDate: dayjs(record.profitDate),
      handlerId: record.handlerId,
      consumptionId: record.consumptionId, // 设置消耗记录ID
      gmvAmount: record.gmvAmount,
      refundAmount: record.refundAmount,
      cancelOrderAmount: record.cancelOrderAmount,
      shopOrderAmount: record.shopOrderAmount,
      waterAmount: record.waterAmount,
      adSpendAmount: record.adSpendAmount,
      platformFeeRate: record.salesAmount > 0 
        ? (record.platformFeeAmount / record.salesAmount) * 100 
        : 17,
      notes: record.notes,
    });
    // 消耗金额用于显示，拿货价用于计算
    setConsumptionAmount(record.consumptionAmount);
    setCostPrice(record.calculatedCostPrice || record.consumptionAmount); // 优先使用拿货价
    setCalculatedValues({
      salesAmount: record.salesAmount,
      platformFeeAmount: record.platformFeeAmount,
      profitAmount: record.profitAmount,
      profitRate: record.profitRate,
    });
    setEditModalVisible(true);
  };

  /**
   * 更新利润记录
   */
  const handleUpdate = async (values: AnchorProfitFormValues) => {
    if (!currentBase || !editingRecord) return;

    setEditLoading(true);
    try {
      const requestData = {
        profitDate: dayjs(values.profitDate).format('YYYY-MM-DD'),
        handlerId: values.handlerId,
        gmvAmount: values.gmvAmount || 0,
        refundAmount: values.refundAmount || 0,
        cancelOrderAmount: values.cancelOrderAmount || 0,
        shopOrderAmount: values.shopOrderAmount || 0,
        waterAmount: values.waterAmount || 0,
        adSpendAmount: values.adSpendAmount || 0,
        platformFeeRate: values.platformFeeRate || 17, // 平台扣点比例
        notes: values.notes,
        // 以下字段由后端自动计算，不需要传递
      };

      const result = await request(
        `/api/v1/bases/${currentBase.id}/anchor-profits/${editingRecord.id}`,
        {
          method: 'PUT',
          data: requestData,
        }
      );

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        setEditingRecord(null);
        form.resetFields();
        setConsumptionAmount(0);
        setCostPrice(0);
        setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新利润记录失败:', error);
      message.error('更新失败');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 删除利润记录
   */
  const handleDelete = async (id: string) => {
    if (!currentBase) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/anchor-profits/${id}`, {
        method: 'DELETE',
      });

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除利润记录失败:', error);
      message.error('删除失败');
    }
  };

  /**
   * 批量删除利润记录
   */
  const handleBatchDelete = async () => {
    if (!currentBase || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条利润记录吗？此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          let failCount = 0;

          for (const id of selectedRowKeys) {
            try {
              const result = await request(`/api/v1/bases/${currentBase.id}/anchor-profits/${id}`, {
                method: 'DELETE',
              });
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
          console.error('批量删除利润记录失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  // 列定义
  const columns = getColumns(handleEdit, handleDelete, intl, showInCNY, currentExchangeRate, profitMarginThreshold);

  // 无基地时显示提示
  if (!currentBase) {
    return (
      <PageContainer>
        <Alert message={intl.formatMessage({ id: 'message.selectBase' })} type="warning" showIcon />
      </PageContainer>
    );
  }

  // 表单内容（创建和编辑共用）
  const formContent = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.profitDate' })}
            name="profitDate"
            rules={[{ required: true, message: intl.formatMessage({ id: 'anchorProfit.form.profitDateRequired' }) }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.handler' })}
            name="handlerId"
            rules={[{ required: true, message: intl.formatMessage({ id: 'anchorProfit.form.handlerRequired' }) }]}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'anchorProfit.form.handlerPlaceholder' })}
              loading={optionsLoading}
              showSearch
              optionFilterProp="label"
              onChange={handleHandlerChange}
              options={personnelOptions.map((p) => ({
                value: p.id,
                label: `🎤 ${p.name}`,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.consumption' })}
            name="consumptionId"
            rules={[{ required: true, message: intl.formatMessage({ id: 'anchorProfit.form.consumptionRequired' }) }]}
            extra={intl.formatMessage({ id: 'anchorProfit.form.consumptionHint' })}
          >
            <Select
              placeholder={intl.formatMessage({ id: 'anchorProfit.form.consumptionPlaceholder' })}
              loading={consumptionOptionsLoading}
              showSearch
              optionFilterProp="label"
              onChange={handleConsumptionChange}
              disabled={consumptionOptions.length === 0}
              options={consumptionOptions.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
              notFoundContent={
                consumptionOptionsLoading 
                  ? intl.formatMessage({ id: 'message.loading' })
                  : intl.formatMessage({ id: 'anchorProfit.form.noConsumption' })
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'anchorProfit.form.incomeSection' })}</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.gmvAmount' })}
            name="gmvAmount"
            rules={[{ required: true, message: intl.formatMessage({ id: 'anchorProfit.form.gmvAmountRequired' }) }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder={intl.formatMessage({ id: 'anchorProfit.form.gmvAmountPlaceholder' })}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.refundAmount' })}
            name="refundAmount"
            initialValue={0}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.cancelOrderAmount' })}
            name="cancelOrderAmount"
            initialValue={0}
            extra={intl.formatMessage({ id: 'anchorProfit.form.cancelOrderAmountHint' })}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.shopOrderAmount' })}
            name="shopOrderAmount"
            initialValue={0}
            extra={intl.formatMessage({ id: 'anchorProfit.form.shopOrderAmountHint' })}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.waterAmount' })}
            name="waterAmount"
            initialValue={0}
            extra={intl.formatMessage({ id: 'anchorProfit.form.waterAmountHint' })}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'anchorProfit.form.costSection' })}</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.costPrice' })}
            extra="根据选择的消耗记录自动计算"
          >
            <InputNumber
              value={consumptionAmount}
              precision={2}
              style={{ width: '100%' }}
              disabled
              placeholder="请先选择消耗记录"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.platformFeeRate' })}
            name="platformFeeRate"
            initialValue={17}
            extra={intl.formatMessage({ id: 'anchorProfit.form.platformFeeRateHint' })}
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: '100%' }}
              placeholder="17"
              suffix="%"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8} style={{ display: 'none' }}>
          <Form.Item
            label={intl.formatMessage({ id: 'anchorProfit.form.adSpendAmount' })}
            name="adSpendAmount"
            initialValue={0}
            hidden
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* 隐藏利润结果区域 */}
      {/* <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'anchorProfit.form.resultSection' })}</Divider>
      <Alert
        message={intl.formatMessage({ id: 'anchorProfit.form.formula' })}
        description={
          <div style={{ fontSize: 12 }}>
            <div>{intl.formatMessage({ id: 'anchorProfit.form.formulaSales' })}</div>
            <div>{intl.formatMessage({ id: 'anchorProfit.form.formulaPlatformFee' })}</div>
            <div style={{ color: '#999' }}>拿货价、毛利、毛利率由后端自动计算</div>
          </div>
        }
        type="info"
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title={intl.formatMessage({ id: 'anchorProfit.form.salesAmount' })}
            value={calculatedValues.salesAmount}
            precision={2}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title={intl.formatMessage({ id: 'anchorProfit.form.platformFeeAmount' })}
            value={calculatedValues.platformFeeAmount}
            precision={2}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
      </Row> */}

      <Divider style={{ margin: '16px 0' }} />
      <Form.Item label={intl.formatMessage({ id: 'anchorProfit.form.notes' })} name="notes">
        <TextArea rows={2} placeholder={intl.formatMessage({ id: 'anchorProfit.form.notesPlaceholder' })} />
      </Form.Item>
    </>
  );

  // 统计详情内容
  const statsContent = (
    <Descriptions column={2} size="small" style={{ width: 400 }}>
      <Descriptions.Item label="总记录数">{stats.totalRecords} 条</Descriptions.Item>
      <Descriptions.Item label="今日记录">{stats.todayRecords} 条</Descriptions.Item>
      <Descriptions.Item label="总GMV">{stats.totalGmv.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总退款">{stats.totalRefund.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总销售额">{stats.totalSales.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总消耗">{stats.totalConsumption.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总投流">{stats.totalAdSpend.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总平台扣点">{stats.totalPlatformFee.toFixed(2)}</Descriptions.Item>
      <Descriptions.Item label="总利润">
        <span style={{ color: stats.totalProfit >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
          {stats.totalProfit.toFixed(2)}
        </span>
      </Descriptions.Item>
      <Descriptions.Item label="平均毛利率">
        <span style={{ 
          color: stats.avgProfitRate >= 50 ? '#52c41a' : 
                 stats.avgProfitRate >= 30 ? '#faad14' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {stats.avgProfitRate.toFixed(2)}%
        </span>
      </Descriptions.Item>
    </Descriptions>
  );

  return (
    <PageContainer header={{ title: false }}>
      {/* 数据表格 */}
      <ProTable<AnchorProfitRecord>
        columns={columns}
        actionRef={actionRef}
        request={fetchProfitRecords}
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
          defaultCollapsed: true,
        }}
        options={{
          setting: { listsHeight: 400 },
          density: true,
          reload: () => {
            actionRef.current?.reload();
            loadStats();
          },
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.anchorProfit' })}</span>
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
        toolBarRender={() => [
          currentCurrencyCode !== 'CNY' && (
            <Checkbox
              key="showInCNY"
              checked={showInCNY}
              onChange={(e) => setShowInCNY(e.target.checked)}
            >
              {intl.formatMessage({ id: 'products.showInCNY' })}
            </Checkbox>
          ),
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
              form.resetFields();
              setConsumptionAmount(0);
              setCostPrice(0);
              setConsumptionOptions([]); // 清空消耗记录选项
              setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'anchorProfit.add' })}
          </Button>,
        ]}
        scroll={{ x: 1600 }}
      />

      {/* 创建模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'anchorProfit.add' })}
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
          setConsumptionAmount(0);
          setCostPrice(0);
          setConsumptionOptions([]); // 清空消耗记录选项
          setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
        }}
        confirmLoading={createLoading}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} onValuesChange={handleFormValuesChange}>
          {formContent}
        </Form>
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'anchorProfit.edit' })}
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
          setConsumptionAmount(0);
          setCostPrice(0);
          setConsumptionOptions([]); // 清空消耗记录选项
          setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
        }}
        confirmLoading={editLoading}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate} onValuesChange={handleFormValuesChange}>
          {formContent}
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        title="导入主播利润"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        width={700}
        fields={[
          { field: '日期', required: true, description: '利润日期，格式YYYY-MM-DD', example: '2025-01-01' },
          { field: '消耗日期', required: true, description: '消耗记录日期，用于定位消耗记录', example: '2025-01-01' },
          { field: '品类', required: true, description: '商品品类名称，用于定位消耗记录', example: '卡牌' },
          { field: '商品', required: true, description: '商品名称，用于定位消耗记录', example: '宫崎骏卡牌' },
          { field: '直播间', required: true, description: '直播间名称，用于定位消耗记录', example: '直播间A' },
          { field: '主播', required: true, description: '主播姓名，用于定位消耗记录', example: '张三' },
          { field: 'GMV金额', required: true, description: '当日GMV金额', example: '10000' },
          { field: '退款金额', required: false, description: '退款金额', example: '500' },
          { field: '取消订单', required: false, description: '取消订单金额', example: '200' },
          { field: '店铺订单', required: false, description: '店铺订单金额', example: '300' },
          { field: '走水金额', required: false, description: '补单等额外收入', example: '200' },
          { field: '平台扣点比例%', required: false, description: '平台扣点比例，默认17', example: '17' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default AnchorProfitPage;
