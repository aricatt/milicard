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
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import { getColumns } from './columns';
import { useTransferExcel } from './useTransferExcel';
import ImportModal from '@/components/ImportModal';
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
  const columns = getColumns(handleDelete);

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
    <PageContainer>
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
        pagination={{
          defaultPageSize: 20,
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
          <Popover
            key="stats"
            content={statsContent}
            title="调货统计"
            trigger="hover"
            placement="bottomRight"
          >
            <Button icon={<InfoCircleOutlined />}>
              统计信息
            </Button>
          </Popover>,
          <Button
            key="import"
            icon={<ImportOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入Excel
          </Button>,
          <Button
            key="export"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            导出Excel
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
            新增调货
          </Button>,
        ]}
        headerTitle={
          <Space>
            <span>调货列表</span>
            <span style={{ fontSize: 12, color: '#999' }}>
              共 {stats.totalRecords} 条记录
            </span>
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
                label="调货日期"
                name="transferDate"
                rules={[{ required: true, message: '请选择调货日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="商品"
                name="goodsId"
                rules={[{ required: true, message: '请选择商品' }]}
              >
                <Select
                  placeholder="请选择商品"
                  showSearch
                  optionFilterProp="label"
                  loading={optionsLoading}
                  options={goodsOptions.map(g => ({ value: g.id, label: g.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>调出方</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="调出直播间"
                name="sourceLocationId"
                rules={[{ required: true, message: '请选择调出直播间' }]}
              >
                <Select
                  placeholder="请选择直播间/仓库"
                  loading={optionsLoading}
                  options={locationOptions.map(l => ({ value: l.id, label: l.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="调出主播"
                name="sourceHandlerId"
                rules={[{ required: true, message: '请选择调出主播' }]}
              >
                <Select
                  placeholder="请选择主播"
                  loading={optionsLoading}
                  options={personnelOptions.map(p => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>调入方</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="调入直播间"
                name="destinationLocationId"
                rules={[{ required: true, message: '请选择调入直播间' }]}
              >
                <Select
                  placeholder="请选择直播间/仓库"
                  loading={optionsLoading}
                  options={locationOptions.map(l => ({ value: l.id, label: l.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="调入主播"
                name="destinationHandlerId"
                rules={[{ required: true, message: '请选择调入主播' }]}
              >
                <Select
                  placeholder="请选择主播"
                  loading={optionsLoading}
                  options={personnelOptions.map(p => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '8px 0 16px' }}>调货数量</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="调货箱"
                name="boxQuantity"
                rules={[{ required: true, message: '请输入' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="调货盒"
                name="packQuantity"
                rules={[{ required: true, message: '请输入' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="调货包"
                name="pieceQuantity"
                rules={[{ required: true, message: '请输入' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="备注"
            name="notes"
          >
            <TextArea rows={2} placeholder="请输入备注（选填）" maxLength={500} showCount />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>
                创建
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
        tips={[
          '调货日期格式：YYYY-MM-DD（如：2025-11-24）',
          '商品名称必须与系统中已有的商品名称完全匹配',
          '调出/调入直播间名称必须与系统中已有的位置名称匹配',
          '调出/调入主播名称必须与系统中已有的人员名称匹配',
          '数量字段为空时默认为0',
        ]}
      />
    </PageContainer>
  );
};

export default TransferManagement;
