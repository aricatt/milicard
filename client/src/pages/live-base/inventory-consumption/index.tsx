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
} from 'antd';
import { 
  PlusOutlined, 
  ExportOutlined, 
  ImportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import { getColumns } from './columns';
import { useConsumptionExcel } from './useConsumptionExcel';
import ImportModal from '@/components/ImportModal';
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
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const [form] = Form.useForm();

  // Excel导入导出Hook
  const {
    importModalVisible,
    setImportModalVisible,
    importLoading,
    importProgress,
    handleExport,
    handleImport,
  } = useConsumptionExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    },
  });

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
        request(`/api/v1/bases/${currentBase.id}/locations`, { method: 'GET' }),
        request(`/api/v1/bases/${currentBase.id}/personnel`, { method: 'GET' }),
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
      const result = await request(`/api/v1/bases/${currentBase.id}/consumptions/${record.id}`, {
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
      console.error('删除消耗记录失败:', error);
      message.error('删除失败');
    }
  };

  /**
   * 获取期初数据
   * 按主播查询，因为直播间的货物归属是人
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

  const columns = getColumns({ onDelete: handleDelete });

  return (
    <PageContainer>
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
                startDate: params.consumptionDate?.[0],
                endDate: params.consumptionDate?.[1],
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
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>消耗记录列表</span>
            <span style={{ color: '#999', fontSize: 14, fontWeight: 'normal' }}>
              (共 {stats.totalRecords} 条)
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
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ consumptionDate: dayjs() });
              setCreateModalVisible(true);
            }}
          >
            添加消耗记录
          </Button>,
        ]}
        scroll={{ x: 1800 }}
      />

      {/* 创建消耗记录模态框 */}
      <Modal
        title="添加消耗记录"
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
                label="消耗日期"
                name="consumptionDate"
                rules={[{ required: true, message: '请选择消耗日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="商品"
                name="goodsId"
                rules={[{ required: true, message: '请选择商品' }]}
              >
                <Select
                  placeholder="请选择商品"
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  options={goodsOptions.map(g => ({ value: g.id, label: g.name }))}
                  onChange={handleFormFieldChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="直播间"
                name="locationId"
                rules={[{ required: true, message: '请选择直播间' }]}
              >
                <Select
                  placeholder="请选择直播间"
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
                label="主播"
                name="handlerId"
                rules={[{ required: true, message: '请选择主播' }]}
                extra="选择主播后计算期初库存（直播间货物归属人）"
              >
                <Select
                  placeholder="请选择主播"
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
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>期初（调入总量）</Divider>
          <Spin spinning={openingStockLoading}>
            {openingStock ? (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="调入/箱">
                    <InputNumber
                      value={openingStock.openingBoxQty}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="调入/盒">
                    <InputNumber
                      value={openingStock.openingPackQty}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="调入/包">
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
                message="请先选择商品和主播，系统将自动获取该主播的调入总量（直播间货物归属人）"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </Spin>

          {/* 期末数据输入 */}
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>期末（剩余数量）</Divider>
          {openingStock && !isClosingStockValid() && (
            <Alert
              message="期末总量不能超过期初总量"
              description={`期初总量: ${getOpeningTotalPieces()} 包，当前期末: ${getClosingTotalPieces()} 包（换算关系: 1箱=${openingStock.packPerBox}盒, 1盒=${openingStock.piecePerPack}包）`}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label="剩余/箱"
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
                label="剩余/盒"
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
                label="剩余/包"
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
          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>消耗（自动计算）</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="消耗/箱">
                <InputNumber
                  value={calculateConsumption().boxQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="消耗/盒">
                <InputNumber
                  value={calculateConsumption().packQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="消耗/包">
                <InputNumber
                  value={calculateConsumption().pieceQty}
                  disabled
                  style={{ width: '100%', backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="notes">
            <TextArea rows={2} placeholder="请输入备注信息" maxLength={500} showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                setOpeningStock(null);
                setClosingStock({ closingBoxQty: 0, closingPackQty: 0, closingPieceQty: 0 });
              }}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createLoading}
                disabled={!openingStock || !isClosingStockValid()}
              >
                创建
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
      />
    </PageContainer>
  );
};

export default ConsumptionManagement;
