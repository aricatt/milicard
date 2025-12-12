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
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
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

  // 计算字段
  const [calculatedValues, setCalculatedValues] = useState({
    salesAmount: 0,
    platformFeeAmount: 0,
    profitAmount: 0,
    profitRate: 0,
  });

  // 消耗金额（从选择的消耗记录获取）
  const [consumptionAmount, setConsumptionAmount] = useState(0);

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
        setStats(result.data);
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
   */
  const loadUnlinkedConsumptions = useCallback(async (handlerId: string) => {
    if (!currentBase || !handlerId) {
      setConsumptionOptions([]);
      setConsumptionAmount(0);
      return;
    }

    setConsumptionOptionsLoading(true);
    try {
      const result = await request(
        `/api/v1/bases/${currentBase.id}/anchor-profits/unlinked-consumptions`,
        {
          method: 'GET',
          params: { handlerId },
        }
      );

      if (result.success) {
        setConsumptionOptions(result.data || []);
      }
    } catch (error) {
      console.error('获取消耗记录失败:', error);
      setConsumptionOptions([]);
    } finally {
      setConsumptionOptionsLoading(false);
    }
  }, [currentBase]);

  /**
   * 选择消耗记录后更新消耗金额
   */
  const handleConsumptionChange = useCallback((consumptionId: string) => {
    const selected = consumptionOptions.find(c => c.id === consumptionId);
    if (selected) {
      setConsumptionAmount(selected.consumptionAmount);
      // 自动设置日期为消耗记录的日期
      form.setFieldValue('profitDate', dayjs(selected.consumptionDate));
    } else {
      setConsumptionAmount(0);
    }
  }, [consumptionOptions, form]);

  /**
   * 计算利润相关字段
   */
  const calculateProfit = useCallback(() => {
    const gmv = form.getFieldValue('gmvAmount') || 0;
    const refund = form.getFieldValue('refundAmount') || 0;
    const water = form.getFieldValue('waterAmount') || 0;
    const adSpend = form.getFieldValue('adSpendAmount') || 0;
    const platformFeeRate = form.getFieldValue('platformFeeRate') || 17; // 默认17%

    // 当日销售额 = 走平台GMV + 走水金额 - 退款金额
    const salesAmount = gmv + water - refund;
    // 平台扣点 = (走平台GMV - 退款金额) * 扣点比例
    const platformFeeAmount = (gmv - refund) * (platformFeeRate / 100);
    // 利润 = 销售 - 消耗 - 投流 - 平台扣点
    const profitAmount = salesAmount - consumptionAmount - adSpend - platformFeeAmount;
    // 毛利率 = 利润 / 销售 * 100
    const profitRate = salesAmount > 0 ? (profitAmount / salesAmount) * 100 : 0;

    setCalculatedValues({
      salesAmount,
      platformFeeAmount,
      profitAmount,
      profitRate,
    });
  }, [form, consumptionAmount]);

  /**
   * 主播选择变化时加载消耗记录
   */
  const handleHandlerChange = (handlerId: string) => {
    // 清空之前选择的消耗记录
    form.setFieldValue('consumptionId', undefined);
    setConsumptionAmount(0);
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

  /**
   * 初始化加载
   */
  useEffect(() => {
    if (currentBase) {
      loadStats();
      loadPersonnelOptions();
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
        waterAmount: values.waterAmount || 0,
        consumptionAmount: consumptionAmount,
        adSpendAmount: values.adSpendAmount || 0,
        platformFeeAmount: calculatedValues.platformFeeAmount,
        salesAmount: calculatedValues.salesAmount,
        profitAmount: calculatedValues.profitAmount,
        profitRate: calculatedValues.profitRate,
        notes: values.notes,
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
  const handleEdit = (record: AnchorProfitRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      profitDate: dayjs(record.profitDate),
      handlerId: record.handlerId,
      gmvAmount: record.gmvAmount,
      refundAmount: record.refundAmount,
      waterAmount: record.waterAmount,
      adSpendAmount: record.adSpendAmount,
      platformFeeRate: record.salesAmount > 0 
        ? (record.platformFeeAmount / record.salesAmount) * 100 
        : 17,
      notes: record.notes,
    });
    setConsumptionAmount(record.consumptionAmount);
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
        waterAmount: values.waterAmount || 0,
        consumptionAmount: consumptionAmount,
        adSpendAmount: values.adSpendAmount || 0,
        platformFeeAmount: calculatedValues.platformFeeAmount,
        salesAmount: calculatedValues.salesAmount,
        profitAmount: calculatedValues.profitAmount,
        profitRate: calculatedValues.profitRate,
        notes: values.notes,
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

  // 列定义
  const columns = getColumns(handleEdit, handleDelete);

  // 无基地时显示提示
  if (!currentBase) {
    return (
      <PageContainer>
        <Alert message="请先选择基地" type="warning" showIcon />
      </PageContainer>
    );
  }

  // 表单内容（创建和编辑共用）
  const formContent = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="日期"
            name="profitDate"
            rules={[{ required: true, message: '请选择日期' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="主播"
            name="handlerId"
            rules={[{ required: true, message: '请选择主播' }]}
          >
            <Select
              placeholder="请选择主播"
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
            label="直播消耗"
            name="consumptionId"
            rules={[{ required: true, message: '请选择消耗记录' }]}
            extra="选择该主播的一条消耗记录关联利润"
          >
            <Select
              placeholder="请先选择主播，然后选择消耗记录"
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
                  ? '加载中...' 
                  : '暂无可关联的消耗记录'
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left" style={{ margin: '8px 0 16px' }}>收入</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="GMV金额"
            name="gmvAmount"
            rules={[{ required: true, message: '请输入GMV金额' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="退款金额"
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
            label="走水金额"
            name="waterAmount"
            initialValue={0}
            extra="补单等额外收入"
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

      <Divider orientation="left" style={{ margin: '8px 0 16px' }}>成本</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="消耗金额" extra="根据选择的消耗记录自动获取">
            <InputNumber
              value={consumptionAmount}
              disabled
              style={{ width: '100%' }}
              precision={2}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="投流金额"
            name="adSpendAmount"
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
            label="平台扣点比例"
            name="platformFeeRate"
            initialValue={17}
            extra="默认17%"
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

      <Divider orientation="left" style={{ margin: '8px 0 16px' }}>计算结果</Divider>
      <Alert
        message="计算公式"
        description={
          <div style={{ fontSize: 12 }}>
            <div>当日销售额 = GMV + 走水 - 退款</div>
            <div>平台扣点 = (GMV - 退款) × 扣点比例</div>
            <div>利润 = 销售额 - 消耗 - 投流 - 平台扣点</div>
            <div>毛利率 = 利润 / 销售额 × 100%</div>
          </div>
        }
        type="info"
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="当日销售额"
            value={calculatedValues.salesAmount}
            precision={2}
            valueStyle={{ color: '#722ed1' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="平台扣点"
            value={calculatedValues.platformFeeAmount}
            precision={2}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="利润金额"
            value={calculatedValues.profitAmount}
            precision={2}
            valueStyle={{ color: calculatedValues.profitAmount >= 0 ? '#52c41a' : '#ff4d4f' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="毛利率"
            value={calculatedValues.profitRate}
            precision={2}
            suffix="%"
            valueStyle={{ 
              color: calculatedValues.profitRate >= 50 ? '#52c41a' : 
                     calculatedValues.profitRate >= 30 ? '#faad14' : '#ff4d4f' 
            }}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />
      <Form.Item label="备注" name="notes">
        <TextArea rows={2} placeholder="请输入备注信息" />
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
    <PageContainer
      header={{
        title: '主播利润',
      }}
    >
      {/* 数据表格 */}
      <ProTable<AnchorProfitRecord>
        columns={columns}
        actionRef={actionRef}
        request={fetchProfitRecords}
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
            <span>主播利润列表</span>
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
            key="template"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入
          </Button>,
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            导出
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setConsumptionAmount(0);
              setConsumptionOptions([]); // 清空消耗记录选项
              setCalculatedValues({ salesAmount: 0, platformFeeAmount: 0, profitAmount: 0, profitRate: 0 });
              setCreateModalVisible(true);
            }}
          >
            新增利润记录
          </Button>,
        ]}
        scroll={{ x: 1600 }}
      />

      {/* 创建模态框 */}
      <Modal
        title="新增利润记录"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
          setConsumptionAmount(0);
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
        title="编辑利润记录"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingRecord(null);
          form.resetFields();
          setConsumptionAmount(0);
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
          { field: '主播', required: true, description: '需与系统中主播姓名一致', example: '主播姓名' },
          { field: 'GMV金额', required: true, description: '当日GMV金额', example: '10000' },
          { field: '退款金额', required: false, description: '退款金额', example: '500' },
          { field: '走水金额', required: false, description: '补单等额外收入', example: '200' },
          { field: '消耗金额', required: false, description: '当日消耗金额', example: '2000' },
          { field: '投流金额', required: false, description: '广告投放金额', example: '500' },
          { field: '平台扣点比例%', required: false, description: '平台扣点比例，默认17', example: '17' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default AnchorProfitPage;
