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
} from 'antd';
import { 
  PlusOutlined, 
  ExportOutlined, 
  InfoCircleOutlined,
} from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { useBase } from '@/contexts/BaseContext';
import { request } from '@umijs/max';
import dayjs from 'dayjs';
import { getColumns } from './columns';
import type { ArrivalRecord, ArrivalStats, ArrivalFormValues } from './types';

/**
 * 到货管理页面
 * 记录采购商品的到货情况，支持一张采购单分批多次到货
 */
const ArrivalManagement: React.FC = () => {
  const { currentBase } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  
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
        const orderMap = new Map();
        result.data.forEach((item: any) => {
          if (!orderMap.has(item.orderNo)) {
            // 格式化采购日期为 YYYY-MM-DD
            const dateStr = item.purchaseDate 
              ? item.purchaseDate.split('T')[0] 
              : '';
            orderMap.set(item.orderNo, {
              id: item.id,                    // 采购订单ID
              orderNo: item.orderNo,
              goodsId: item.goodsId,          // 商品ID
              purchaseDate: dateStr,
              goodsName: item.goodsName,
              supplierName: item.supplierName,
              // 生成采购名称：采购日期 + 商品名称
              purchaseName: `${dateStr}${item.goodsName || ''}`,
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
        actionRef.current?.reload();
        loadStats();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建到货记录失败:', error);
      message.error('创建到货记录失败');
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
   * 导出数据
   */
  const handleExport = () => {
    message.info('导出功能开发中...');
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
  const columns = getColumns(handleDelete);

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
            onClick={() => setCreateModalVisible(true)}
          >
            添加到货记录
          </Button>,
        ]}
        dateFormatter="string"
        headerTitle={
          <Space>
            <span>到货记录列表</span>
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
      />

      {/* 创建到货记录模态框 */}
      <Modal
        title="添加到货记录"
        open={createModalVisible}
        onOk={() => createForm.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        confirmLoading={createLoading}
        width={600}
      >
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
          <Form.Item
            label="日期"
            name="arrivalDate"
            rules={[{ required: true, message: '请选择到货日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </Form.Item>

          <Form.Item
            label="采购"
            name="purchaseOrderNo"
            rules={[{ required: true, message: '请选择采购单' }]}
          >
            <Select
              placeholder="请选择"
              loading={purchaseOrdersLoading}
              showSearch
              optionFilterProp="label"
              options={purchaseOrders.map((order) => ({
                value: order.orderNo,
                label: order.purchaseName || `${order.purchaseDate}${order.goodsName}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="仓库"
            name="locationId"
            rules={[{ required: true, message: '请选择仓库' }]}
          >
            <Select
              placeholder="请选择"
              loading={locationsLoading}
              showSearch
              optionFilterProp="label"
              options={locations.map((loc) => ({
                value: loc.id,
                label: loc.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="主播"
            name="handlerId"
            rules={[{ required: true, message: '请选择主播' }]}
          >
            <Select
              placeholder="请选择"
              loading={handlersLoading}
              showSearch
              optionFilterProp="label"
              allowClear
              options={handlers.map((h) => ({
                value: h.id,
                label: `${h.role === 'ANCHOR' ? '🎤 ' : '👷 '}${h.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="到货箱"
            name="boxQuantity"
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入" />
          </Form.Item>

          <Form.Item
            label="到货盒"
            name="packQuantity"
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入" />
          </Form.Item>

          <Form.Item
            label="到货包"
            name="pieceQuantity"
            rules={[{ required: true, message: '请输入' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ArrivalManagement;
