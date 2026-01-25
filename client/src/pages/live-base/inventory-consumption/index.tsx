import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Input,
  Row,
  Col,
  Divider,
  Spin,
  Alert,
  Checkbox,
} from 'antd';
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
import { request, useIntl } from '@umijs/max';
import dayjs from 'dayjs';
import { getColumns } from './columns';
import { useConsumptionExcel } from './useConsumptionExcel';
import ImportModal from '@/components/ImportModal';
import { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';
import type { 
  ConsumptionRecord, 
  ConsumptionStats, 
  ConsumptionFormValues,
  LocationOption,
  PersonnelOption,
  GoodsOption,
} from './types';

const { TextArea } = Input;

/**
 * 消耗管理页面
 * 记录主播销售消耗情况
 */
const ConsumptionManagement: React.FC = () => {
  const { currentBase, currencyRate } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm();

  // 状态管理
  const [stats, setStats] = useState<ConsumptionStats>({
    totalRecords: 0,
    totalGoods: 0,
    totalBoxQuantity: 0,
    totalPackQuantity: 0,
    totalPieceQuantity: 0,
    todayRecords: 0,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // 编辑相关状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConsumptionRecord | null>(null);
  const [editForm] = Form.useForm();

  // 期初数据状态
  const [openingStock, setOpeningStock] = useState<{
    openingBoxQty: number;
    openingPackQty: number;
    openingPieceQty: number;
    unitPricePerBox: number;
    packPerBox: number;
    piecePerPack: number;
  } | null>(null);
  const [openingStockLoading, setOpeningStockLoading] = useState(false);

  // 期末数据（用户填写）
  const [closingStock, setClosingStock] = useState({
    closingBoxQty: 0,
    closingPackQty: 0,
    closingPieceQty: 0,
  });

  // 下拉选项
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [goodsOptions, setGoodsOptions] = useState<GoodsOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  
  // 以人民币显示金额
  const [showInCNY, setShowInCNY] = useState(false);
  
  // 最新剩余库存筛选
  const [showLatestStock, setShowLatestStock] = useState(false);
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 获取当前汇率和货币代码
  const currentExchangeRate = currencyRate?.fixedRate || 1;
  const currentCurrencyCode = currentBase?.currency || 'CNY';

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
    handleDownloadTemplate,
  } = useConsumptionExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    currencyCode: currentCurrencyCode,
    exchangeRate: currentExchangeRate,
    showInCNY,
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    },
  });

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    if (!currentBase) return;
    
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/consumptions/stats`, {
        method: 'GET',
      });

      if (result.success && result.data) {
        setStats({
          totalRecords: result.data.totalRecords || 0,
          totalGoods: result.data.totalGoods || 0,
          totalBoxQuantity: result.data.totalBoxQuantity || 0,
          totalPackQuantity: result.data.totalPackQuantity || 0,
          totalPieceQuantity: result.data.totalPieceQuantity || 0,
          todayRecords: result.data.todayRecords || 0,
        });
      }
    } catch (error) {
      console.error('获取消耗统计失败:', error);
    }
  };

  /**
   * 加载下拉选项数据
   */
  const loadOptions = async () => {
    if (!currentBase) return;
    
    setOptionsLoading(true);
    try {
      const [locationsRes, personnelRes, goodsRes] = await Promise.all([
        request(`/api/v1/bases/${currentBase.id}/locations`, { method: 'GET', params: { pageSize: 1000 } }),
        request(`/api/v1/bases/${currentBase.id}/personnel`, { method: 'GET', params: { pageSize: 1000 } }),
        request(`/api/v1/bases/${currentBase.id}/goods`, { method: 'GET', params: { pageSize: 1000 } }),
      ]);

      if (locationsRes.success) {
        setLocationOptions(locationsRes.data || []);
      }
      if (personnelRes.success) {
        setPersonnelOptions(personnelRes.data || []);
      }
      if (goodsRes.success) {
        setGoodsOptions(goodsRes.data || []);
      }
    } catch (error) {
      console.error('加载选项数据失败:', error);
    } finally {
      setOptionsLoading(false);
    }
  };

  /**
   * 删除消耗记录
   */
  const handleDelete = async (record: ConsumptionRecord) => {
    if (!currentBase) return;

    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/consumptions/${record.id}`,
        { method: 'DELETE' }
      );

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error: any) {
      console.error('删除消耗记录失败:', error);
      // 显示后端返回的详细错误信息
      const errorMessage = error?.response?.data?.message || error?.message || '删除消耗记录失败';
      message.error(errorMessage);
    }
  };

  /**
   * 批量删除消耗记录
   */
  const handleBatchDelete = async () => {
    if (!currentBase || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条消耗记录吗？此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          let failCount = 0;
          const errorMessages: string[] = [];

          for (const id of selectedRowKeys) {
            try {
              const result = await request(
                `/api/v1/bases/${currentBase.id}/consumptions/${id}`,
                { method: 'DELETE' }
              );
              if (result.success) {
                successCount++;
              } else {
                failCount++;
                if (result.message) {
                  errorMessages.push(result.message);
                }
              }
            } catch (error: any) {
              failCount++;
              const errorMsg = error?.response?.data?.message || error?.message;
              if (errorMsg && !errorMessages.includes(errorMsg)) {
                errorMessages.push(errorMsg);
              }
            }
          }

          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 条记录${failCount > 0 ? `，失败 ${failCount} 条` : ''}`);
            if (errorMessages.length > 0) {
              // 显示失败原因
              Modal.warning({
                title: '部分记录删除失败',
                content: errorMessages.join('\n'),
              });
            }
            setSelectedRowKeys([]);
            actionRef.current?.reload();
            loadStats();
          } else {
            if (errorMessages.length > 0) {
              Modal.error({
                title: '删除失败',
                content: errorMessages.join('\n'),
              });
            } else {
              message.error('删除失败');
            }
          }
        } catch (error: any) {
          console.error('批量删除消耗记录失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  /**
   * 加载期初库存数据
   */
  const loadOpeningStock = useCallback(async (goodsId: string, handlerId: string) => {
    if (!currentBase || !goodsId || !handlerId) {
      setOpeningStock(null);
      return;
    }

    setOpeningStockLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/consumptions/opening-stock`, {
        method: 'GET',
        params: { goodsId, handlerId },
      });

      if (result.success && result.data) {
        setOpeningStock(result.data);
        // 重置期末数据
        setClosingStock({
          closingBoxQty: 0,
          closingPackQty: 0,
          closingPieceQty: 0,
        });
      } else {
        setOpeningStock(null);
      }
    } catch (error) {
      console.error('获取期初数据失败:', error);
      setOpeningStock(null);
    } finally {
      setOpeningStockLoading(false);
    }
  }, [currentBase]);

  /**
   * 商品、直播间或主播变化时加载期初数据
   * 注意：在直播间，货物归属是人，所以需要选择主播后才计算期初库存
   */
  const handleFormFieldChange = () => {
    const goodsId = form.getFieldValue('goodsId');
    const handlerId = form.getFieldValue('handlerId');
    // 需要商品和主播都选择后才加载期初数据（按主播计算）
    if (goodsId && handlerId) {
      loadOpeningStock(goodsId, handlerId);
    } else {
      setOpeningStock(null);
    }
  };

  /**
   * 将箱-盒-包转换为总包数（最小单位）
   */
  const convertToTotalPieces = (box: number, pack: number, piece: number) => {
    if (!openingStock) return 0;
    const { packPerBox, piecePerPack } = openingStock;
    return box * packPerBox * piecePerPack + pack * piecePerPack + piece;
  };

  /**
   * 将总包数转换为箱-盒-包
   */
  const convertFromTotalPieces = (totalPieces: number) => {
    if (!openingStock) return { boxQty: 0, packQty: 0, pieceQty: 0 };
    const { packPerBox, piecePerPack } = openingStock;
    const piecesPerBox = packPerBox * piecePerPack;
    
    const boxQty = Math.floor(totalPieces / piecesPerBox);
    const remainingAfterBox = totalPieces % piecesPerBox;
    const packQty = Math.floor(remainingAfterBox / piecePerPack);
    const pieceQty = remainingAfterBox % piecePerPack;
    
    return { boxQty, packQty, pieceQty };
  };

  /**
   * 计算消耗数量（考虑箱-盒-包转换关系）
   * 消耗 = 期初总量 - 期末总量，然后转换为箱-盒-包
   */
  const calculateConsumption = () => {
    if (!openingStock) return { boxQty: 0, packQty: 0, pieceQty: 0 };
    
    const openingTotal = convertToTotalPieces(
      openingStock.openingBoxQty,
      openingStock.openingPackQty,
      openingStock.openingPieceQty
    );
    const closingTotal = convertToTotalPieces(
      closingStock.closingBoxQty,
      closingStock.closingPackQty,
      closingStock.closingPieceQty
    );
    const consumptionTotal = openingTotal - closingTotal;
    
    return convertFromTotalPieces(consumptionTotal);
  };

  /**
   * 计算期初总包数
   */
  const getOpeningTotalPieces = () => {
    if (!openingStock) return 0;
    return convertToTotalPieces(
      openingStock.openingBoxQty,
      openingStock.openingPackQty,
      openingStock.openingPieceQty
    );
  };

  /**
   * 计算期末总包数
   */
  const getClosingTotalPieces = () => {
    return convertToTotalPieces(
      closingStock.closingBoxQty,
      closingStock.closingPackQty,
      closingStock.closingPieceQty
    );
  };

  /**
   * 验证期末数量是否有效（不超过期初总量）
   */
  const isClosingStockValid = () => {
    return getClosingTotalPieces() <= getOpeningTotalPieces();
  };

  /**
   * 打开编辑表单
   */
  const handleEdit = (record: ConsumptionRecord) => {
    setEditingRecord(record);
    // 设置表单初始值
    editForm.setFieldsValue({
      consumptionDate: dayjs(record.consumptionDate),
      goodsId: record.goodsId,
      locationId: record.locationId,
      handlerId: record.handlerId,
      notes: record.notes,
    });
    // 设置期初和期末数据
    setOpeningStock({
      openingBoxQty: record.openingBoxQty,
      openingPackQty: record.openingPackQty,
      openingPieceQty: record.openingPieceQty,
      unitPricePerBox: record.unitPricePerBox || 0,
      packPerBox: record.packPerBox || 1,
      piecePerPack: record.piecePerPack || 1,
    });
    setClosingStock({
      closingBoxQty: record.closingBoxQty,
      closingPackQty: record.closingPackQty,
      closingPieceQty: record.closingPieceQty,
    });
    setEditModalVisible(true);
  };

  /**
   * 更新消耗记录
   */
  const handleUpdate = async (values: ConsumptionFormValues) => {
    if (!currentBase || !editingRecord || !openingStock) return;

    setEditLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/consumptions/${editingRecord.id}`, {
        method: 'PUT',
        data: {
          consumptionDate: values.consumptionDate.format('YYYY-MM-DD'),
          goodsId: values.goodsId,
          locationId: values.locationId,
          handlerId: values.handlerId,
          openingBoxQty: openingStock.openingBoxQty,
          openingPackQty: openingStock.openingPackQty,
          openingPieceQty: openingStock.openingPieceQty,
          closingBoxQty: closingStock.closingBoxQty,
          closingPackQty: closingStock.closingPackQty,
          closingPieceQty: closingStock.closingPieceQty,
          notes: values.notes,
        },
      });

      if (result.success) {
        message.success('更新成功');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingRecord(null);
        setOpeningStock(null);
        setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error: any) {
      console.error('更新消耗记录失败:', error);
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * 创建消耗记录
   */
  const handleCreate = async (values: ConsumptionFormValues) => {
    if (!currentBase || !openingStock) return;

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/consumptions`, {
        method: 'POST',
        data: {
          consumptionDate: values.consumptionDate.format('YYYY-MM-DD'),
          goodsId: values.goodsId,
          locationId: values.locationId,
          handlerId: values.handlerId,
          openingBoxQty: openingStock.openingBoxQty,
          openingPackQty: openingStock.openingPackQty,
          openingPieceQty: openingStock.openingPieceQty,
          closingBoxQty: closingStock.closingBoxQty,
          closingPackQty: closingStock.closingPackQty,
          closingPieceQty: closingStock.closingPieceQty,
          notes: values.notes,
        },
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        setOpeningStock(null);
        setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error: any) {
      console.error('创建消耗记录失败:', error);
      // 全局错误处理器已经会显示错误消息，这里不需要重复显示
    } finally {
      setCreateLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (currentBase) {
      loadStats();
      loadOptions();
    }
  }, [currentBase]);

  // 统计详情内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="总消耗记录">{stats.totalRecords} 条</Descriptions.Item>
      <Descriptions.Item label="今日消耗">{stats.todayRecords} 条</Descriptions.Item>
      <Descriptions.Item label="涉及商品">{stats.totalGoods} 种</Descriptions.Item>
      <Descriptions.Item label="总消耗箱数">{stats.totalBoxQuantity} 箱</Descriptions.Item>
      <Descriptions.Item label="总消耗盒数">{stats.totalPackQuantity} 盒</Descriptions.Item>
      <Descriptions.Item label="总消耗包数">{stats.totalPieceQuantity} 包</Descriptions.Item>
    </Descriptions>
  );

  // 如果没有选择基地
  if (!currentBase) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          请先选择基地
        </div>
      </PageContainer>
    );
  }

  // 构建主播选项用于查询下拉
  const anchorOptions = personnelOptions
    .filter(p => p.role === 'ANCHOR')
    .map(p => ({ value: p.id, label: p.name }));

  const columns = getColumns({ onEdit: handleEdit, onDelete: handleDelete, intl, showInCNY, exchangeRate: currentExchangeRate, anchorOptions });

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<ConsumptionRecord>
        columns={columns}
        actionRef={actionRef}
        cardBordered
        request={async (params) => {
          if (!currentBase) {
            return { data: [], success: true, total: 0 };
          }

          try {
            const result = await request(`/api/v1/bases/${currentBase.id}/consumptions`, {
              method: 'GET',
              params: {
                current: params.current,
                pageSize: params.pageSize,
                goodsName: params.goodsName,
                handlerId: params.handlerId,
                startDate: params.consumptionDate?.[0],
                endDate: params.consumptionDate?.[1],
                latestStock: showLatestStock, // 最新剩余库存筛选
              },
            });

            return {
              data: result.data || [],
              success: result.success,
              total: result.total || 0,
            };
          } catch (error) {
            console.error('获取消耗记录失败:', error);
            return { data: [], success: false, total: 0 };
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
        search={{
          labelWidth: 'auto',
          defaultCollapsed: true,
          optionRender: (searchConfig, formProps, dom) => [
            <Button
              key="latestStock"
              type={showLatestStock ? 'primary' : 'default'}
              onClick={() => {
                setShowLatestStock(!showLatestStock);
                actionRef.current?.reload();
              }}
            >
              最新剩余库存
            </Button>,
            ...dom,
          ],
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
            <span>{intl.formatMessage({ id: 'list.title.consumption' })}</span>
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
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ consumptionDate: dayjs() });
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'consumption.add' })}
          </Button>,
        ]}
        scroll={{ x: 1800 }}
      />

      {/* 创建消耗记录模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'consumption.add' })}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setOpeningStock(null);
          setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
        }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ consumptionDate: dayjs() }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.consumptionDate' })}
                name="consumptionDate"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.consumptionDateRequired' }) }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.goods' })}
                name="goodsId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.goodsRequired' }) }]}
              >
                <Select
                  key={intl.locale}
                  placeholder={intl.formatMessage({ id: 'consumption.form.goodsPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={goodsOptions.map(g => {
                    const categoryDisplay = getCategoryDisplayName(g.categoryCode, g.categoryName, g.categoryNameI18n, intl.locale);
                    const goodsName = getLocalizedGoodsName(g.name, g.nameI18n, intl.locale);
                    const label = categoryDisplay ? `[${categoryDisplay}]${goodsName}` : goodsName;
                    return { value: g.id, label };
                  })}
                  onChange={handleFormFieldChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.location' })}
                name="locationId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.locationRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'consumption.form.locationPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={locationOptions
                    .filter(l => l.type === 'LIVE_ROOM')
                    .map(l => ({ value: l.id, label: l.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.handler' })}
                name="handlerId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.handlerRequired' }) }]}
                extra={intl.formatMessage({ id: 'consumption.form.handlerHint' })}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'consumption.form.handlerPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={personnelOptions
                    .filter(p => p.role === 'ANCHOR')
                    .map(p => ({ value: p.id, label: `🎤 ${p.name}` }))}
                  onChange={handleFormFieldChange}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 期初数据显示 */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.openingSection' })}</Divider>
          <Spin spinning={openingStockLoading}>
            {openingStock ? (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingBox' })}>
                    <InputNumber
                      value={openingStock.openingBoxQty}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingPack' })}>
                    <InputNumber
                      value={openingStock.openingPackQty}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingPiece' })}>
                    <InputNumber
                      value={openingStock.openingPieceQty}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              <Alert
                message={intl.formatMessage({ id: 'consumption.form.openingHint' })}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </Spin>

          {/* 期末数据输入 */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.closingSection' })}</Divider>
          {openingStock && !isClosingStockValid() && (
            <Alert
              message={intl.formatMessage({ id: 'consumption.form.closingError' })}
              description={`期初总量: ${getOpeningTotalPieces()} 包，当前期末: ${getClosingTotalPieces()} 包（换算关系: 1箱=${openingStock.packPerBox}盒, 1盒=${openingStock.piecePerPack}包）`}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingBox' })}
                extra={openingStock ? `期初: ${openingStock.openingBoxQty} 箱` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingBoxQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingBoxQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingPack' })}
                extra={openingStock ? `期初: ${openingStock.openingPackQty} 盒（1箱=${openingStock.packPerBox}盒）` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingPackQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingPackQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingPiece' })}
                extra={openingStock ? `期初: ${openingStock.openingPieceQty} 包（1盒=${openingStock.piecePerPack}包）` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingPieceQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingPieceQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 消耗数据显示（自动计算） */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.consumptionSection' })}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionBox' })}>
                <InputNumber
                  value={calculateConsumption().boxQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionPack' })}>
                <InputNumber
                  value={calculateConsumption().packQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionPiece' })}>
                <InputNumber
                  value={calculateConsumption().pieceQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={intl.formatMessage({ id: 'consumption.form.notes' })} name="notes">
            <TextArea rows={2} placeholder={intl.formatMessage({ id: 'consumption.form.notesPlaceholder' })} maxLength={500} showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                setOpeningStock(null);
                setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
              }}>{intl.formatMessage({ id: 'button.cancel' })}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createLoading}
                disabled={!openingStock || !isClosingStockValid()}
              >
                {intl.formatMessage({ id: 'button.create' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑消耗记录模态框 */}
      <Modal
        title={intl.formatMessage({ id: 'button.edit' })}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRecord(null);
          setOpeningStock(null);
          setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.consumptionDate' })}
                name="consumptionDate"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.consumptionDateRequired' }) }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.goods' })}
                name="goodsId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.goodsRequired' }) }]}
              >
                <Select
                  key={intl.locale}
                  placeholder={intl.formatMessage({ id: 'consumption.form.goodsPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={goodsOptions.map(g => {
                    const categoryDisplay = getCategoryDisplayName(g.categoryCode, g.categoryName, g.categoryNameI18n, intl.locale);
                    const goodsName = getLocalizedGoodsName(g.name, g.nameI18n, intl.locale);
                    const label = categoryDisplay ? `[${categoryDisplay}]${goodsName}` : goodsName;
                    return { value: g.id, label };
                  })}
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.location' })}
                name="locationId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.locationRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'consumption.form.locationPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={locationOptions
                    .filter(l => l.type === 'LIVE_ROOM')
                    .map(l => ({ value: l.id, label: l.name }))}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'consumption.form.handler' })}
                name="handlerId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'consumption.form.handlerRequired' }) }]}
                extra={intl.formatMessage({ id: 'consumption.form.handlerHint' })}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'consumption.form.handlerPlaceholder' })}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={personnelOptions
                    .filter(p => p.role === 'ANCHOR')
                    .map(p => ({ value: p.id, label: `🎤 ${p.name}` }))}
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 期初数据显示 */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.openingSection' })}</Divider>
          {openingStock && (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingBox' })}>
                  <InputNumber
                    value={openingStock.openingBoxQty}
                    disabled
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingPack' })}>
                  <InputNumber
                    value={openingStock.openingPackQty}
                    disabled
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={intl.formatMessage({ id: 'consumption.form.openingPiece' })}>
                  <InputNumber
                    value={openingStock.openingPieceQty}
                    disabled
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* 期末数据输入 */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.closingSection' })}</Divider>
          {openingStock && !isClosingStockValid() && (
            <Alert
              message={intl.formatMessage({ id: 'consumption.form.closingError' })}
              description={`期初总量: ${getOpeningTotalPieces()} 包，当前期末: ${getClosingTotalPieces()} 包（换算关系: 1箱=${openingStock.packPerBox}盒, 1盒=${openingStock.piecePerPack}包）`}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingBox' })}
                extra={openingStock ? `期初: ${openingStock.openingBoxQty} 箱` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingBoxQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingBoxQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingPack' })}
                extra={openingStock ? `期初: ${openingStock.openingPackQty} 盒（1箱=${openingStock.packPerBox}盒）` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingPackQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingPackQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={intl.formatMessage({ id: 'consumption.form.closingPiece' })}
                extra={openingStock ? `期初: ${openingStock.openingPieceQty} 包（1盒=${openingStock.piecePerPack}包）` : undefined}
              >
                <InputNumber
                  min={0}
                  value={closingStock.closingPieceQty}
                  onChange={(v) => setClosingStock(prev => ({ ...prev, closingPieceQty: v || 0 }))}
                  disabled={!openingStock}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 消耗数据显示（自动计算） */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'consumption.form.consumptionSection' })}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionBox' })}>
                <InputNumber
                  value={calculateConsumption().boxQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionPack' })}>
                <InputNumber
                  value={calculateConsumption().packQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={intl.formatMessage({ id: 'consumption.form.consumptionPiece' })}>
                <InputNumber
                  value={calculateConsumption().pieceQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={intl.formatMessage({ id: 'consumption.form.notes' })} name="notes">
            <TextArea rows={2} placeholder={intl.formatMessage({ id: 'consumption.form.notesPlaceholder' })} maxLength={500} showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingRecord(null);
                setOpeningStock(null);
                setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
              }}>{intl.formatMessage({ id: 'button.cancel' })}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={editLoading}
                disabled={!openingStock || !isClosingStockValid()}
              >
                {intl.formatMessage({ id: 'button.save' })}
              </Button>
            </Space>
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
        title="导入消耗记录"
        width={700}
        fields={[
          { field: '消耗日期', required: true, description: '消耗日期，格式YYYY-MM-DD', example: '2025-01-01' },
          { field: '品类', required: true, description: '商品品类，与商品名称组合匹配商品', example: '卡牌' },
          { field: '商品', required: true, description: '与品类组合匹配，需在全局商品库中存在', example: '商品名称' },
          { field: '直播间', required: true, description: '需与系统中直播间名称匹配', example: '直播间名称' },
          { field: '主播', required: true, description: '需与系统中主播姓名匹配', example: '主播姓名' },
          { field: '期末/箱', required: false, description: '剩余箱数', example: '0' },
          { field: '期末/盒', required: false, description: '剩余盒数', example: '0' },
          { field: '期末/包', required: false, description: '剩余包数', example: '0' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default ConsumptionManagement;
