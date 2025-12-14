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
import { request, useIntl } from '@umijs/max';
import { useBase } from '@/contexts/BaseContext';
import GoodsNameText from '@/components/GoodsNameText';

// 多语言名称类型
interface NameI18n {
  en?: string;
  th?: string;
  vi?: string;
  [key: string]: string | undefined;
}

// 实时库存数据类型
interface RealTimeStock {
  goodsId: string;
  goodsCode: string;
  goodsName: string;
  goodsNameI18n?: NameI18n | null;
  categoryCode?: string;
  categoryName?: string;
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
  const intl = useIntl();
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
      console.error('Failed to fetch warehouses', error);
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
      console.error('Failed to fetch stats', error);
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
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: 'goodsCode',
      width: 120,
      copyable: true,
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.category' }),
      dataIndex: 'categoryName',
      width: 80,
      search: false,
      render: (_, record) => {
        if (!record.categoryName) return '-';
        return <Tag color="geekblue">{record.categoryName}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: 'goodsName',
      width: 200,
      render: (_, record) => (
        <GoodsNameText 
          text={record.goodsName} 
          nameI18n={record.goodsNameI18n}
        />
      ),
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.boxQty' }),
      dataIndex: 'stockBox',
      width: 60,
      search: false,
      align: 'right',
      render: (_, record) => (
        <span style={{ color: record.stockBox < 5 ? '#ff4d4f' : undefined }}>
          {record.stockBox}
        </span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.packQty' }),
      dataIndex: 'stockPack',
      width: 60,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.pieceQty' }),
      dataIndex: 'stockPiece',
      width: 60,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPriceBox' }),
      dataIndex: 'avgPricePerBox',
      width: 60,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPricePack' }),
      dataIndex: 'avgPricePerPack',
      width: 60,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPricePiece' }),
      dataIndex: 'avgPricePerPiece',
      width: 60,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.totalValue' }),
      dataIndex: 'totalValue',
      width: 120,
      search: false,
      align: 'right',
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      key: 'status',
      width: 80,
      search: false,
      render: (_, record) => {
        if (record.stockBox < 5) {
          return <Tag color="red">{intl.formatMessage({ id: 'inventory.status.lowStock' })}</Tag>;
        }
        return <Tag color="green">{intl.formatMessage({ id: 'inventory.status.normal' })}</Tag>;
      },
    },
  ];

  // 统计详情弹出内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.totalGoods' })}>{stats.totalGoods}</Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.totalValue' })}>¥{stats.totalValue.toLocaleString()}</Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.lowStock' })}>{stats.lowStockCount}</Descriptions.Item>
    </Descriptions>
  );

  if (!initialized) {
    return <PageContainer loading />;
  }

  if (!currentBase) {
    return (
      <PageContainer>
        <Card>{intl.formatMessage({ id: 'message.selectBaseFirst' })}</Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer header={{ title: false }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.totalGoods' })}
              value={stats.totalGoods}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.totalValue' })}
              value={stats.totalValue}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.lowStock' })}
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
            <span>{intl.formatMessage({ id: 'list.title.realTimeStock' })}</span>
            <Popover content={statsContent} title={intl.formatMessage({ id: 'realTimeStock.stats.title' })}>
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
              placeholder={intl.formatMessage({ id: 'realTimeStock.filter.allWarehouses' })}
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
                  {w.name} {w.type === 'MAIN_WAREHOUSE' ? `(${intl.formatMessage({ id: 'locations.type.mainWarehouse' })})` : ''}
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
            message.error(intl.formatMessage({ id: 'realTimeStock.message.fetchFailed' }));
            return { data: [], success: false, total: 0 };
          }
        }}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
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
