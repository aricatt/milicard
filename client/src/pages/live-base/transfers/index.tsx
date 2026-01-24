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
  Input,
  Row,
  Col,
  Divider,
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
import { useTransferExcel } from './useTransferExcel';
import ImportModal from '@/components/ImportModal';
import { getCategoryDisplayName, getLocalizedGoodsName } from '@/components/GoodsNameText';
import type { 
  TransferRecord, 
  TransferStats, 
  TransferFormValues,
  LocationOption,
  PersonnelOption,
  GoodsOption,
} from './types';

const { TextArea } = Input;

/**
 * 调货管理页面
 * 记录货物在不同仓库/直播间之间的转移情况
 */
const TransferManagement: React.FC = () => {
  const { currentBase } = useBase();
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
  } = useTransferExcel({
    baseId: currentBase?.id || 0,
    baseName: currentBase?.name || '',
    onImportSuccess: () => {
      actionRef.current?.reload();
      loadStats();
    },
  });

  // 状态管理
  const [stats, setStats] = useState<TransferStats>({
    totalRecords: 0,
    totalGoods: 0,
    totalBoxQuantity: 0,
    totalPackQuantity: 0,
    totalPieceQuantity: 0,
    todayRecords: 0,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // 下拉选项
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [goodsOptions, setGoodsOptions] = useState<GoodsOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  
  // 批量选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  /**
   * 加载统计数据
   */
  const loadStats = async () => {
    if (!currentBase) return;
    
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/transfers/stats`, {
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
      console.error('获取调货统计失败:', error);
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
   * 删除调货记录
   */
  const handleDelete = async (record: TransferRecord) => {
    if (!currentBase) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/transfers/${record.id}`, {
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
      console.error('删除调货记录失败:', error);
      message.error('删除失败');
    }
  };

  /**
   * 批量删除调货记录
   */
  const handleBatchDelete = async () => {
    if (!currentBase || selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条调货记录吗？此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          let failCount = 0;

          for (const id of selectedRowKeys) {
            try {
              const result = await request(`/api/v1/bases/${currentBase.id}/transfers/${id}`, {
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
          console.error('批量删除调货记录失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  /**
   * 创建调货记录
   */
  const handleCreate = async (values: TransferFormValues) => {
    if (!currentBase) {
      message.warning('请先选择基地');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/transfers`, {
        method: 'POST',
        data: {
          transferDate: values.transferDate.format('YYYY-MM-DD'),
          goodsId: values.goodsId,
          sourceLocationId: values.sourceLocationId,
          sourceHandlerId: values.sourceHandlerId,
          destinationLocationId: values.destinationLocationId,
          destinationHandlerId: values.destinationHandlerId,
          boxQuantity: values.boxQuantity || 0,
          packQuantity: values.packQuantity || 0,
          pieceQuantity: values.pieceQuantity || 0,
          notes: values.notes,
        },
      });

      if (result.success) {
        message.success('创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error: any) {
      console.error('创建调货记录失败:', error);
      const errorMsg = error?.response?.data?.message || error.message || '创建失败';
      message.error(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (currentBase) {
      loadStats();
      loadOptions();
    }
  }, [currentBase]);

  // 获取列定义
  const columns = getColumns(handleDelete, intl);

  // 统计信息内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="总调货记录">{stats.totalRecords} 条</Descriptions.Item>
      <Descriptions.Item label="涉及商品数">{stats.totalGoods} 种</Descriptions.Item>
      <Descriptions.Item label="总调货箱数">{stats.totalBoxQuantity} 箱</Descriptions.Item>
      <Descriptions.Item label="总调货盒数">{stats.totalPackQuantity} 盒</Descriptions.Item>
      <Descriptions.Item label="总调货包数">{stats.totalPieceQuantity} 包</Descriptions.Item>
      <Descriptions.Item label="今日调货">{stats.todayRecords} 条</Descriptions.Item>
    </Descriptions>
  );

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
      <ProTable<TransferRecord>
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          try {
            const result = await request(`/api/v1/bases/${currentBase.id}/transfers`, {
              method: 'GET',
              params: {
                current: params.current,
                pageSize: params.pageSize,
                goodsName: params.goodsName,
              },
            });

            if (result.success) {
              return {
                data: result.data || [],
                success: true,
                total: result.total || 0,
              };
            }
            return {
              data: [],
              success: false,
              total: 0,
            };
          } catch (error) {
            console.error('加载调货记录失败:', error);
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
            onClick={() => {
              form.setFieldsValue({
                transferDate: dayjs(),
                boxQuantity: 0,
                packQuantity: 0,
                pieceQuantity: 0,
              });
              setCreateModalVisible(true);
            }}
          >
            {intl.formatMessage({ id: 'transfers.add' })}
          </Button>,
        ]}
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.transfers' })}</span>
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

      {/* 新增调货模态框 */}
      <Modal
        title="新增调货记录"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            transferDate: dayjs(),
            boxQuantity: 0,
            packQuantity: 0,
            pieceQuantity: 0,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.transferDate' })}
                name="transferDate"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.transferDateRequired' }) }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.goods' })}
                name="goodsId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.goodsRequired' }) }]}
              >
                <Select
                  key={intl.locale}
                  placeholder={intl.formatMessage({ id: 'transfers.form.goodsPlaceholder' })}
                  showSearch
                  optionFilterProp="label"
                  loading={optionsLoading}
                  options={goodsOptions.map(g => {
                    const categoryDisplay = getCategoryDisplayName(g.categoryCode, g.categoryName, g.categoryNameI18n, intl.locale);
                    const goodsName = getLocalizedGoodsName(g.name, g.nameI18n, intl.locale);
                    const label = categoryDisplay ? `[${categoryDisplay}]${goodsName}` : goodsName;
                    return { value: g.id, label };
                  })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'transfers.form.sourceSection' })}</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.sourceLocation' })}
                name="sourceLocationId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.sourceLocationRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'transfers.form.sourceLocationPlaceholder' })}
                  loading={optionsLoading}
                  options={locationOptions.map(l => ({ value: l.id, label: l.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.sourceHandler' })}
                name="sourceHandlerId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.sourceHandlerRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'transfers.form.sourceHandlerPlaceholder' })}
                  loading={optionsLoading}
                  options={personnelOptions.map(p => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'transfers.form.destinationSection' })}</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.destinationLocation' })}
                name="destinationLocationId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.destinationLocationRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'transfers.form.destinationLocationPlaceholder' })}
                  loading={optionsLoading}
                  options={locationOptions.map(l => ({ value: l.id, label: l.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.destinationHandler' })}
                name="destinationHandlerId"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.destinationHandlerRequired' }) }]}
              >
                <Select
                  placeholder={intl.formatMessage({ id: 'transfers.form.destinationHandlerPlaceholder' })}
                  loading={optionsLoading}
                  options={personnelOptions.map(p => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>{intl.formatMessage({ id: 'transfers.form.quantitySection' })}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.boxQuantity' })}
                name="boxQuantity"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.boxQuantityRequired' }) }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.packQuantity' })}
                name="packQuantity"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.packQuantityRequired' }) }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={intl.formatMessage({ id: 'transfers.form.pieceQuantity' })}
                name="pieceQuantity"
                rules={[{ required: true, message: intl.formatMessage({ id: 'transfers.form.pieceQuantityRequired' }) }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={intl.formatMessage({ id: 'transfers.form.notes' })}
            name="notes"
          >
            <TextArea rows={2} placeholder={intl.formatMessage({ id: 'transfers.form.notesPlaceholder' })} maxLength={500} showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>{intl.formatMessage({ id: 'button.cancel' })}</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                {intl.formatMessage({ id: 'button.create' })}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入模态框 */}
      <ImportModal
        title="导入调货记录"
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        onImport={handleImport}
        loading={importLoading}
        progress={importProgress}
        width={700}
        fields={[
          { field: '调货日期', required: true, description: '调货日期，格式YYYY-MM-DD', example: '2025-11-24' },
          { field: '品类', required: true, description: '商品品类，与商品名称组合匹配商品', example: '卡牌' },
          { field: '商品', required: true, description: '与品类组合匹配，需在全局商品库中存在', example: '商品名称示例' },
          { field: '调出直播间', required: true, description: '需与系统中直播间名称匹配', example: 'Live Room 1' },
          { field: '调出主播', required: true, description: '需与系统中主播姓名匹配', example: 'Lin' },
          { field: '调入直播间', required: true, description: '需与系统中直播间名称匹配', example: 'Live Room 2' },
          { field: '调入主播', required: true, description: '需与系统中主播姓名匹配', example: 'Sai' },
          { field: '调货箱', required: false, description: '调货箱数', example: '1' },
          { field: '调货盒', required: false, description: '调货盒数', example: '0' },
          { field: '调货包', required: false, description: '调货包数', example: '0' },
          { field: '备注', required: false, description: '备注信息', example: '' },
        ]}
      />
    </PageContainer>
  );
};

export default TransferManagement;
