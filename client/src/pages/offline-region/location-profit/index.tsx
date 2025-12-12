import React, { useState, useRef } from 'react';
import { PageContainer, ProTable, ModalForm, ProFormSelect, ProFormDateRangePicker, ProFormTextArea } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag, Typography, Card, Table, Descriptions, Spin, Alert, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

const { Text, Title } = Typography;

interface LocationProfitItem {
  id: string;
  pointId: string;
  pointCode: string;
  pointName: string;
  startDate: string;
  endDate: string;
  totalSalesAmount: number;
  totalCostAmount: number;
  profitAmount: number;
  profitRate: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
  creatorName?: string;
}

interface PointOption {
  id: string;
  code: string;
  name: string;
}

interface GoodsCostDetail {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  totalPackQuantity: number;
  avgCostPerPack: number;
  totalCost: number;
}

interface ProfitPreview {
  pointId: string;
  pointCode: string;
  pointName: string;
  startDate: string;
  endDate: string;
  orderCount: number;
  totalSalesAmount: number;
  goodsCostDetails: GoodsCostDetail[];
  totalCostAmount: number;
  profitAmount: number;
  profitRate: number;
}

const LocationProfitPage: React.FC = () => {
  const { currentBase } = useBase();
  const actionRef = useRef<ActionType>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pointOptions, setPointOptions] = useState<PointOption[]>([]);
  const [previewData, setPreviewData] = useState<ProfitPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formValues, setFormValues] = useState<{ pointId?: string; dateRange?: string[] }>({});

  // 获取可选点位列表
  const fetchPointOptions = async () => {
    if (!currentBase?.id) return;
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/location-profits/available-points`, {
        method: 'GET',
      });
      if (result.success) {
        setPointOptions(result.data || []);
      }
    } catch (error) {
      console.error('获取点位列表失败:', error);
    }
  };

  // 获取利润列表
  const fetchProfitList = async (params: any) => {
    if (!currentBase?.id) {
      return { data: [], success: true, total: 0 };
    }

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/location-profits`, {
        method: 'GET',
        params: {
          page: params.current,
          pageSize: params.pageSize,
          pointId: params.pointId,
        },
      });

      return {
        data: result.data || [],
        success: result.success,
        total: result.total || 0,
      };
    } catch (error) {
      console.error('获取利润列表失败:', error);
      return { data: [], success: false, total: 0 };
    }
  };

  // 预览利润计算
  const fetchPreview = async (pointId: string, dateRange: string[]) => {
    if (!currentBase?.id || !pointId || !dateRange || dateRange.length !== 2) {
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/location-profits/preview`, {
        method: 'POST',
        data: {
          pointId,
          startDate: dateRange[0],
          endDate: dateRange[1],
        },
      });

      if (result.success) {
        setPreviewData(result.data);
      } else {
        setPreviewData(null);
      }
    } catch (error) {
      console.error('预览失败:', error);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 表单值变化时触发预览
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    setFormValues(allValues);
    if (allValues.pointId && allValues.dateRange && allValues.dateRange.length === 2) {
      fetchPreview(allValues.pointId, allValues.dateRange);
    } else {
      setPreviewData(null);
    }
  };

  // 创建利润记录
  const handleCreate = async (values: any) => {
    if (!currentBase?.id) {
      message.error('请先选择基地');
      return false;
    }

    try {
      const [startDate, endDate] = values.dateRange || [];
      const result = await request(`/api/v1/bases/${currentBase.id}/location-profits`, {
        method: 'POST',
        data: {
          pointId: values.pointId,
          startDate: startDate,
          endDate: endDate,
          notes: values.notes,
        },
      });

      if (result.success) {
        message.success('利润记录已保存');
        setCreateModalVisible(false);
        setPreviewData(null);
        setFormValues({});
        actionRef.current?.reload();
        return true;
      } else {
        message.error(result.message || '保存失败');
        return false;
      }
    } catch (error: any) {
      message.error(error.message || '计算失败');
      return false;
    }
  };

  // 删除记录
  const handleDelete = async (id: string) => {
    if (!currentBase?.id) return;

    try {
      const result = await request(`/api/v1/bases/${currentBase.id}/location-profits/${id}`, {
        method: 'DELETE',
      });

      if (result.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 格式化金额
  const formatAmount = (value: number) => {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 表格列定义
  const columns: ProColumns<LocationProfitItem>[] = [
    {
      title: '店铺名称',
      dataIndex: 'pointName',
      key: 'pointName',
      width: 200,
      render: (_, record) => (
        <span>{record.pointCode}-{record.pointName}</span>
      ),
    },
    {
      title: '日期段',
      dataIndex: 'dateRange',
      key: 'dateRange',
      width: 180,
      search: false,
      render: (_, record) => (
        <span>{record.startDate} ~ {record.endDate}</span>
      ),
    },
    {
      title: '拿货金额',
      dataIndex: 'totalSalesAmount',
      key: 'totalSalesAmount',
      width: 120,
      search: false,
      align: 'right',
      render: (_, record) => (
        <Text strong>{formatAmount(record.totalSalesAmount)}</Text>
      ),
    },
    {
      title: '采购成本',
      dataIndex: 'totalCostAmount',
      key: 'totalCostAmount',
      width: 120,
      search: false,
      align: 'right',
      render: (_, record) => (
        <Text type="secondary">{formatAmount(record.totalCostAmount)}</Text>
      ),
    },
    {
      title: '利润金额',
      dataIndex: 'profitAmount',
      key: 'profitAmount',
      width: 120,
      search: false,
      align: 'right',
      render: (_, record) => (
        <Text type={record.profitAmount >= 0 ? 'success' : 'danger'} strong>
          {formatAmount(record.profitAmount)}
        </Text>
      ),
    },
    {
      title: '利润率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      width: 100,
      search: false,
      align: 'center',
      render: (_, record) => {
        const rate = record.profitRate;
        let color = 'default';
        if (rate >= 30) color = 'green';
        else if (rate >= 15) color = 'blue';
        else if (rate >= 0) color = 'orange';
        else color = 'red';
        
        return <Tag color={color}>{rate.toFixed(2)}%</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 150,
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      search: false,
      render: (_, record) => new Date(record.createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      search: false,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!currentBase) {
    return (
      <PageContainer header={{ title: false }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Text type="secondary">请先选择一个基地</Text>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer header={{ title: false }}>
      <ProTable<LocationProfitItem>
        actionRef={actionRef}
        columns={columns}
        request={fetchProfitList}
        rowKey="id"
        search={false}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              fetchPointOptions();
              setCreateModalVisible(true);
            }}
          >
            计算利润
          </Button>,
        ]}
      />

      {/* 创建利润记录弹窗 */}
      <ModalForm
        title="计算点位利润"
        open={createModalVisible}
        onOpenChange={(visible) => {
          setCreateModalVisible(visible);
          if (!visible) {
            setPreviewData(null);
            setFormValues({});
          }
        }}
        onFinish={handleCreate}
        onValuesChange={handleFormValuesChange}
        width={700}
        modalProps={{
          destroyOnClose: true,
        }}
        submitter={{
          searchConfig: {
            submitText: previewData ? '保存记录' : '计算利润',
          },
        }}
      >
        <ProFormSelect
          name="pointId"
          label="选择店铺"
          placeholder="请选择店铺"
          rules={[{ required: true, message: '请选择店铺' }]}
          options={pointOptions.map((p) => ({
            label: `${p.code}-${p.name}`,
            value: p.id,
          }))}
          showSearch
          fieldProps={{
            filterOption: (input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase()),
          }}
        />

        <ProFormDateRangePicker
          name="dateRange"
          label="日期段"
          placeholder={['开始日期', '结束日期']}
          rules={[{ required: true, message: '请选择日期范围' }]}
          fieldProps={{
            style: { width: '100%' },
          }}
        />

        {/* 利润预览区域 */}
        {previewLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="正在计算..." />
          </div>
        )}

        {previewData && !previewLoading && (
          <Card 
            size="small" 
            title={<><CalculatorOutlined /> 利润计算预览</>}
            style={{ marginBottom: 16 }}
          >
            {previewData.orderCount === 0 ? (
              <Alert
                type="warning"
                message="该日期范围内没有已完成的订单"
                description="利润计算基于已完成（COMPLETED）、已送达（DELIVERED）或配送中（SHIPPING）状态的订单。"
              />
            ) : (
              <>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="订单数量">
                    <Text strong>{previewData.orderCount} 单</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="拿货金额">
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatAmount(previewData.totalSalesAmount)}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '12px 0' }}>商品成本明细</Divider>

                {previewData.goodsCostDetails.length > 0 ? (
                  <Table
                    size="small"
                    dataSource={previewData.goodsCostDetails}
                    rowKey="goodsId"
                    pagination={false}
                    columns={[
                      {
                        title: '商品',
                        dataIndex: 'goodsName',
                        key: 'goodsName',
                        render: (_, record) => `${record.goodsCode}-${record.goodsName}`,
                      },
                      {
                        title: '数量(盒)',
                        dataIndex: 'totalPackQuantity',
                        key: 'totalPackQuantity',
                        align: 'right',
                      },
                      {
                        title: '平均成本/盒',
                        dataIndex: 'avgCostPerPack',
                        key: 'avgCostPerPack',
                        align: 'right',
                        render: (v) => formatAmount(v),
                      },
                      {
                        title: '成本小计',
                        dataIndex: 'totalCost',
                        key: 'totalCost',
                        align: 'right',
                        render: (v) => formatAmount(v),
                      },
                    ]}
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <Text strong>采购成本合计</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text strong>{formatAmount(previewData.totalCostAmount)}</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                ) : (
                  <Alert type="info" message="没有商品成本记录（可能没有采购记录）" />
                )}

                <Divider style={{ margin: '12px 0' }}>利润计算结果</Divider>

                <Descriptions column={1} size="small">
                  <Descriptions.Item label="拿货金额">
                    {formatAmount(previewData.totalSalesAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="采购成本">
                    - {formatAmount(previewData.totalCostAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="利润金额">
                    <Text 
                      strong 
                      type={previewData.profitAmount >= 0 ? 'success' : 'danger'}
                      style={{ fontSize: 16 }}
                    >
                      = {formatAmount(previewData.profitAmount)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="利润率">
                    <Tag color={previewData.profitRate >= 0 ? 'green' : 'red'}>
                      {previewData.profitRate.toFixed(2)}%
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </Card>
        )}

        <ProFormTextArea
          name="notes"
          label="备注"
          placeholder="可选，添加备注信息"
          fieldProps={{
            rows: 2,
            maxLength: 500,
            showCount: true,
          }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LocationProfitPage;
