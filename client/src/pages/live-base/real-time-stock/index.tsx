import React, { useRef, useState, useEffect } from 'react';
import {
  Space,
  Tag,
  App,
  Card,
  Statistic,
  Row,
  Col,
  Select,
  Popover,
  Descriptions,
} from 'antd';
import {
  DatabaseOutlined,
  DollarOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { ProTable, PageContainer } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';

// 实时库存数据类型
interface RealTimeStock {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  packPerBox: number;
  piecePerPack: number;
  stockBox: number;
  stockPack: number;
  stockPiece: number;
  avgPricePerBox: number;
  avgPricePerPack: number;
  avgPricePerPiece: number;
  totalValue: number;
}

// 统计数据类型
interface StockStats {
  totalGoods: number;
  totalValue: number;
  lowStockCount: number;
}

// 仓库类型
interface Warehouse {
  id: number;
  name: string;
  type: string;
}

/**
 * 直播基地实时库存页面
 */
const RealTimeStockPage: React.FC = () => {
  const { currentBase, initialized } = useBase();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 状态管理
  const [stats, setStats] = useState<StockStats>({
    totalGoods: 0,
    totalValue: 0,
    lowStockCount: 0,
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>(undefined);

  // 获取仓库列表
  const fetchWarehouses = async () => {
    if (!currentBase?.id) return;
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/warehouses`);
      if (response.success) {
        setWarehouses(response.data || []);
      }
    } catch (error) {
      console.error('获取仓库列表失败', error);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    if (!currentBase?.id) return;
    try {
      const response = await request(`/api/v1/bases/${currentBase.id}/real-time-stock/stats`);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('获取统计数据失败', error);
    }
  };

  useEffect(() => {
    if (currentBase?.id) {
      fetchWarehouses();
      fetchStats();
    }
  }, [currentBase?.id]);

  // 表格列定义
  const columns: ProColumns<RealTimeStock>[] = [
    {
      title: '商品编号',
      dataIndex: 'goodsCode',
      width: 120,
      copyable: true,
    },
    {
      title: '商品名称',
      dataIndex: 'goodsName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '库存/箱',
      dataIndex: 'stockBox',
      width: 100,
      search: false,
      align: 'right',
      render: (_, record) => (
        <span style={{ color: record.stockBox < 5 ? '#ff4d4f' : undefined }}>
          {record.stockBox}
        </span>
      ),
    },
    {
      title: '库存/盒',
      dataIndex: 'stockPack',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '库存/包',
      dataIndex: 'stockPiece',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '均价/箱',
      dataIndex: 'avgPricePerBox',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '均价/盒',
      dataIndex: 'avgPricePerPack',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '均价/包',
      dataIndex: 'avgPricePerPiece',
      width: 100,
      search: false,
      align: 'right',
    },
    {
      title: '总价值',
      dataIndex: 'totalValue',
      width: 120,
      search: false,
      align: 'right',
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      search: false,
      render: (_, record) => {
        if (record.stockBox < 5) {
          return <Tag color="red">低库存</Tag>;
        }
        return <Tag color="green">正常</Tag>;
      },
    },
  ];

  // 统计详情弹出内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label="商品种类">{stats.totalGoods} 种</Descriptions.Item>
      <Descriptions.Item label="库存总价值">¥{stats.totalValue.toLocaleString()}</Descriptions.Item>
      <Descriptions.Item label="低库存商品">{stats.lowStockCount} 种</Descriptions.Item>
    </Descriptions>
  );

  if (!initialized) {
    return <PageContainer loading />;
  }

  if (!currentBase) {
    return (
      <PageContainer>
        <Card>请先选择一个基地</Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="商品种类"
              value={stats.totalGoods}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats.totalValue}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="低库存商品"
              value={stats.lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.lowStockCount > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* 库存列表 */}
      <ProTable<RealTimeStock>
        headerTitle={
          <Space>
            <span>实时库存列表</span>
            <Popover content={statsContent} title="库存统计">
              <InfoCircleOutlined style={{ cursor: 'pointer' }} />
            </Popover>
          </Space>
        }
        actionRef={actionRef}
        rowKey="goodsId"
        search={{
          labelWidth: 'auto',
        }}
        toolbar={{
          actions: [
            <Select
              key="warehouse"
              placeholder="全部仓库"
              allowClear
              style={{ width: 150 }}
              value={selectedWarehouse}
              onChange={(value) => {
                setSelectedWarehouse(value);
                actionRef.current?.reload();
              }}
            >
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>
                  {w.name} {w.type === 'MAIN_WAREHOUSE' ? '(总仓)' : ''}
                </Select.Option>
              ))}
            </Select>,
          ],
        }}
        request={async (params) => {
          if (!currentBase?.id) {
            return { data: [], success: true, total: 0 };
          }

          try {
            const response = await request(`/api/v1/bases/${currentBase.id}/real-time-stock`, {
              params: {
                current: params.current,
                pageSize: params.pageSize,
                goodsCode: params.goodsCode,
                goodsName: params.goodsName,
                locationId: selectedWarehouse,
              },
            });

            if (response.success) {
              return {
                data: response.data,
                success: true,
                total: response.total,
              };
            }
            return { data: [], success: false, total: 0 };
          } catch (error) {
            message.error('获取库存数据失败');
            return { data: [], success: false, total: 0 };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
        options={{
          density: true,
          fullScreen: true,
          reload: true,
          setting: true,
        }}
        scroll={{ x: 1200 }}
      />
    </PageContainer>
  );
};

export default RealTimeStockPage;
