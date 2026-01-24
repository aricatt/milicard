import React from 'react';
import { Button, Tag, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import type { ConsumptionRecord } from './types';
import type { IntlShape } from 'react-intl';
import GoodsNameText, { getCategoryDisplayName } from '@/components/GoodsNameText';

interface AnchorOption {
  value: string;
  label: string;
}

interface ColumnsConfig {
  onDelete: (record: ConsumptionRecord) => void;
  intl?: IntlShape;
  showInCNY?: boolean;
  exchangeRate?: number;
  anchorOptions?: AnchorOption[];
}

/**
 * 计算单价（盒/包）
 */
const calcUnitPrice = (record: ConsumptionRecord) => {
  const boxPrice = record.unitPricePerBox || 0;
  const packPerBox = record.packPerBox || 1;
  const piecePerPack = record.piecePerPack || 1;
  const packPrice = boxPrice / packPerBox;
  const piecePrice = packPrice / piecePerPack;
  return { boxPrice, packPrice, piecePrice };
};

/**
 * 计算消耗金额
 */
const calcConsumptionAmount = (record: ConsumptionRecord) => {
  const { boxPrice, packPrice, piecePrice } = calcUnitPrice(record);
  return (
    record.boxQuantity * boxPrice +
    record.packQuantity * packPrice +
    record.pieceQuantity * piecePrice
  );
};

/**
 * 计算库存货值（期末）
 */
const calcInventoryValue = (record: ConsumptionRecord) => {
  const { boxPrice, packPrice, piecePrice } = calcUnitPrice(record);
  return (
    record.closingBoxQty * boxPrice +
    record.closingPackQty * packPrice +
    record.closingPieceQty * piecePrice
  );
};

export const getColumns = ({ onDelete, intl, showInCNY = false, exchangeRate = 1, anchorOptions = [] }: ColumnsConfig): ProColumns<ConsumptionRecord>[] => {
  // 金额格式化函数，支持以人民币显示
  const formatAmount = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '-';
    if (showInCNY && exchangeRate > 0) {
      const cnyAmount = amount / exchangeRate;
      return `¥${cnyAmount.toFixed(2)}`;
    }
    return amount.toFixed(2);
  };

  return [
  // 1. 日期
  {
    title: intl?.formatMessage({ id: 'consumption.column.date' }) || '日期',
    dataIndex: 'consumptionDate',
    key: 'consumptionDate',
    width: 100,
    valueType: 'date',
    render: (_, record) => dayjs(record.consumptionDate).format('YYYY-MM-DD'),
  },
  // 2. 主播（支持查询）
  {
    title: intl?.formatMessage({ id: 'consumption.column.anchor' }) || '主播',
    dataIndex: 'handlerId',
    key: 'handlerId',
    width: 80,
    valueType: 'select',
    fieldProps: {
      showSearch: true,
      optionFilterProp: 'label',
      options: anchorOptions,
    },
    render: (_, record) => record.handlerName || '-',
  },
  // 3. 直播间
  {
    title: intl?.formatMessage({ id: 'consumption.column.location' }) || '直播间',
    dataIndex: 'locationName',
    key: 'locationName',
    width: 100,
    search: false,
    render: (_, record) => (
      <Tag color="green" icon={<ShoppingOutlined />}>
        {record.locationName}
      </Tag>
    ),
  },
  // 4. 商品
  {
    title: intl?.formatMessage({ id: 'consumption.column.product' }) || '商品',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 180,
    render: (_, record) => (
      <Tooltip title={record.goodsName}>
        <GoodsNameText 
          text={record.goodsName} 
          nameI18n={record.goodsNameI18n}
        />
      </Tooltip>
    ),
  },
  // 5. 品类
  {
    title: intl?.formatMessage({ id: 'consumption.column.category' }) || '品类',
    dataIndex: 'categoryName',
    key: 'categoryName',
    width: 80,
    search: false,
    render: (_, record) => {
      const displayName = getCategoryDisplayName(record.categoryCode, record.categoryName, record.categoryNameI18n, intl?.locale);
      if (!displayName) return '-';
      return <Tag color="purple">{displayName}</Tag>;
    },
  },
  // 6. 拿货价
  {
    title: '拿货价',
    key: 'calculatedCostPrice',
    width: 100,
    align: 'right',
    search: false,
    render: (_, record) => {
      const amount = record.calculatedCostPrice || 0;
      return (
        <Tooltip title="基于商品平拆价(一包)动态计算：单价/包 × 包数 + 单价/盒 × 盒数 + 单价/箱 × 箱数">
          <span style={{ color: '#13c2c2', fontWeight: 500 }}>{formatAmount(amount)}</span>
        </Tooltip>
      );
    },
  },
  // 7. 期初/包
  {
    title: '期初/包',
    dataIndex: 'openingPieceQty',
    key: 'openingPieceQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 8. 期初/盒
  {
    title: '期初/盒',
    dataIndex: 'openingPackQty',
    key: 'openingPackQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 9. 期初/箱
  {
    title: '期初/箱',
    dataIndex: 'openingBoxQty',
    key: 'openingBoxQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 10. 期末/包
  {
    title: '期末/包',
    dataIndex: 'closingPieceQty',
    key: 'closingPieceQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 11. 期末/盒
  {
    title: '期末/盒',
    dataIndex: 'closingPackQty',
    key: 'closingPackQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 12. 期末/箱
  {
    title: '期末/箱',
    dataIndex: 'closingBoxQty',
    key: 'closingBoxQty',
    width: 70,
    align: 'right',
    search: false,
  },
  // 13. 单价/包（从单价/箱计算）
  {
    title: '单价/包',
    key: 'unitPricePerPiece',
    width: 90,
    align: 'right',
    search: false,
    render: (_, record) => {
      const { piecePrice } = calcUnitPrice(record);
      return formatAmount(piecePrice);
    },
  },
  // 14. 消耗/包
  {
    title: '消耗/包',
    dataIndex: 'pieceQuantity',
    key: 'pieceQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  // 15. 消耗/盒
  {
    title: '消耗/盒',
    dataIndex: 'packQuantity',
    key: 'packQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  // 16. 消耗/箱
  {
    title: '消耗/箱',
    dataIndex: 'boxQuantity',
    key: 'boxQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  // 17. 库存货值
  {
    title: '库存货值',
    key: 'inventoryValue',
    width: 100,
    align: 'right',
    search: false,
    render: (_, record) => {
      const value = calcInventoryValue(record);
      return <span style={{ color: '#52c41a' }}>{formatAmount(value)}</span>;
    },
  },
  {
    title: intl?.formatMessage({ id: 'table.column.operation' }) || '操作',
    key: 'action',
    width: 70,
    fixed: 'right',
    search: false,
    render: (_, record) => (
      <Popconfirm
        title={intl?.formatMessage({ id: 'message.confirmDelete' }) || '确定删除这条消耗记录吗？'}
        description={intl?.formatMessage({ id: 'message.deleteConfirmContent' }) || ''}
        onConfirm={() => onDelete(record)}
        okText={intl?.formatMessage({ id: 'button.confirm' }) || '确定'}
        cancelText={intl?.formatMessage({ id: 'button.cancel' }) || '取消'}
      >
        <Tooltip title={intl?.formatMessage({ id: 'button.delete' }) || '删除'}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} />
        </Tooltip>
      </Popconfirm>
    ),
  },
];
};
