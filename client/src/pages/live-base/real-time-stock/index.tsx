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
  Checkbox,
  InputNumber,
  Button,
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
import GoodsNameText, { getCategoryDisplayName } from '@/components/GoodsNameText';

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
  categoryNameI18n?: NameI18n | null;
  packPerBox: number;
  piecePerPack: number;
  stockBox: number;
  stockPack: number;
  stockPiece: number;
  warehouseNames?: string;
  isLowStock?: boolean;
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
  outOfStockCount: number;
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
  const { currentBase, initialized, currencyRate } = useBase();
  const { message } = App.useApp();
  const intl = useIntl();
  const actionRef = useRef<ActionType>(null);

  // 状态管理
  const [stats, setStats] = useState<StockStats>({
    totalGoods: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stockThreshold, setStockThreshold] = useState<number>(0);
  const [stockUnit, setStockUnit] = useState<'box' | 'pack' | 'piece'>('box');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 以人民币显示金额
  const [showInCNY, setShowInCNY] = useState(false);
  
  // 获取当前汇率和货币代码
  const currentExchangeRate = currencyRate?.fixedRate || 1;
  const currentCurrencyCode = currentBase?.currency || 'CNY';

  // 计算相对时间（多少分钟前）
  const getRelativeTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return intl.formatMessage({ id: 'time.justNow' });
    if (diffMinutes < 60) return intl.formatMessage({ id: 'time.minutesAgo' }, { minutes: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return intl.formatMessage({ id: 'time.hoursAgo' }, { hours: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return intl.formatMessage({ id: 'time.daysAgo' }, { days: diffDays });
  };

  // 金额格式化函数，支持以人民币显示
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    if (showInCNY && currentExchangeRate > 0) {
      const cnyAmount = amount / currentExchangeRate;
      return `¥${cnyAmount.toFixed(2)}`;
    }
    return amount.toFixed(2);
  };

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

  // 获取品类列表
  const fetchCategories = async () => {
    try {
      const result = await request('/api/v1/categories/all', { method: 'GET' });
      // 为每个品类添加本地化的显示名称
      const categoriesWithI18n = (result || []).map((cat: any) => ({
        ...cat,
        displayName: getCategoryDisplayName(cat.code, cat.name, cat.nameI18n, intl.locale),
      }));
      setCategories(categoriesWithI18n);
    } catch (error) {
      console.error('Failed to fetch categories', error);
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
    fetchCategories();
  }, [currentBase?.id]);

  // 表格列定义
  const columns: ProColumns<RealTimeStock>[] = [
    {
      title: intl.formatMessage({ id: 'products.column.code' }),
      dataIndex: 'goodsCode',
      width: 120,
      copyable: true,
      order: 1, // 查询栏顺序：第4位（order值越大越靠前，所以用1）
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.category' }),
      dataIndex: 'categoryCode',
      width: 120,
      valueType: 'select',
      order: 3, // 查询栏顺序：第2位（order值越大越靠前，所以用3）
      fieldProps: {
        mode: 'multiple',
        placeholder: intl.formatMessage({ id: 'products.filter.category' }),
        allowClear: true,
        maxTagCount: 2,
        options: categories.map((cat) => ({
          label: cat.displayName || cat.name,
          value: cat.code,
        })),
      },
      render: (_, record) => {
        const displayName = getCategoryDisplayName(record.categoryCode, record.categoryName, record.categoryNameI18n, intl.locale);
        if (!displayName) return '-';
        return <Tag color="geekblue">{displayName}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      dataIndex: 'stockStatus',
      width: 120,
      valueType: 'select',
      hideInTable: true, // 不在表格中显示，只在搜索栏显示
      order: 2, // 查询栏顺序：第3位（order值越大越靠前，所以用2）
      fieldProps: {
        mode: 'multiple',
        placeholder: intl.formatMessage({ id: 'realTimeStock.filter.statusPlaceholder' }),
        allowClear: true,
        maxTagCount: 2,
        options: [
          { label: intl.formatMessage({ id: 'inventory.status.outOfStock' }), value: 'out_of_stock' },
          { label: intl.formatMessage({ id: 'inventory.status.lowStock' }), value: 'low_stock' },
          { label: intl.formatMessage({ id: 'inventory.status.normal' }), value: 'normal' },
        ],
      },
    },
    {
      title: intl.formatMessage({ id: 'products.column.name' }),
      dataIndex: 'goodsName',
      width: 200,
      order: 4, // 查询栏顺序：第1位（order值越大越靠前，所以用4）
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
      title: intl.formatMessage({ id: 'realTimeStock.column.warehouse' }),
      dataIndex: 'warehouseNames',
      width: 150,
      search: false,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPriceBox' }),
      dataIndex: 'avgPricePerBox',
      width: 80,
      search: false,
      align: 'right',
      render: (_, record) => formatAmount(record.avgPricePerBox),
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPricePack' }),
      dataIndex: 'avgPricePerPack',
      width: 80,
      search: false,
      align: 'right',
      render: (_, record) => formatAmount(record.avgPricePerPack),
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.avgPricePiece' }),
      dataIndex: 'avgPricePerPiece',
      width: 80,
      search: false,
      align: 'right',
      render: (_, record) => formatAmount(record.avgPricePerPiece),
    },
    {
      title: intl.formatMessage({ id: 'realTimeStock.column.totalValue' }),
      dataIndex: 'totalValue',
      width: 120,
      search: false,
      align: 'right',
      render: (_, record) => (
        <span style={{ fontWeight: 500 }}>{formatAmount(record.totalValue)}</span>
      ),
    },
    {
      title: intl.formatMessage({ id: 'table.column.status' }),
      key: 'status',
      width: 80,
      search: false,
      render: (_, record) => {
        // 检查是否无库存（箱、盒、包都为0）
        if (record.stockBox === 0 && record.stockPack === 0 && record.stockPiece === 0) {
          return <Tag color="red">{intl.formatMessage({ id: 'inventory.status.outOfStock' })}</Tag>;
        }
        // 使用后端返回的isLowStock标志判断库存不足
        if (record.isLowStock) {
          return <Tag color="warning">{intl.formatMessage({ id: 'inventory.status.lowStock' })}</Tag>;
        }
        return <Tag color="green">{intl.formatMessage({ id: 'inventory.status.normal' })}</Tag>;
      },
    },
  ];

  // 统计详情弹出内容
  const statsContent = (
    <Descriptions column={1} size="small">
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.totalGoods' })}>{stats.totalGoods || 0}</Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.totalValue' })}>¥{(stats.totalValue || 0).toLocaleString()}</Descriptions.Item>
      <Descriptions.Item label={intl.formatMessage({ id: 'realTimeStock.stats.lowStock' })}>{stats.lowStockCount || 0}</Descriptions.Item>
      <Descriptions.Item label="无库存商品">{stats.outOfStockCount || 0}</Descriptions.Item>
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
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.totalGoods' })}
              value={stats.totalGoods}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.totalValue' })}
              value={stats.totalValue || 0}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.lowStock' })}
              value={stats.lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.lowStockCount > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={intl.formatMessage({ id: 'realTimeStock.stats.outOfStock' })}
              value={stats.outOfStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.outOfStockCount > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* 库存列表 */}
      <ProTable<RealTimeStock>
        headerTitle={
          <Space>
            <span>{intl.formatMessage({ id: 'list.title.realTimeStock' })}</span>
            {lastUpdated && (
              <span style={{ fontSize: '12px', color: '#999' }}>
                ({intl.formatMessage({ id: 'realTimeStock.lastUpdated' }, { time: getRelativeTime(lastUpdated) })})
              </span>
            )}
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
            currentCurrencyCode !== 'CNY' && (
              <Checkbox
                key="showInCNY"
                checked={showInCNY}
                onChange={(e) => setShowInCNY(e.target.checked)}
              >
                {intl.formatMessage({ id: 'products.showInCNY' })}
              </Checkbox>
            ),
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
            <Space key="stock-filter">
              <Space.Compact>
                <Select
                  style={{ width: 80 }}
                  value={stockUnit}
                  onChange={(value) => {
                    setStockUnit(value);
                    actionRef.current?.reload();
                  }}
                >
                  <Select.Option value="box">{intl.formatMessage({ id: 'unit.box' })}</Select.Option>
                  <Select.Option value="pack">{intl.formatMessage({ id: 'unit.pack' })}</Select.Option>
                  <Select.Option value="piece">{intl.formatMessage({ id: 'unit.piece' })}</Select.Option>
                </Select>
                <InputNumber
                  style={{ width: 120 }}
                  min={0}
                  precision={0}
                  placeholder={intl.formatMessage({ id: 'realTimeStock.filter.stockLessThan' })}
                  value={stockThreshold}
                  onChange={(value: number | null) => {
                    setStockThreshold(value || 0);
                    actionRef.current?.reload();
                  }}
                />
              </Space.Compact>
              <Button
                onClick={() => {
                  setStockThreshold(0);
                  setStockUnit('box');
                  actionRef.current?.reload();
                }}
              >
                {intl.formatMessage({ id: 'button.reset' })}
              </Button>
            </Space>,
          ],
        }}
        request={async (params) => {
          if (!currentBase?.id) {
            return { data: [], success: true, total: 0 };
          }

          try {
            // 处理排序参数
            let sortField: string | undefined;
            let sortOrder: 'ascend' | 'descend' | undefined;
            
            if (params.sorter && typeof params.sorter === 'object') {
              const sorterObj = params.sorter as any;
              if (sorterObj.field) {
                sortField = Array.isArray(sorterObj.field) ? sorterObj.field.join('.') : sorterObj.field;
                sortOrder = sorterObj.order;
              }
            }

            const response = await request(`/api/v1/bases/${currentBase.id}/real-time-stock`, {
              params: {
                current: params.current,
                pageSize: params.pageSize,
                goodsCode: params.goodsCode,
                goodsName: params.goodsName,
                categoryCode: params.categoryCode?.join(','),
                stockStatus: params.stockStatus?.join(','),
                locationId: selectedWarehouse,
                stockThreshold: stockThreshold,
                stockUnit: stockUnit,
                sortField: sortField,
                sortOrder: sortOrder,
              },
            });

            if (response.success) {
              // 保存最后更新时间
              if (response.lastUpdated) {
                setLastUpdated(new Date(response.lastUpdated));
              }
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
        rowClassName={(record) => {
          // 如果设置了库存阈值，为筛选出的数据行添加淡红色背景
          if (stockThreshold > 0) {
            return 'low-stock-row';
          }
          return '';
        }}
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

// 添加样式
const style = document.createElement('style');
style.textContent = `
  .low-stock-row {
    background-color: #fff1f0 !important;
  }
  .low-stock-row:hover {
    background-color: #ffe7e5 !important;
  }
`;
document.head.appendChild(style);
