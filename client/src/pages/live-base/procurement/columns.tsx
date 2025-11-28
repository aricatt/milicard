import React from 'react';
import { Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import type { PurchaseOrder } from './types';

/**
 * 向下取整到2位小数
 */
const floorTo2 = (value: number): string => {
  return (Math.floor(value * 100) / 100).toFixed(2);
};

/**
 * 获取ProTable列定义
 */
export const getColumns = (
  handleEdit: (record: PurchaseOrder) => void,
  handleDelete: (record: PurchaseOrder) => void
): ProColumns<PurchaseOrder>[] => [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
    hideInSearch: true,
    hideInTable: true,
  },
  {
    title: '采购编号',
    dataIndex: 'orderNo',
    key: 'orderNo',
    width: 180,
    fixed: 'left',
    copyable: true,
    hideInSetting: true,
  },
  {
    title: '采购日期',
    dataIndex: 'purchaseDate',
    key: 'purchaseDate',
    width: 120,
    valueType: 'date',
    hideInSearch: true,
    hideInSetting: true,
  },
  {
    title: '采购名称',
    key: 'purchaseName',
    width: 280,
    ellipsis: true,
    hideInSearch: true,
    render: (_, record) => {
      // 动态生成：采购日期 + 商品名称
      const date = record.purchaseDate 
        ? record.purchaseDate.split('T')[0] 
        : '';
      const goodsName = record.goodsName || '';
      return date && goodsName ? `${date}${goodsName}` : '-';
    },
  },
  {
    title: '商品名称',
    dataIndex: 'goodsName',
    key: 'goodsName',
    width: 200,
    ellipsis: true,
    hideInSetting: true,
  },
  {
    title: '供应商',
    dataIndex: 'supplierName',
    key: 'supplierName',
    width: 150,
    hideInSetting: true,
  },
  {
    title: '零售价',
    dataIndex: 'retailPrice',
    key: 'retailPrice',
    width: 100,
    hideInSearch: true,
    render: (_, record) => record.retailPrice ? `${floorTo2(record.retailPrice)}` : '-',
  },
  {
    title: '折扣%',
    key: 'discount',
    width: 80,
    hideInSearch: true,
    render: (_, record) => {
      // 折扣 = 拿货单价/箱 / 零售价 * 100
      if (record.retailPrice && record.retailPrice > 0 && record.unitPriceBox) {
        const discount = (record.unitPriceBox / record.retailPrice) * 100;
        return `${floorTo2(discount)}%`;
      }
      return '-';
    },
  },
  {
    title: '采购箱',
    dataIndex: 'purchaseBoxQty',
    key: 'purchaseBoxQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '采购盒',
    dataIndex: 'purchasePackQty',
    key: 'purchasePackQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '采购包',
    dataIndex: 'purchasePieceQty',
    key: 'purchasePieceQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
  },
  {
    title: '到货箱',
    dataIndex: 'arrivedBoxQty',
    key: 'arrivedBoxQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedBoxQty || 0,
  },
  {
    title: '到货盒',
    dataIndex: 'arrivedPackQty',
    key: 'arrivedPackQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedPackQty || 0,
  },
  {
    title: '到货包',
    dataIndex: 'arrivedPieceQty',
    key: 'arrivedPieceQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => record.arrivedPieceQty || 0,
  },
  {
    title: '相差箱',
    dataIndex: 'diffBoxQty',
    key: 'diffBoxQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffBoxQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: '相差盒',
    dataIndex: 'diffPackQty',
    key: 'diffPackQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffPackQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: '相差包',
    dataIndex: 'diffPieceQty',
    key: 'diffPieceQty',
    width: 80,
    hideInSearch: true,
    align: 'right',
    render: (_, record) => {
      const diff = record.diffPieceQty || 0;
      return diff > 0 ? <span style={{ color: '#ff4d4f' }}>{diff}</span> : diff;
    },
  },
  {
    title: '拿货单价/箱',
    dataIndex: 'unitPriceBox',
    key: 'unitPriceBox',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPriceBox ? `${floorTo2(record.unitPriceBox)}` : '-',
  },
  {
    title: '拿货单价/盒',
    dataIndex: 'unitPricePack',
    key: 'unitPricePack',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePack ? `${floorTo2(record.unitPricePack)}` : '-',
  },
  {
    title: '拿货单价/包',
    dataIndex: 'unitPricePiece',
    key: 'unitPricePiece',
    width: 110,
    hideInSearch: true,
    render: (_, record) => record.unitPricePiece ? `${floorTo2(record.unitPricePiece)}` : '-',
  },
  {
    title: '应付金额/箱',
    key: 'amountBox',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchaseBoxQty || 0) * (record.unitPriceBox || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: '应付金额/盒',
    key: 'amountPack',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchasePackQty || 0) * (record.unitPricePack || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: '应付金额/包',
    key: 'amountPiece',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const amount = (record.purchasePieceQty || 0) * (record.unitPricePiece || 0);
      return `${floorTo2(amount)}`;
    },
  },
  {
    title: '应付总金额',
    dataIndex: 'totalAmount',
    key: 'totalAmount',
    width: 120,
    hideInSearch: true,
    hideInSetting: true,
    render: (_, record) => (
      <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
        {floorTo2(record.totalAmount)}
      </span>
    ),
  },
  {
    title: '实付金额',
    dataIndex: 'actualAmount',
    key: 'actualAmount',
    width: 110,
    hideInSearch: true,
    render: (_, record) => (
      <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
        {floorTo2(record.actualAmount || 0)}
      </span>
    ),
  },
  {
    title: '未支付金额',
    key: 'unpaidAmount',
    width: 110,
    hideInSearch: true,
    render: (_, record) => {
      const unpaid = (record.totalAmount || 0) - (record.actualAmount || 0);
      return (
        <span style={{ color: unpaid > 0 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
          {floorTo2(unpaid)}
        </span>
      );
    },
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
    valueType: 'dateTime',
    hideInSearch: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    hideInSetting: true,
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定删除此采购订单吗？"
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
