import React from 'react';
import { Button, Tag, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import type { ConsumptionRecord } from './types';
import type { IntlShape } from 'react-intl';
import GoodsNameText from '@/components/GoodsNameText';

interface ColumnsConfig {
  onDelete: (record: ConsumptionRecord) => void;
  intl?: IntlShape;
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

export const getColumns = ({ onDelete, intl }: ColumnsConfig): ProColumns<ConsumptionRecord>[] => [
  {
    title: intl?.formatMessage({ id: 'consumption.column.date' }) || '日期',
    dataIndex: 'consumptionDate',
    key: 'consumptionDate',
    width: 100,
    valueType: 'date',
    render: (_, record) => dayjs(record.consumptionDate).format('YYYY-MM-DD'),
  },
  {
    title: intl?.formatMessage({ id: 'consumption.column.product' }) || '商品',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 180,
    render: (_, record) => (
      <Tooltip title={record.goodsName}>
        <GoodsNameText text={record.goodsName} nameI18n={record.goodsNameI18n} />
      </Tooltip>
    ),
  },
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
  {
    title: intl?.formatMessage({ id: 'consumption.column.anchor' }) || '主播',
    dataIndex: 'handlerName',
    key: 'handlerName',
    width: 80,
    search: false,
  },
  {
    title: '期初/箱',
    dataIndex: 'openingBoxQty',
    key: 'openingBoxQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '期初/盒',
    dataIndex: 'openingPackQty',
    key: 'openingPackQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '期初/包',
    dataIndex: 'openingPieceQty',
    key: 'openingPieceQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '期末/箱',
    dataIndex: 'closingBoxQty',
    key: 'closingBoxQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '期末/盒',
    dataIndex: 'closingPackQty',
    key: 'closingPackQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '期末/包',
    dataIndex: 'closingPieceQty',
    key: 'closingPieceQty',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '单价/箱',
    dataIndex: 'unitPricePerBox',
    key: 'unitPricePerBox',
    width: 90,
    align: 'right',
    search: false,
    render: (_, record) => `${(record.unitPricePerBox || 0).toFixed(2)}`,
  },
  {
    title: '消耗/箱',
    dataIndex: 'boxQuantity',
    key: 'boxQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '消耗/盒',
    dataIndex: 'packQuantity',
    key: 'packQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '消耗/包',
    dataIndex: 'pieceQuantity',
    key: 'pieceQuantity',
    width: 70,
    align: 'right',
    search: false,
  },
  {
    title: '消耗金额',
    key: 'consumptionAmount',
    width: 100,
    align: 'right',
    search: false,
    render: (_, record) => {
      const amount = calcConsumptionAmount(record);
      return <span style={{ color: '#f5222d', fontWeight: 500 }}>{amount.toFixed(2)}</span>;
    },
  },
  {
    title: '库存货值',
    key: 'inventoryValue',
    width: 100,
    align: 'right',
    search: false,
    render: (_, record) => {
      const value = calcInventoryValue(record);
      return <span style={{ color: '#52c41a' }}>{value.toFixed(2)}</span>;
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
